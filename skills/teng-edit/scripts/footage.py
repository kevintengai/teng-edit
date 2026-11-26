"""Find camera takes and locate long quiet passages on their source clocks."""
import math
import os
import re
import stat
import subprocess
from pathlib import Path


VIDEO_SUFFIXES = {".mp4", ".mov", ".m4v", ".mkv", ".webm", ".avi", ".mts", ".m2ts", ".mxf", ".mpg", ".mpeg", ".3gp"}
SKIP_DIRS = {"node_modules", "out", "output", "outputs", "export", "exports", "render", "renders", "proxy", "proxies", "cache", "staging"}
SILENCE_EVENT = re.compile(r"^\[(?:Parsed_)?silencedetect(?:_\d+)? @ [\da-fx]+\] silence_(start|end): ([-+.\deE]+)",
                          re.MULTILINE | re.IGNORECASE)
MIN_QUIET_SECONDS = 1.0
HANDLE_SECONDS = 0.25


def hidden_or_link(path):
    attrs = getattr(path.lstat(), "st_file_attributes", 0)
    return (path.name.startswith(".") or path.is_symlink()
            or bool(attrs & (stat.FILE_ATTRIBUTE_HIDDEN | stat.FILE_ATTRIBUTE_REPARSE_POINT)))


def natural_path(path):
    parts = tuple(tuple(int(bit) if i % 2 else bit.casefold()
                        for i, bit in enumerate(re.split(r"([0-9]+)", part)))
                  for part in path.parts)
    return parts, path.as_posix()


def camera_files(folder):
    def fail(error):
        raise error

    found = []
    for directory, subdirs, files in os.walk(folder, onerror=fail):
        current = Path(directory)
        if (current / "teng-style.json").is_file() and (current / "src" / "timeline.json").is_file():
            subdirs.clear()
            continue
        subdirs[:] = [d for d in subdirs if d.casefold() not in SKIP_DIRS and not hidden_or_link(current / d)]
        for name in files:
            path = current / name
            if path.suffix.casefold() in VIDEO_SUFFIXES and not hidden_or_link(path) and path.is_file():
                found.append(path.relative_to(folder))
    if not found:
        raise ValueError(f"No camera files found in {folder}. Use --media for an individual source file.")
    return [(folder / rel, rel.as_posix()) for rel in sorted(found, key=natural_path)]


def quiet_passages(path, fps, source_frames, audio_offset, audio_streams, ffmpeg):
    if audio_streams != 1:
        return {"status": "inspect-manually", "reason": "No audio stream." if not audio_streams else "Multiple audio streams."}
    if not ffmpeg:
        return {"status": "inspect-manually", "reason": "FFmpeg is unavailable."}
    # Measure all channels together and preserve the original recording. The local audio clock
    # starts at its first sample and is translated back to the media clock below.
    command = [ffmpeg, "-hide_banner", "-nostdin", "-nostats", "-loglevel", "info", "-progress", "pipe:1",
               "-i", str(path), "-map", "0:a:0", "-af", f"asetpts=PTS-STARTPTS,silencedetect=n=-45dB:d={MIN_QUIET_SECONDS}",
               "-f", "null", "-"]
    result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace")
    ends = re.findall(r"^out_time_us=(\d+)", result.stdout, re.MULTILINE)
    if result.returncode or not ends:
        return {"status": "inspect-manually", "reason": "Could not measure the audio track."}
    duration = int(ends[-1]) / 1_000_000
    start = None
    spans = []
    for event, seconds in SILENCE_EVENT.findall(result.stderr):
        if event.lower() == "start":
            start = max(0.0, float(seconds))
        elif start is not None:
            spans.append((start, min(duration, float(seconds))))
            start = None
    if start is not None and start < duration:
        spans.append((start, duration))
    audible = duration - sum(max(0, end - begin) for begin, end in spans)
    if audible < 0.45:
        return {"status": "inspect-manually", "reason": "Too little audible material to establish a dialogue cut."}
    candidates = []
    for begin, end in spans:
        # Inward rounding plus a handle at either side protects low-energy speech onsets and tails.
        cut_in = max(0, math.ceil((audio_offset + begin + HANDLE_SECONDS) * fps))
        cut_out = min(source_frames, math.floor((audio_offset + end - HANDLE_SECONDS) * fps))
        if cut_out > cut_in:
            candidates.append({"inFrame": cut_in, "outFrame": cut_out})
    return {"status": "analyzed", "quietCandidates": candidates}
