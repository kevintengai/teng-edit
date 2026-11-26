# Midnight signal

Use this look when the speaker describes an action with a visible result. The proof press shows amber ink landing on a sheet. The handset shows a print job ready for the press. Both use deep navy materials, amber accents and cool white type.

## Use the starter

The project starter copies the complete look into `src/look/` and selects `press-proof` for its demo. To mount the handset manually, place the default component inside a Remotion `Sequence` and pass the sequence length as `durationInFrames`. Keep the scene and its helpers together. The shot uses the sequence’s local frame, so dragging the playhead reproduces the action at that instant.

```tsx
<Sequence from={startFrame} durationInFrames={shotFrames}>
  <Scene
    headline="Proof approved"
    detail="The signed proof is ready for print."
    durationInFrames={shotFrames}
  />
</Sequence>
```

The sample props illustrate a client workflow. Replace both lines with the actual point the speaker makes. Aim for a headline of two to five words and a detail of one short sentence. The screen wraps and sizes the copy automatically. Omit `detail` when the headline carries the complete idea.

The component uses React, Remotion 4.0.534, `@remotion/three` 4.0.534, `@react-three/fiber` 9.4.0 and Three.js 0.180.0 in the host project.

## Reproduce the preview images

Both PNGs come from the `TengEdit` composition at 1080 × 1920, 30 fps, with one full-screen insert starting at frame 0 and lasting 120 frames. Frame numbers are zero-based.

| Preview | Scene source | Timeline settings |
| --- | --- | --- |
| [Proof press](press-preview.png) | `press-proof` in `PressProof.tsx` and `pressSet.ts` | Use the starter timeline as shipped, including captions. Capture frame 97. |
| [Handset](handset-preview.png) | `look` in `Scene.tsx` and `phone.ts` | Set `headline` to `Job ready` and `detail` to `Send the approved proof to the press.` Set `captions` to `[]`. Capture frame 72. |

The scene code builds the models and draws their textures. `Readout.tsx` draws the animated result and `SignalPath.tsx` draws the three-step diagram. The proof-press headline and dialogue captions use Anton by the Anton Project Authors. The generated project's `public/fonts/OFL.txt` contains the font's copyright notice and SIL Open Font License 1.1.

## Frame a presenter

Use the default `look` scene for a device demonstration. Use `readout` for a short result the speaker actually states. Put the value or phrase in `headline` and an optional context label in `detail`. The readout places cyan type near the top of a portrait background, leaving room for a keyed presenter. In a wide upper panel it centers the type above a moving amber light. For an upper-panel process diagram, choose `signal`. Give it a short headline and up to three newline-separated steps in `detail`. The amber light travels between the labeled nodes. All three scenes work in full-screen, split and behind-presenter layouts.

## Stage a print proof

Choose `press-proof` when the spoken beat is about printing, alignment, or checking a result. The orthographic camera looks straight down at a tabletop press. A roller travels across a sheet from left to right, laying down amber rings and bars. With no vanishing point, the viewer can compare the marks across the sheet throughout the stroke.

Write a short headline in sentence case and put one supporting line in `detail`. Keep speech in the timeline caption lane, where each cue can highlight a different phrase. In the starter, the closing cue highlights “in register” as the printed marks become visible.

```json
{"from": 0, "durationInFrames": 120, "mode": "full", "scene": "press-proof",
 "headline": "Pull a proof", "detail": "One pass lays down the amber ink."}
```

## Shape the handset shot

- **Materials.** Give each edge a reason to catch light. The handset separates the matte navy enclosure, narrow alloy rim, dark glass, side controls and black rubber cradle. On a different object, model fasteners, joints, contacts or other details that explain how someone would use it.
- **Color.** Start with a near-black room around `#081222`, navy screen tones from `#0b1728` to `#1e354d`, and cool white copy near `#f2f5f6`. Use muted cyan around `#8fcee4` for available stations. Amber around `#e7b36a` follows the active point. Give the signal a small bright core, a soft halo and a restrained horizontal flare.
- **Depth.** Place a solid object in the near plane, the subject at reading distance and a dim window behind it. Move the camera slightly sideways during the forward push. The changing overlap between the handset and the window mullions makes the movement visible.
- **Timing.** The opening 8% establishes the device. The amber core visits the center station, then reaches the far station at 82%. Let the viewer read the destination during the hold. Change these fractions to meet the syllable or action that matters in the actual clip.
- **Framing.** In portrait, the handset ends near two thirds of the canvas width. Keep important screen text above any caption overlay. Check the middle of the move with captions on, as well as the first and last frames.

## Design the next insert around its subject

Pick the object the speaker could actually operate. Give the viewer a clear action and a visible consequence. Reuse the contrast, lens travel and lighting choices while building the new mechanism to suit that idea.

| Spoken idea | Model and action | What the viewer sees at the end |
| --- | --- | --- |
| A client changes a deadline | An encoder advances one notch on a scheduling terminal. A warm trace reaches the affected calendar cell. | The actual new date and time, large enough to read. |
| A route changes | A miniature intersection sits between modeled building corners. The active marker pauses at a closure and takes the turn. | The revised destination and the reason for the turn. |
| An assembly needs an extra step | A keyed connector stops at an obstructed socket. The guide slides into place before the connector seats. | Aligned contacts and one confirmation lamp. |

In `phone.ts`, `printScreen` controls typography, `stations` locates the signal stops, and `pose` sets camera travel and timing. For a replacement subject, attach the signal to its actual contact, route or moving part. Check the insert in the editor at phone size and scrub backward across the key action to confirm it follows the frame clock.
