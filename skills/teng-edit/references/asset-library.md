# Local style library

A style bundle is a folder with a root `STYLE.md` and any visual guides, textures or scene code needed to reproduce its look. A project pins an exact revision, so a later change to the style can coexist with earlier edits. The included `midnight-signal` bundle is available on first use.

## Choose a style for an edit

Run these commands from the installed skill directory with Python 3.10 or newer.

```sh
python scripts/styles.py list
python scripts/styles.py find "navy handset"
python scripts/styles.py resolve midnight-signal --json
```

`find` searches style IDs and the first 32,768 characters of each current `STYLE.md`. The JSON from `resolve` includes the style ID, full revision, exact `pin`, title, source, and the absolute path to a verified local copy. Open its `STYLE.md` and visual references before building shots. Resolve a previously recorded pin to reopen that exact bundle.

The project starter handles the checkout automatically.

```sh
python scripts/teng_edit.py new "~/Videos/Desk film" --style midnight-signal
```

In a project, `teng-style.json` records `pin` as `id@revision` and `path` as `src/look`. Keep both the record and the checked-out files with the edit. A project can also record a `starter` when it borrows a starter scene for a guidelines-only look. Read the pin from this file to reproduce an existing edit.

## Save a new or revised look

When a project introduces a look, edit its reusable files under `src/look/`. From the installed skill directory, save them and update the project's pin in one step.

```sh
python scripts/teng_edit.py save-style "~/Videos/Desk film" --id desk-light
```

For subsequent revisions of the same look, omit `--id`. The next project can select `--style desk-light` or an exact pin. To import a bundle that lives outside an edit project, use the catalog directly.

1. Gather the reusable pieces in one dedicated folder. In `STYLE.md`, describe the visible result and how to reproduce it. Give the guide a descriptive Markdown heading. Include a representative still and any local dependencies used by reusable scene code.
2. Keep raw recordings, private transcripts, client names and project-specific copy in the edit project. The tool copies regular files from the selected bundle, including nested assets. It skips version-control directories, dependency caches and local environment files. Review the chosen folder before saving.
3. Save the folder with a descriptive ID and keep the returned pin. Pass the same ID to save a revision.

```sh
python scripts/styles.py save "./desk-light" --id desk-light --json
python scripts/styles.py list desk-light
```

An ID uses lowercase letters, digits and single hyphens. With no `--id`, the folder name supplies the ID. Relative file paths and file contents determine the revision. Saving identical content gives the same pin. A changed asset creates a new revision, while earlier pins remain available.

To revise an existing look, check its exact pin out into a new folder, edit the copy, and save it under the original ID. Replace the example placeholder below with the full pin from your project or catalog.

```sh
python scripts/styles.py checkout "desk-light@<full-revision>" "./desk-light-revision"
python scripts/styles.py save "./desk-light-revision" --id desk-light --json
```

For a new project, pass the resulting pin to `teng_edit.py new --style`. For an existing project, preserve its approved local changes, bring the selected files into a new revision of the edit, and update `teng-style.json` to match the exact bundle used. `checkout` accepts a new directory or an existing copy with identical contents. A different existing destination produces an error and keeps its files intact.

## Storage and inspection

The user-local catalog lives under `%LOCALAPPDATA%/Teng Edit/styles` on Windows, `~/Library/Application Support/Teng Edit/styles` on macOS, or `$XDG_DATA_HOME/teng-edit/styles` on Linux (default `~/.local/share/teng-edit/styles`). To use a different local catalog, set `TENG_EDIT_STYLE_LIBRARY` or pass `--library PATH` for one invocation. The flag takes precedence.

```sh
python scripts/styles.py --library "./scratch-library" list --json
```

All commands support `--json`. Plain `resolve` prints only the verified bundle directory. `list STYLE_ID` shows available revisions, with the current one first. `resolve` and `checkout` verify the stored contents against the full SHA-256 revision. Edit a checked-out copy and use `save` to record a change. Resolve or check out a bundled style once to retain that revision in the local catalog across skill updates.

Catalog operations run locally. Use a dedicated bundle folder containing regular files and directories. Copy intended assets into it when an input is a symbolic link or junction. Reference stills and editable scene files support in-editor review. Obtain the creator’s personal review and explicit approval of the current edit before any video export, including a preview or test movie.
