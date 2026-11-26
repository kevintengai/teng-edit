---
name: teng-edit
description: Turn a folder of talking-head takes or a voiceover into an editable video inside Codex. Tighten dialogue, reuse saved assets, build cinematic Remotion cutaways and add timed white-and-amber captions. Includes green-screen presenters and split screens.
---

# teng-edit

One invocation runs the talking-head edit, animation, and local asset-library workflows. A folder path and a request to edit it are enough to begin. Carry the job through an editable cut in the same Codex chat.

1. **Edit the speech first.** Import the supplied takes into a separate project. Transcribe and listen, select the intended takes, and remove false starts, superseded retakes, and excess dead space. Preserve intentional pauses, complete word beginnings and endings, and original audio. Write the selected source intervals to the timeline and audition the joins before timing visuals. For a revision, preserve accepted cuts. [Footage and dialogue guide](references/video-edit.md).
2. **Reuse assets before building.** Search the local library for the subject and the motion each beat needs. Inspect the matching scene and its visual guide. Prefer a saved scene or component that explains the line, customizing it with the actual example. Build missing shots and save reusable work locally. Pin the chosen style revision in the project. [Local style library](references/asset-library.md).
3. **Animate the edited beats.** Use the requested look or the bundled `midnight-signal`. The starter shows a print roller laying amber ink on a navy press, seen straight from above. Carry its amber accents, condensed headlines and cool white supporting type into scenes that suit the recording. Cut to a full-screen scene, composite the presenter over it, or put animation above the speaker. Carry one original voice track through the changes. [Animation guide](references/animated-video.md) · [Presenter layouts](references/presenter-layouts.md).
4. **Caption the finished dialogue.** Verify the words against the recording and time short, readable phrases to the final cuts. Use the bundled heavy condensed face, white dialogue with a dark outline, and amber emphasis on the key spoken word, quantity or phrase. Keep ordinary captions in sentence case. Review the captions at phone size, including split screens.
5. **Review inside Codex.** Start Remotion Studio with its external browser launch disabled. Open the composition in the Codex in-app browser and keep it available for timestamped revisions. If that surface is unavailable, share the local Studio link and show stills in chat. Use FFmpeg or ffprobe when needed for media and audio checks. The creator personally reviews and approves this version before any video export, including a preview or test movie.

## Start a project

Run the bundled script from the installed skill directory with Python 3.10+. Use an absolute project path in the creator's workspace and absolute paths to the input files. It copies the editable Studio template and checks out the exact style revision into the project. The destination is a new directory.

```sh
python scripts/teng_edit.py new "~/Videos/Edited project" --footage-dir "~/Videos/Raw takes"
python scripts/teng_edit.py new "~/Videos/Client explainer" --media "camera.mp4"
python scripts/teng_edit.py new "~/Videos/Narrated explainer" --voiceover "narration.m4a"
```

With no source arguments the project opens on a demonstration insert. Supply `--style id@revision` to reproduce a saved look. Use `--size 1080x1920` when the brief calls for vertical delivery. Edit the resulting timeline and shots to the actual brief before presenting client work. Use the [Studio and verification commands](references/animated-video.md#review-in-codex) for local playback.

For another pass, reuse the same project. When the user asks for an alternative concept, create a separate version so both cuts remain available for review.
