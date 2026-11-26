"""Prepare a local, editable teng-edit project from a pinned look and the creator's media."""
import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from footage import camera_files, quiet_passages
from styles import CatalogError, capture, publish_new_dir

SKILL = Path(__file__).resolve().parents[1]
DEMO_STYLE = SKILL / "assets" / "styles" / "midnight-signal"


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def command_json(command):
    process = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace",
                             env={**os.environ, "PYTHONIOENCODING": "utf-8"})
    if process.returncode:
        raise ValueError(process.stderr.strip() or process.stdout.strip() or "Command failed")
    return json.loads(process.stdout)


def probe(path):
    executable = shutil.which("ffprobe")
    if not executable:
        raise ValueError("ffprobe is required to time source media. Install FFmpeg with ffprobe.")
    if not path.is_file():
        raise ValueError(f"Missing media file: {path}")
    info = command_json([executable, "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)])
    streams = info.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"
                  and not s.get("disposition", {}).get("attached_pic")), None)
    audio_streams = [s for s in streams if s.get("codec_type") == "audio"]
    audio = audio_streams[0] if audio_streams else None
    if not (video or audio):
        raise ValueError(f"No playable video or audio in {path.name}")
    duration = info.get("format", {}).get("duration")
    if not duration or duration == "N/A":
        duration = max((float(s["duration"]) for s in (video, audio)
                        if s and s.get("duration") not in (None, "N/A")), default=0)
    seconds = float(duration)
    if not math.isfinite(seconds) or seconds <= 0:
        raise ValueError(f"Could not measure a finite duration for {path.name}")
    width, height = (video["width"], video["height"]) if video else (None, None)
    if video:
        rotation = next((v["rotation"] for v in video.get("side_data_list", []) if "rotation" in v),
                        video.get("tags", {}).get("rotate", 0))
        if round(float(rotation) / 90) % 2:
            width, height = height, width
    def start_time(stream):
        value = stream.get("start_time")
        return float(value) if value not in (None, "N/A") else 0.0

    return {"kind": "video" if video else "audio", "seconds": seconds, "width": width, "height": height,
            "audioChannels": audio.get("channels", 0) if audio else 0, "audioStreamCount": len(audio_streams),
            "audioStartSeconds": start_time(audio) - start_time(info.get("format", {})) if audio else 0.0}


def dimensions(value):
    match = re.fullmatch(r"([1-9][0-9]*)[xX]([1-9][0-9]*)", value)
    if not match:
        raise argparse.ArgumentTypeError("Expected WIDTHxHEIGHT, for example 1080x1920")
    return tuple(int(v) for v in match.groups())


def key_color(value):
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        raise argparse.ArgumentTypeError("Use a sampled RGB hex color such as #24b84c.")
    return value.lower()


def catalog_command(args):
    command = [sys.executable, str(SKILL / "scripts" / "styles.py")]
    if args.library:
        command.extend(["--library", str(args.library.expanduser().resolve())])
    return command


