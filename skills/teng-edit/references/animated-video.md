# Animated inserts and narration-led scenes

Read the chosen look in `src/look/STYLE.md` and inspect its reference images before designing shots. The bundled proof press shows a physical process. The handset can display a message or workflow. Choose objects that help explain what the speaker says.

## Turn speech into shots

Mark the spoken cue, the change the viewer needs to see, and the return frame for each insert. For example, when someone says “the customer approved the draft,” start with a close-up of a pending message, let the reply arrive on “approved,” then return to the speaker’s reaction. One concrete change makes a better cutaway than a montage of unrelated screens.

For presenter-led projects, edit the camera takes first. Place each insert on the resulting output timeline so its timing survives trimming and reordering. For narration-led projects, divide the full duration into scenes. Establish the example, show it changing, then hold the outcome long enough to read. Revise the insert positions when the speech edit changes.

Use the supplied scene component for beats it genuinely depicts. Build other beats as new editable Remotion components or Three.js scenes. Keep repeated looks consistent through shared lighting, material, caption and camera choices. A custom scene can extend the template’s insert data and rendering logic. Keep a single timing authority for each visual change.

## Match the cinematic look

Use midnight navy for depth, cobalt edges on physical objects, warm amber for the action the viewer follows and cyan for secondary information. Set the camera where the change is easiest to see. In the proof press demo, the overhead view lets the viewer watch the roller cross the paper and inspect the registration marks it leaves behind. Choose shots that remain legible at phone size with the sound off.

Treat device content as editable text. Reserve a clear region for short captions below the visual action. Preserve sentence case, proper names and spoken comment keywords in quotation marks. Check title and caption contrast against the brightest frame of each moving shot. Use original designs and user-cleared assets.

## Review in Codex

Use a supported Node.js LTS release (Node 22.12+ or 24) and npm. From the generated project:

```sh
npm ci
npm run check
npm run studio
```

Studio prints a local URL. Open the composition in the Codex in-app browser and leave it available for the creator. The creator can ask for changes by timestamp in the same chat. Use the local FFmpeg and ffprobe executables when the task needs audio measurements, stream inspection, or stills. Preserve original source audio without routine downmixing or loudness processing.

Scrub the first and last frames, both sides of each cutaway, and the fastest camera move. Check a wide shot and a close-up at phone size, verify readable screen copy, and listen across speech cuts when playback is available. Report a measurement as a measurement. Stills, timeline playback, and a live Studio link support pre-export review.

When an edit introduces or revises a look, save its reusable components, guide and reference assets in [the local style library](asset-library.md). Keep project-specific words in the timeline.

## Export an approved cut

After the creator reviews this version and explicitly asks to export it, run Remotion locally from the project. Match the format and dimensions to the brief. For a standard MP4, use a new output filename for each approved revision.

```sh
npx --no-install remotion render src/index.tsx TengEdit "out/edit-v1.mp4" --codec=h264
ffprobe -v error -show_entries "format=duration:stream=codec_type,codec_name,width,height,channels" -of json "out/edit-v1.mp4"
ffmpeg -v error -i "out/edit-v1.mp4" -f null -
```

Compare the result with the approved timeline and expected streams. The last command checks decodability. Return the file in the same Codex chat.
