#!/usr/bin/env python3
"""Save, locate, verify and check out local Teng Edit style bundles."""

import argparse
import ctypes
import errno
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import tempfile
import time

BUILTINS = Path(__file__).resolve().parents[1] / "assets" / "styles"
ID = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
REV = re.compile(r"[a-f0-9]{64}")
SKIP = {".git", ".hg", ".svn", ".venv", "node_modules", "__pycache__", ".ds_store", "thumbs.db"}


class CatalogError(Exception):
    pass


def default_library():
    override = os.environ.get("TENG_EDIT_STYLE_LIBRARY")
    if override:
        return Path(override).expanduser()
    if os.name == "nt":
        return Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData/Local") / "Teng Edit" / "styles"
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "Teng Edit" / "styles"
    return Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local/share") / "teng-edit" / "styles"


def identifier(value):
    if not ID.fullmatch(value) or len(value) > 64:
        raise CatalogError("Choose a style ID of up to 64 lowercase letters, numbers and single hyphens.")
    if value in {"con", "prn", "aux", "nul", *("com%d" % n for n in range(1, 10)), *("lpt%d" % n for n in range(1, 10))}:
        raise CatalogError("This ID is a reserved device name. Choose another style ID.")
    return value


def split_pin(value):
    name, at, revision = value.partition("@")
    if at and not REV.fullmatch(revision):
        raise CatalogError("An exact revision requires the full 64-character lowercase SHA-256 digest.")
    return identifier(name), revision


