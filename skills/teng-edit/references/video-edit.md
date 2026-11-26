# Edit a recording in Codex

Work from the generated project folder. Its `src/timeline.json` holds the cut list, captions and animation timing. Its `src/look/` holds the selected editable animation source. The included four-second demo plays with no media. Replace its sample headline and caption when building the real edit.

## Inspect the recording

For a folder request, use `new PROJECT --footage-dir FOLDER` from the installed skill. Use a separate destination for the edit. Open the project's `footage.json` to relate the copied takes to their original paths and inspect any detected silence. Treat file order as an assembly order. Use the actual delivery, slate, script, and any explicit ordering from the creator to choose the story.

Get source-relative word timestamps for each speaking take. In Codex desktop, use Remotion Studio's local transcription action on each copied source and read its word-level caption JSON. An available local transcriber or a supplied timestamped transcript also works. Check names, numbers and soft words by listening. Choose the intended version of repeated lines. Use FFmpeg's quiet intervals as places to listen, then put the accepted trims into `cuts[]`. Retain breathing room at each end and any pause that carries a reaction. Audition the assembled dialogue before adding graphics or captions.

Keep an untouched copy of every original. Put a copy of each approved source file under the generated project's `public/media/` folder. Keep separate camera takes and voice recordings under separate filenames. Inspect the tracks before choosing edit points.

```sh
ffprobe -v error -show_entries "format=duration,start_time:stream=index,codec_type,codec_name,start_time,duration,width,height,avg_frame_rate,sample_rate,channels,channel_layout" -of json "public/media/take-01.mp4"
```

Listen to the actual recording. Identify the incoming breath, first consonant, final consonant and natural pause at each candidate cut. Leave an audible cushion before and after speech. When two phrases run together, keep the whole phrase. A waveform or transcript can help locate a boundary. Listen across the join at normal speed before tightening it. Keep the source channels, level, sync and playback rate when selecting a cut.

## Set the two clocks

All frame values are integers on the project `fps` clock. A range includes its start and excludes its end. At 30 fps, source frames 30 through 119 form the interval `[30, 120)` and last 90 output frames.

- Each source starts at frame zero. Compute `durationInFrames` from the playable media duration at project fps. The starter rounds up to include the last partial frame of source audio. For a camera take, check the durations of the picture and embedded audio near the final cut. For variable-rate recordings or differing source and project rates, locate events by playback time, then convert into project frames.
- The first cut starts at output frame zero. Each later cut starts at the sum of preceding cut lengths. A moment inside a kept source interval maps to `cut output start + source frame - inFrame`. A 30 fps cut of source frames 690 to 780 can therefore begin anywhere in the edited video.
- `inserts[].from` and `captions[].from` refer to the final output clock. Sequence-local frame zero is the start of each animation. After changing an earlier cut, update later captions and inserts to match the spoken words.
- To protect a word beginning, round a candidate source start down. To protect the end, round the source endpoint up within the available media, then listen. These are starting positions for review.

## Caption the edited speech

Retain the word transcripts alongside the project. For Remotion Caption arrays, the following command groups the words into short draft cues, skips removed passages, and relocates the retained words onto the edited clock. Supply one source ID and transcript path for each source used by the cuts. Times are source-relative `startMs` and `endMs`; keep the original whitespace in each token's `text`. Use an empty array for a silent source. Run the helper from the installed skill directory.

```sh
python scripts/caption_track.py "~/Videos/Edited project" --track take-01 "take-01.words.json" --track take-02 "take-02.words.json" --output "caption-draft.json"
```

Check the draft against playback and put the verified wording and timings in the project's `captions[]`. Set `emphasis` to the exact substring or substrings that should appear in amber. A cue such as `{"from":30,"durationInFrames":44,"text":"Right now we have three routes","emphasis":["three routes"]}` keeps the lead-in white. Keep related words and units together. Give one idea emphasis at a time and leave connective phrases white. The title card can display its headline in uppercase while spoken captions retain their natural spelling and case.

## Describe the edit

| Field | Use |
| --- | --- |
| `width`, `height`, `fps` | Output dimensions in pixels and frame rate. The demo uses 1080 by 1920 at 30 fps. |
| `durationInFrames` | Required for an animation-only timeline. With source cuts, omit it for automatic duration or set it to their exact total. |
| `sources[]` | Each entry has a unique `id`, a `file` relative to `public/`, a `kind` of `video` or `audio`, and its `durationInFrames`. Use forward slashes in filenames. |
| `cuts[]` | Each entry chooses `source`, `inFrame`, `outFrame` and `view`. Camera views optionally accept `fit` (`cover` or `contain`) and `focus` with `xPct` and `yPct`. The default centers a cover crop. |
| `inserts[]` | Each entry has `from`, `durationInFrames`, `mode` (`full`, `overlay`, `split`, or `behind`) and `headline`. Optional fields include `detail`, a registered `scene` key, an overlay `box`, or split-specific `topPct` and `seamTitle`. |
| `captions[]` | Each entry has output `from`, `durationInFrames` and `text`. Optional `emphasis` selects phrases for amber highlighting; `topPct` sets vertical position. Use a JSON newline escape for an intentional line break. |