def save_project_style(args):
    project = args.project.expanduser().resolve()
    receipt = project / "teng-style.json"
    note = json.loads(receipt.read_text(encoding="utf-8-sig"))
    look_path = project / "src" / "look"
    if note.get("path") != "src/look" or not (look_path / "STYLE.md").is_file():
        raise ValueError("This project needs a src/look bundle and its style receipt.")
    name = args.id or note["pin"].split("@", 1)[0]
    stored = command_json([*catalog_command(args), "save", str(look_path), "--id", name, "--json"])
    note["pin"] = stored["pin"]
    fd, tmp = tempfile.mkstemp(prefix=".teng-style-", dir=project)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(note, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
        os.replace(tmp, receipt)
    finally:
        Path(tmp).unlink(missing_ok=True)
    return {"project": str(project), "style": stored["pin"]}


def prepare_project(args):
    destination = args.destination.expanduser().resolve()
    if destination.exists() or destination.is_symlink():
        raise ValueError(f"Choose a new directory. This path already exists: {destination}")
    if destination.is_relative_to(SKILL):
        raise ValueError("Choose a project directory outside the installed skill.")
    catalog = catalog_command(args)
    look = command_json([*catalog, "resolve", args.style, "--json"])
    media_paths = [p.expanduser().resolve() for p in (args.voiceover or args.media or [])]
    folder = args.footage_dir.expanduser().resolve() if args.footage_dir is not None else None
    if args.media and any(path.is_dir() for path in media_paths):
        if len(media_paths) != 1:
            raise ValueError("Supply one footage folder or an ordered list of media files.")
        folder = media_paths[0]
    if folder is not None and not folder.is_dir():
        raise ValueError(f"Missing footage folder: {folder}")
    entries = camera_files(folder) if folder is not None else [(p, None) for p in media_paths]
    inputs = [(path, probe(path), relative) for path, relative in entries]
    if args.layout and (args.voiceover or not inputs or any(info["kind"] != "video" for _, info, _ in inputs)):
        raise ValueError("A presenter layout needs camera footage in --media.")
    if args.key_color and args.layout != "green-screen":
        raise ValueError("Use --key-color with --layout green-screen.")
    # A creator can save their own incompatible revision under the same style ID.
    bundled_style = (look["id"] == "midnight-signal"
                     and look["revision"] == capture(DEMO_STYLE, omit_private=True)[0])
    if args.voiceover and any(not info["audioChannels"] for _, info, _ in inputs):
        raise ValueError("A voiceover input must contain an audio stream.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent, prefix=".teng-edit-") as tmp:
        work = Path(tmp) / "project"
        shutil.copytree(SKILL / "assets" / "studio", work)
        look_path = work / "src" / "look"
        command_json([*catalog, "checkout", look["pin"], str(look_path), "--json"])
        note = {"pin": look["pin"], "path": "src/look"}
        if not (look_path / "Scene.tsx").is_file():
            # A visual-only pack remains usable. Keep its references and identify the borrowed scaffold.
            fallback = look_path / "_starter"
            shutil.copytree(DEMO_STYLE, fallback, ignore=shutil.ignore_patterns("STYLE.md", "reference.png", "press-preview.png"))
            (look_path / "Scene.tsx").write_text("export {default} from './_starter/Scene';\n", encoding="utf-8")
            note["starter"] = "Borrowed midnight-signal scene; adapt it to the selected STYLE.md."
        write_json(work / "teng-style.json", note)
        timeline_path = work / "src" / "timeline.json"
        timeline = json.loads(timeline_path.read_text(encoding="utf-8-sig"))
        if not inputs and not bundled_style:
            for insert in timeline["inserts"]:
                insert.pop("scene", None)
        if args.fps:
            timeline["fps"] = args.fps
        if args.size:
            timeline["width"], timeline["height"] = args.size
        elif inputs and inputs[0][1]["kind"] == "video":
            timeline["width"], timeline["height"] = inputs[0][1]["width"], inputs[0][1]["height"]
        if inputs:
            timeline.pop("durationInFrames", None)
            timeline.update(sources=[], cuts=[], inserts=[], captions=[])
            public_media = work / "public" / "media"
            public_media.mkdir(parents=True, exist_ok=True)
            offset = 0
            footage = []
            ffmpeg = shutil.which("ffmpeg") if folder is not None else None
            for index, (path, info, relative) in enumerate(inputs, start=1):
                source_id = f"take-{index:02d}"
                filename = source_id + path.suffix.lower()
                shutil.copy2(path, public_media / filename)
                frames = math.ceil(info["seconds"] * timeline["fps"])
                source = {"id": source_id, "file": "media/" + filename,
                          "kind": info["kind"], "durationInFrames": frames}
                if args.layout == "green-screen":
                    source["chromaKey"] = {"color": args.key_color or "#00ff00"}
                timeline["sources"].append(source)
                if folder is not None:
                    # Analyze the imported copy, which is also the file that the editor will play.
                    analysis = quiet_passages(public_media / filename, timeline["fps"], frames,
                                              info["audioStartSeconds"], info["audioStreamCount"], ffmpeg)
                    footage.append({"source": source_id, "original": relative, "projectFile": source["file"],
                                    "durationInFrames": frames, **analysis})
                voice_only = bool(args.voiceover) or info["kind"] == "audio"
                timeline["cuts"].append({"source": source_id, "inFrame": 0, "outFrame": frames,
                                         "view": "voiceover" if voice_only else "camera"})
                if voice_only:
                    timeline["inserts"].append({"from": offset, "durationInFrames": frames, "mode": "full",
                                               "headline": "Your narration", "detail": "Replace with the first visual beat"})
                elif args.layout:
                    mode = "behind" if args.layout == "green-screen" else "split"
                    insert = {"from": offset, "durationInFrames": frames, "mode": mode, "headline": "Your visual beat"}
                    if mode == "behind":
                        insert["presenterHeightPct"] = 75
                    if bundled_style:
                        insert["scene"] = "readout" if mode == "behind" else "signal"
                    timeline["inserts"].append(insert)
                offset += frames
            if folder is not None:
                write_json(work / "footage.json", {"fps": timeline["fps"], "sources": footage})
        write_json(timeline_path, timeline)
        if destination.exists() or destination.is_symlink():
            raise ValueError(f"Another project has appeared at {destination}")
        publish_new_dir(work, destination)
    return {"project": str(destination), "style": look["pin"], "timeline": "src/timeline.json"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    new = commands.add_parser("new", help="Create a project for a new edit")
    new.add_argument("destination", type=Path)
    new.add_argument("--style", default="midnight-signal")
    new.add_argument("--library", type=Path)
    media = new.add_mutually_exclusive_group()
    media.add_argument("--media", nargs="+", type=Path, metavar="FILE", help="Start a cut with these camera takes")
    media.add_argument("--footage-dir", type=Path, metavar="FOLDER",
                       help="Discover camera takes recursively, order filenames naturally, and measure long quiet passages")
    media.add_argument("--voiceover", nargs="+", type=Path, metavar="FILE", help="Use audio, including audio embedded in video")
    new.add_argument("--layout", choices=["split", "green-screen"],
                     help="Start camera takes with animation above or behind the presenter")
    new.add_argument("--key-color", type=key_color, metavar="#RRGGBB",
                     help="Screen color for the green-screen layout, sampled from the footage")
    new.add_argument("--size", type=dimensions, help="Composition dimensions, for example 1080x1920")
    new.add_argument("--fps", type=int, choices=range(1, 121), metavar="1..120")
    save = commands.add_parser("save-style", help="Snapshot this project’s reusable look and record its exact revision")
    save.add_argument("project", type=Path)
    save.add_argument("--id", help="Use a new name for a distinct look. Defaults to the current style ID.")
    save.add_argument("--library", type=Path)
    inspect = commands.add_parser("inspect", help="Read stream dimensions, duration and channel count")
    inspect.add_argument("media", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "inspect":
            result = probe(args.media.expanduser().resolve())
        elif args.command == "save-style":
            result = save_project_style(args)
        else:
            result = prepare_project(args)
    except (ValueError, OSError, KeyError, CatalogError) as exc:
        parser.exit(1, f"teng-edit: {exc}\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
