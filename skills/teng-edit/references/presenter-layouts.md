# Presenter layouts

Choose the layout for each spoken beat. Give a detailed demonstration the full frame. Bring the presenter back for a reaction, or keep them below the animation while they explain what the viewer should notice. The same scene and saved look work in all three layouts.

| Desired picture | Timeline setting | Footage |
| --- | --- | --- |
| Only the animation, with the speaker still audible | Insert with `mode: "full"` | Any existing speech cut |
| Animation above, presenter below | Insert with `mode: "split"` | A camera cut with ordinary, green-screen, or transparent footage |
| Presenter in front of a moving set, number, or diagram | Insert with `mode: "behind"` | Camera footage with a sampled chroma key or a real alpha channel |
| Only the presenter | Leave that span without a base insert | A camera cut |

## Start with the footage

For a vertical split from an ordinary camera take, the starter can make the first layout for you. Run it from the installed skill directory using the actual recording path.

```sh
python scripts/teng_edit.py new "~/Videos/Workflow demo" --media "camera.mp4" --size 1080x1920 --layout split
python scripts/teng_edit.py new "~/Videos/Studio host" --media "green-screen.mp4" --size 1080x1920 --layout green-screen --key-color "#36ad47"
```

Replace the example green with a color sampled from the actual backdrop near the presenter's shoulders. In `src/timeline.json`, put `"chromaKey": {"color": "#36ad47"}` on the relevant video source. Set each take separately if lighting changes. With existing alpha footage, set `"transparent": true` on the source instead. Play a few frames against the moving background to check that the decoded clip really has transparency. In camera-only and split shots, an isolated presenter sits against a dark neutral background. A regular room recording keeps its filmed background in the split.

When adding these layouts to a project created with an earlier version, carry its timeline, scene variants, approved framing and source media forward. Merge the updated Studio layout components, timeline validator and pinned media dependency from the installed template into the editable project. An older saved look still works as the default `look` scene. Choose named scenes such as `readout` or `signal` only for a look that registers them. Run the project checks and scrub an existing cut before adding a new layout.

## Switch layouts during one take

This example is the `inserts` array for one continuous 180-frame camera cut at 30 fps. The source has a chroma key and the project uses the bundled `midnight-signal` look. Replace the sample words with facts and cues from the recording.

```json
[
  {"from": 0, "durationInFrames": 45, "mode": "behind", "scene": "readout", "presenterHeightPct": 75,
   "headline": "Two taps", "detail": "Send a draft"},
  {"from": 45, "durationInFrames": 60, "mode": "full",
   "headline": "Draft sent", "detail": "The reviewer gets the link."},
  {"from": 105, "durationInFrames": 75, "mode": "split", "topPct": 35, "scene": "signal",
   "headline": "Approval workflow", "detail": "Draft\nReview\nSign", "seamTitle": "Where the approval appears"}
]
```

Keep this as a single camera cut when the speech is continuous. The inserts change the picture on output frames 45 and 105. A presenter layout can also span an intentional take change if every covered cut has the required footage.

## Frame and check the edit

- **Split.** The upper panel defaults to 35% of the canvas height. Set `topPct` to 50 for equal halves, or about 30 to emphasize the speaker as in a presenter-led reel. Use the cut's `focus.xPct` and `focus.yPct` to position the presenter. Design the animation for the upper panel's own width and height. Check the graphic at phone size.
- **Title and captions.** An optional `seamTitle` displays a dark serif headline on white across the divider. Use it for a short hook, then let it clear for the demonstration. Depending on the shot, move the captions with `captions[].topPct` to keep them clear of the mouth, hands, and graphic. The percentage is relative to the entire canvas.
- **Green screen.** For a tight source crop, use `presenterHeightPct` on a `behind` insert to reserve headroom. A value of 75 puts the presenter in the bottom three quarters, leaving space for the number or diagram. Set `chromaKey.similarity` just high enough to clear the backdrop. Adjust `softness` for hair and moving fingers and `spillSuppression` for green edges. Each accepts 0 to 1. Scrub a wide gesture and a close-up to catch missing detail or a green fringe.
- **Review.** Play through each layout change in Codex. Check the last frame on one side and the first on the other. Listen for a second voice, a dropped syllable, or a jump in lip sync. With a real room and no isolated foreground, the split can show the presenter and animation together immediately.