This example uses two independently timed source files. Replace the example names and timings with the actual recordings.

```json
{
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "sources": [
    {"id": "camera", "kind": "video", "file": "media/take-01.mp4", "durationInFrames": 900},
    {"id": "voice", "kind": "audio", "file": "media/voice-02.wav", "durationInFrames": 480}
  ],
  "cuts": [
    {"source": "camera", "inFrame": 30, "outFrame": 120, "view": "camera", "focus": {"xPct": 46, "yPct": 40}},
    {"source": "camera", "inFrame": 690, "outFrame": 780, "view": "camera"},
    {"source": "voice", "inFrame": 24, "outFrame": 114, "view": "voiceover"}
  ],
  "inserts": [
    {"from": 42, "durationInFrames": 30, "mode": "overlay", "headline": "Invoice received",
     "box": {"leftPct": 6, "topPct": 12, "widthPct": 34}},
    {"from": 84, "durationInFrames": 53, "mode": "full", "headline": "Match the payment", "detail": "Compare the invoice and the bank entry."},
    {"from": 180, "durationInFrames": 90, "mode": "full", "headline": "Confirm the payment", "detail": "Mark the paid invoice in the ledger."}
  ],
  "captions": [
    {"from": 15, "durationInFrames": 37, "text": "The invoice just arrived."},
    {"from": 185, "durationInFrames": 62, "text": "Now we can confirm the payment."}
  ]
}
```

This edit lasts 270 frames. The first full-screen insert spans the source cut at output frame 90. The existing camera audio continues to that cut and the next source interval starts there. Adding an animation over a continuous take needs only an insert. Keep the take in one cut to preserve its original audio across the entire graphic.

## Choose the picture and audio

- **Talking head.** Use a video source with `view: "camera"` for the picture and its embedded audio. The original take supplies speech across picture changes. Select `contain` to show the full source frame or adjust `focus` to keep the speaker visible in a cover crop. To put a graphic above or behind the speaker, use the [presenter layouts guide](presenter-layouts.md).
- **Voiceover.** Use `view: "voiceover"` for an audio file or for a video's embedded narration. Each cut mounts one audio element. For an illustrated voiceover, cover the narration with full-screen inserts. Gaps show the dark base canvas.
- **Animation only.** Leave `sources` and `cuts` empty and give the project an explicit duration. Keep `captions` empty unless the edit needs text.
- **Camera only.** Empty insert and caption arrays are valid.
- **Inset or transparent overlay.** `box.leftPct` and `box.topPct` place the animation's top-left corner. `box.widthPct` scales both axes uniformly and preserves the composition's aspect ratio. The default box occupies 38% of the frame width at 55% from the left and 10% from the top. For a full-canvas transparent overlay, use 0, 0 and 100 with an animation that actually draws a transparent background.

The base picture can be full-screen animation, camera, split, or a presenter over a background. Overlay inserts and captions sit above it. Captions use the bundled Anton face, white and amber text, a dark outline and a shadow. The default caption top is 71% of the full frame. In split view it moves into the presenter panel. Adjust an individual caption's `topPct` when its words cover a face, screen label or hand movement.

Source audio remains on the original cut. Author insert components as silent visuals. To build a distinct beat, add an original component beside `src/look/Scene.tsx`. Import it in that file and add a named export such as `export const scenes = {comparison: ComparisonScene};`. Use `comparison` as the insert's `scene`. The saved style then carries both the component and its key to the next project. The default key is `look`. All scenes accept `headline`, optional `detail` and `durationInFrames`. Use the local Remotion frame to make each animation seekable during review.

The validator checks source references, frame ranges, the resulting duration, bounds and overlap within each visual or caption lane. One full-screen insert can intentionally share frames with one overlay. Adjacent spans can meet at an exact frame. Ranges that repeat a passage of an original take play in their declared order. Actual file presence, playable streams, source lengths and sync still need inspection in the generated project.

## Review in Codex

Run `npm run check` in the prepared project, then `npm run studio`. The Studio command prints a localhost URL and leaves the system browser closed. Codex opens that URL in its in-app browser and selects **TengEdit**. Keep Studio running while the creator reviews the edit. Timing and text changes belong in `src/timeline.json`. Visual changes belong in the selected scene source.

Play across every speech cut, including late cuts near the end. Scrub to both sides of each animation boundary and back to the camera. Confirm original audio is continuous beneath graphics, each caption follows the words, and the camera crop and overlays leave faces and important details visible. Save the editable project and hold any video export, including a test export, until the creator has personally reviewed this edit and approved export.