def linked(info):
    return stat.S_ISLNK(info.st_mode) or bool(getattr(info, "st_file_attributes", 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT)


def require_regular(path):
    info = path.lstat()
    if linked(info) or not stat.S_ISREG(info.st_mode):
        raise CatalogError("Expected a regular local file: " + str(path))
    return info


def require_dir(path):
    info = path.lstat()
    if linked(info) or not stat.S_ISDIR(info.st_mode):
        raise CatalogError("Expected a plain local directory: " + str(path))
    return info


def exists(path):
    return os.path.lexists(path)


def within(path, ancestor):
    return path == ancestor or ancestor in path.parents


def safe_dir(path):
    """Create or verify one owned directory under a previously verified parent."""
    path.mkdir(mode=0o700, exist_ok=True)
    require_dir(path)


def catalog_dir(root, *parts, create=False):
    if create:
        root.mkdir(parents=True, mode=0o700, exist_ok=True)
    require_dir(root)
    current = root
    for part in parts:
        current = current / part
        if create:
            safe_dir(current)
        else:
            require_dir(current)
    return current


def style_document(folder):
    path = folder / "STYLE.md"
    require_regular(path)
    with path.open(encoding="utf-8-sig") as handle:
        return handle.read(32768)


def encode(data):
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode("utf-8")


def capture(source, dest=None, omit_private=False):
    """Hash bytes as they are copied. A snapshot never depends on original timestamps."""
    source_dev = require_dir(source).st_dev
    style_document(source)
    rows = []

    def descend(folder):
        for path in sorted(folder.iterdir(), key=lambda p: p.name):
            name = path.name.casefold()
            if omit_private and (name in SKIP or name == ".env" or name.startswith(".env.")):
                continue
            info = path.lstat()
            mounted = os.name != "nt" and stat.S_ISDIR(info.st_mode) and path.is_mount()
            if linked(info) or info.st_dev != source_dev or mounted:
                raise CatalogError("Bundle contains a link or mounted directory. Copy intended assets into it: " + str(path))
            if stat.S_ISDIR(info.st_mode):
                descend(path)
                continue
            if not stat.S_ISREG(info.st_mode):
                raise CatalogError("Unsupported special file in bundle: " + str(path))
            rel = path.relative_to(source)
            output = None
            digest = hashlib.sha256()
            count = 0
            try:
                if dest is not None:
                    target = dest / rel
                    target.parent.mkdir(parents=True, exist_ok=True)
                    output = target.open("xb")
                with path.open("rb") as handle:
                    opened = os.fstat(handle.fileno())
                    if not os.path.samestat(info, opened):
                        raise CatalogError("File changed during capture: " + str(path))
                    while True:
                        block = handle.read(1 << 20)
                        if not block:
                            break
                        digest.update(block)
                        count += len(block)
                        if output:
                            output.write(block)
                    end = os.fstat(handle.fileno())
                    if count != opened.st_size or end.st_size != opened.st_size or end.st_mtime_ns != opened.st_mtime_ns:
                        raise CatalogError("File changed during capture. Try again: " + str(path))
            finally:
                if output:
                    output.close()
            rows.append([rel.as_posix(), count, digest.hexdigest()])
    descend(source)
    rows.sort(key=lambda r: r[0])
    manifest = {"format": 1, "files": rows}
    return hashlib.sha256(encode(manifest)).hexdigest(), manifest


def publish_new_dir(staged, destination):
    """Publish a complete directory in one rename while preserving any existing directory."""
    if os.name == "nt":
        os.rename(staged, destination)
        return
    libc = ctypes.CDLL(None, use_errno=True)
    if sys.platform.startswith("linux") and hasattr(libc, "renameat2"):
        code = libc.renameat2(-100, os.fsencode(staged), -100, os.fsencode(destination), 1)
    elif sys.platform == "darwin" and hasattr(libc, "renamex_np"):
        code = libc.renamex_np(os.fsencode(staged), os.fsencode(destination), 4)
    else:
        raise CatalogError("This platform lacks an exclusive atomic directory rename.")
    if code:
        n = ctypes.get_errno()
        if n in (errno.EEXIST, errno.ENOTEMPTY):
            raise FileExistsError(n, os.strerror(n), destination)
        raise OSError(n, os.strerror(n), destination)


def revision_path(root, name, revision):
    return root / name / "revisions" / revision


def verify(root, name, revision):
    directory = catalog_dir(root, name, "revisions", revision)
    manifest_path = directory / "manifest.json"
    require_regular(manifest_path)
    expected = json.loads(manifest_path.read_bytes())
    bundle = directory / "bundle"
    actual, manifest = capture(bundle)
    if actual != revision or manifest != expected:
        raise CatalogError("Integrity check failed for " + name + "@" + revision)
    return bundle


def previous_head(style_dir):
    head = style_dir / "HEAD"
    if exists(head):
        require_regular(head)
        previous = head.read_text(encoding="ascii").strip()
        if not REV.fullmatch(previous):
            raise CatalogError("Existing HEAD is not a catalog revision: " + str(head))
        require_regular(style_dir / "revisions" / previous / "manifest.json")
        return previous
    return None


def write_head(style_dir, revision):
    head = style_dir / "HEAD"
    if previous_head(style_dir) == revision:
        return
    fd, temp = tempfile.mkstemp(prefix=".head-", dir=style_dir)
    try:
        with os.fdopen(fd, "w", encoding="ascii", newline="\n") as handle:
            handle.write(revision + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        for attempt in range(9):
            try:
                os.replace(temp, head)
                break
            except PermissionError as error:
                # Ordinary Windows readers can briefly hold HEAD without share-delete.
                if getattr(error, "winerror", 0) not in (5, 32, 33) or attempt == 8:
                    raise
                time.sleep(.01 * (attempt + 1))
    finally:
        Path(temp).unlink(missing_ok=True)


def save(root, name, source, set_head=True):
    source = Path(source).expanduser().absolute()
    require_dir(source)
    if within(root.resolve(), source.resolve()):
        raise CatalogError("Choose a bundle outside the library's parent chain.")
    # Confirm intent before the first directory walk or catalog write.
    style_document(source)
    style_dir = catalog_dir(root, name, create=True)
    if set_head:
        previous_head(style_dir)
    versions = style_dir / "revisions"
    safe_dir(versions)
    with tempfile.TemporaryDirectory(dir=versions, prefix=".stage-") as temp:
        staged = Path(temp) / "snapshot"
        bundle = staged / "bundle"
        bundle.mkdir(parents=True)
        revision, manifest = capture(source, bundle, omit_private=True)
        (staged / "manifest.json").write_bytes(encode(manifest))
        destination = versions / revision
        if not exists(destination):
            try:
                publish_new_dir(staged, destination)
            except OSError:
                if not exists(destination):
                    raise
        bundle = verify(root, name, revision)
        if set_head:
            write_head(versions.parent, revision)
        return revision, bundle


def builtin(name):
    path = BUILTINS / name
    if not exists(path):
        return None
    require_dir(path)
    style_document(path)
    return path


def latest(root, name):
    head = root / name / "HEAD"
    if exists(head):
        catalog_dir(root, name)
        require_regular(head)
        revision = head.read_text(encoding="ascii").strip()
        if not REV.fullmatch(revision):
            raise CatalogError("Invalid catalog HEAD for " + name)
        return revision, "local"
    pack = builtin(name)
    if pack:
        return capture(pack, omit_private=True)[0], "bundled"
    raise CatalogError("Unknown style: " + name)


def title(folder, name):
    return next((s[2:].strip() for s in style_document(folder).splitlines() if s.startswith("# ")), name)


def record(name, revision, origin, path):
    return {"id": name, "revision": revision, "pin": name + "@" + revision,
            "source": origin, "title": title(path, name), "path": str(path)}


def resolve(root, ref):
    name, revision = split_pin(ref)
    origin = "local"
    if not revision:
        revision, origin = latest(root, name)
    if exists(revision_path(root, name, revision)):
        bundle = verify(root, name, revision)
    else:
        source = builtin(name)
        if not source or capture(source, omit_private=True)[0] != revision:
            raise CatalogError("Revision not available: " + name + "@" + revision)
        actual, bundle = save(root, name, source, set_head=False)
        if actual != revision:
            raise CatalogError("Bundled style changed during capture. Try again.")
        origin = "bundled"
    return record(name, revision, origin, bundle)


def list_styles(root, name=None, query=None):
    names = set()
    if BUILTINS.is_dir():
        names.update(p.name for p in BUILTINS.iterdir() if ID.fullmatch(p.name) and (p / "STYLE.md").is_file())
    if exists(root):
        require_dir(root)
        names.update(p.name for p in root.iterdir() if ID.fullmatch(p.name) and exists(p / "HEAD"))
    if name:
        identifier(name)
        if name not in names and not exists(root / name / "revisions"):
            raise CatalogError("Unknown style: " + name)
        names = {name}
    records = []
    for item in sorted(names):
        try:
            current, origin = latest(root, item)
        except CatalogError:
            if exists(root / item / "HEAD") or builtin(item) or not name:
                raise
            current, origin = None, "local"
        revisions = [current] if current else []
        if name:
            versions = root / item / "revisions"
            if exists(versions):
                catalog_dir(root, item, "revisions")
                revisions.extend(sorted(p.name for p in versions.iterdir() if REV.fullmatch(p.name) and p.name != current))
            pack = builtin(item)
            if pack:
                bundled_rev = capture(pack, omit_private=True)[0]
                if bundled_rev not in revisions:
                    revisions.append(bundled_rev)
        for rev in revisions:
            src = origin if rev == current else "local"
            if exists(revision_path(root, item, rev)):
                path = catalog_dir(root, item, "revisions", rev, "bundle")
            else:
                path = builtin(item)
                if not path or capture(path, omit_private=True)[0] != rev:
                    raise CatalogError("Catalog revision is missing for " + item + "@" + rev)
                src = "bundled"
            row = record(item, rev, src, path)
            if not query or all(term in (item+" "+style_document(path)).casefold() for term in query.casefold().split()):
                records.append(row)
    return records


def checkout(root, ref, target):
    target = Path(target).expanduser().absolute()
    if within(target.resolve(), root.resolve()) or within(target.resolve(), BUILTINS.resolve()):
        raise CatalogError("Choose a project destination outside the catalog and packaged styles.")
    row = resolve(root, ref)
    revision = row["revision"]
    def existing_copy():
        require_dir(target)
        if capture(target)[0] != revision:
            raise CatalogError("Destination exists and differs. Choose a new directory: " + str(target))
    if exists(target):
        existing_copy()
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=target.parent, prefix=".teng-checkout-") as temp:
            staged = Path(temp) / "bundle"
            staged.mkdir()
            actual, _ = capture(Path(row["path"]), staged)
            if actual != revision:
                raise CatalogError("Stored revision changed during checkout.")
            try:
                publish_new_dir(staged, target)
            except OSError:
                if not exists(target):
                    raise
                existing_copy()
    return dict(row, path=str(target))


def main():
    options = argparse.ArgumentParser(add_help=False)
    options.add_argument("--library", default=argparse.SUPPRESS, help="Use this local catalog directory.")
    options.add_argument("--json", action="store_true", default=argparse.SUPPRESS, help="Print machine-readable results.")
    parser = argparse.ArgumentParser(description=__doc__, parents=[options])
    subs = parser.add_subparsers(dest="command", required=True)
    ls = subs.add_parser("list", parents=[options], help="List current styles or every revision of one named style.")
    ls.add_argument("id", nargs="?")
    find = subs.add_parser("find", parents=[options], help="Search IDs and style instructions, case-insensitively.")
    find.add_argument("query")
    save_cmd = subs.add_parser("save", parents=[options], help="Snapshot a style bundle and make it the current revision.")
    save_cmd.add_argument("bundle")
    save_cmd.add_argument("--id", help="Default is the bundle directory name.")
    resolve_cmd = subs.add_parser("resolve", parents=[options], help="Verify and print the exact stored bundle location.")
    resolve_cmd.add_argument("style")
    co = subs.add_parser("checkout", parents=[options], help="Create a verified editable copy at a new location.")
    co.add_argument("style")
    co.add_argument("destination")
    args = parser.parse_args()
    root = Path(args.library).expanduser().absolute() if hasattr(args, "library") else default_library().absolute()
    if args.command == "list":
        result = list_styles(root, args.id)
    elif args.command == "find":
        result = list_styles(root, query=args.query)
    elif args.command == "save":
        src = Path(args.bundle).expanduser().absolute()
        name = identifier(args.id or src.name)
        rev, path = save(root, name, src)
        result = record(name, rev, "local", path)
    elif args.command == "resolve":
        result = resolve(root, args.style)
    else:
        result = checkout(root, args.style, args.destination)
    if getattr(args, "json", False):
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif isinstance(result, list):
        for row in result:
            print(row["pin"] + "\t" + row["title"])
    elif args.command == "resolve":
        print(result["path"])
    else:
        print(result["pin"] + "\t" + result["path"])


if __name__ == "__main__":
    try:
        main()
    except (CatalogError, OSError, ValueError) as error:
        print("Style catalog: " + str(error), file=sys.stderr)
        sys.exit(1)
