"""Build a draft caption lane from source-relative Remotion transcripts and the edited cut list."""
import argparse
import json
import math
from pathlib import Path


def read_track(path):
    words = json.loads(Path(path).expanduser().read_text(encoding="utf-8-sig"))
    if not isinstance(words, list):
        raise ValueError(f"Expected a Remotion Caption array in {path}")
    previous = -1
    for word in words:
        start, end, text = word["startMs"], word["endMs"], word["text"]
        if (not isinstance(text, str) or not isinstance(start, (float, int)) or not isinstance(end, (float, int))
                or not math.isfinite(start) or not math.isfinite(end) or not 0 <= start <= end or start < previous):
            raise ValueError(f"Check source word timestamps and text in {path}")
        previous = start
    return words


def build_lane(timeline, tracks):
    fps = timeline["fps"]
    offset = 0
    lane = []
    for cut in timeline["cuts"]:
        source, first, last = cut["source"], cut["inFrame"], cut["outFrame"]
        if source not in tracks:
            raise ValueError(f"Missing transcript for {source}. For a silent take supply an empty JSON array.")
        cue = None
        previous_end = 0
        page_break = False
        for word in tracks[source]:
            start, end = word["startMs"] * fps / 1000, word["endMs"] * fps / 1000
            if not first <= (start + end) / 2 < last:
                continue
            text = word["text"]
            if not text.strip():
                continue
            lo = offset + max(first, math.floor(start)) - first
            hi = min(offset + last - first, max(lo + 1, offset + math.ceil(end) - first))
            # Remotion tokens include their original spacing. Join punctuation and subwords verbatim.
            joined = (cue["text"] + text) if cue else text
            boundary = cue and lo > cue["from"] and (
                lo - previous_end > fps * .45 or hi - cue["from"] > fps * 2.6 or
                len(joined.strip()) > 38 or cue["text"].rstrip().endswith((".", "?", "!", "。", "？", "！")) or page_break
            )
            if cue is None or boundary:
                if cue:
                    cue["durationInFrames"] = min(cue["durationInFrames"], lo - cue["from"])
                cue = {"from": lo, "durationInFrames": hi - lo, "text": text}
                lane.append(cue)
            else:
                cue["text"] = joined
                cue["durationInFrames"] = max(cue["durationInFrames"], hi - cue["from"])
            previous_end = hi
            page_break = word.get("pageBreakAfter", False)
        offset += last - first
    for cue in lane:
        cue["text"] = cue["text"].strip()
    return lane


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path)
    parser.add_argument("--track", action="append", required=True, nargs=2, metavar=("SOURCE_ID", "WORDS_JSON"))
    parser.add_argument("--output", type=Path, help="Write a new draft JSON file. Defaults to standard output.")
    args = parser.parse_args()
    try:
        timeline = json.loads((args.project.expanduser() / "src/timeline.json").read_text(encoding="utf-8-sig"))
        tracks = {source: read_track(path) for source, path in args.track}
        if len(tracks) != len(args.track):
            raise ValueError("Each source ID should have one transcript.")
        draft = json.dumps(build_lane(timeline, tracks), ensure_ascii=False, indent=2)
        if args.output:
            with args.output.expanduser().open("x", encoding="utf-8") as handle:
                handle.write(draft + "\n")
        else:
            print(draft)
    except (KeyError, TypeError, ValueError, OSError) as error:
        parser.exit(1, f"caption track: {error}\n")


if __name__ == "__main__":
    main()
