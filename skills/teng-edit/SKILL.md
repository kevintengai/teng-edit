---
name: teng-edit
description: Edit talking-head footage or narration inside Codex with animated cutaways, green-screen presenters, animation-over-presenter split screens, and a reusable local style library. Use for teng-edit, screen demonstrations, and editable narrator-led films.
---

# teng-edit

One invocation runs the edit, animation, and style-library workflows. Use the three bundled guides together. Resolve the style first, establish a single speech timeline, then animate against its cues. The creator can supply footage, review the result, and request changes in the same Codex chat.

1. **Select the look.** Read [the local style library guide](references/asset-library.md). Use the requested look or the built-in `midnight-signal`. Look at the selected bundle’s visual reference and read its `STYLE.md`. Use [the included frame](assets/styles/midnight-signal/reference.png) as the target for the built-in look. Pin the version in the edit project so later library changes leave earlier edits reproducible.
2. **Build the dialogue edit.** Read [the footage and timeline guide](references/video-edit.md). Inspect the source with ffprobe. For presenter footage, choose complete takes and map source frames into final timeline frames. For recorded narration, keep its timing and original audio and plan visuals across the recording. For a revision, open the existing project and preserve previously accepted choices.
3. **Fill the visual beats.** Read [the animation guide](references/animated-video.md). Use full-screen animation for details, a keyed presenter over the animated set for direct address, or animation above the presenter when viewers need to see both. Choose layouts per spoken beat and keep the same voice track across changes. For source setup, framing, and the optional headline at the divider, use [presenter layouts](references/presenter-layouts.md). For voiceover-led films, provide visual coverage from the opening frame to the closing hold.
4. **Review inside Codex.** Run and verify the project yourself. Use Remotion for frame-driven composition and editing and FFmpeg or ffprobe for media inspection, sync, and audio checks where useful. Start Studio with its external browser launch disabled. Open the printed localhost URL in Codex’s in-app browser and verify the composition is visible. For a Codex environment without that surface, give the local Studio link and show stills in chat. Keep the editable project available for revisions. Obtain the creator’s personal review and explicit approval of the current version before exporting a video, including a test or preview movie.
5. **Keep reusable work.** Whenever you create or change a reusable look, save its components and guide using `python scripts/teng_edit.py save-style "~/Videos/Client explainer" --id style-name`. Do this as part of the edit. Give a distinct look its own ID. For a revision of the same look, omit `--id`. The command records the version in the project. A change to dialogue or a single shot can stay on the edit timeline. Keep recordings, transcripts and client-specific copy in the edit project. Show the creator the preview and identify anything they still need to check.

## Start a project

Run the bundled script from the installed skill directory with Python 3.10+. Use an absolute project path in the creator's workspace and absolute paths to the input files. It copies the editable Studio template and checks out the exact style revision into the project. The destination is a new directory.

```sh
python scripts/teng_edit.py new "~/Videos/Client explainer" --media "camera.mp4"
python scripts/teng_edit.py new "~/Videos/Narrated explainer" --voiceover "narration.m4a"
```

With no source arguments the project opens on a demonstration insert. Supply `--style id@revision` to reproduce a saved look. Use `--size 1080x1920` when the brief calls for vertical delivery. Edit the resulting timeline and shots to the actual brief before presenting client work. Use the [Studio and verification commands](references/animated-video.md#review-in-codex) for local playback.

For another pass, reuse the same project. When the user asks for an alternative concept, create a separate version so both cuts remain available for review.
