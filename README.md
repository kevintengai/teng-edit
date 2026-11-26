# teng-edit

Edit talking-head videos and build cinematic animated cutaways in one Codex chat. Give Codex your footage or narration, ask for `$teng-edit`, and review the editable timeline inside Codex.

## Install in Codex

Anyone can install the skill by pasting this into a Codex chat.

> Install the Codex skill at https://github.com/kevintengai/teng-edit/tree/main/skills/teng-edit.

The edit workflow, animation workflow and local style library come in that one install. Python 3.10+, Node.js with npm, and FFmpeg with ffprobe support the local tools. Codex sets up the project’s Remotion dependencies when preparing the first edit.

## Use it

> Use $teng-edit on this talking-head recording. Keep my voice underneath the cutaways, animate the product workflow when I explain it, and open the edit here for review.

> Use $teng-edit on this voiceover. Build a vertical animated explainer in the midnight-signal style and keep the final invitation on screen through the last word.

> Use $teng-edit to save this revised animation look as a new style, then use that revision for my next video.

## The built-in look

Midnight-signal uses dark blue 3D environments, amber signals, cyan details, and short captions. The reference frame below shows the device materials, lighting and type from the original edit.

<img src="skills/teng-edit/assets/styles/midnight-signal/reference.png" alt="A dark blue 3D phone showing a masterclass and an amber and cyan flow diagram" width="270">

Remotion provides the editable timeline. FFmpeg handles media checks when useful. New styles live in a local versioned library and each project pins its chosen look. The creator reviews the current cut before approving a video export.
