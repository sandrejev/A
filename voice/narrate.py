"""Turn a text script into narration spoken in a cloned voice (Chatterbox TTS).

Script format (plain .txt, UTF-8):

    # lines starting with "#" are comments
    narrator: Hello everyone, welcome back to the channel!
    kiki: Hi! Today we are building a robot.
    This line has no speaker, so it uses the first voice.

    An empty line adds a longer pause (good between topics).

Each speaker name must match a --voice NAME=reference.wav argument.
A reference is 10-20 seconds of clean speech by the person whose voice you
are cloning (with their permission!).

Outputs:
    <out>.wav            the full narration
    <out>.srt            subtitles with timings (upload to YouTube or your editor)
    <out>_lines/*.wav    every line as its own file, handy for editing

Examples:
    python narrate.py script.txt --voice narrator=voices/dad.wav --out episode1
    python narrate.py script.txt --voice narrator=voices/dad.wav --voice kiki=voices/kiki.wav --lang de
    python narrate.py script.txt --voice narrator=voices/dad.wav --dry-run
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

LINE_PAUSE = 0.35      # seconds of silence after each line
PARAGRAPH_PAUSE = 0.9  # extra silence for an empty line in the script
MAX_CHUNK_CHARS = 250  # Chatterbox sounds best on short pieces of text


@dataclass
class Line:
    speaker: str
    text: str
    pause_after: float


def parse_script(text: str, speakers: list[str]) -> list[Line]:
    """Split the script into lines, each with a speaker and a pause."""
    lines: list[Line] = []
    known = {s.lower(): s for s in speakers}
    for raw in text.splitlines():
        raw = raw.strip()
        if raw.startswith("#"):
            continue
        if not raw:
            if lines:
                lines[-1].pause_after = LINE_PAUSE + PARAGRAPH_PAUSE
            continue
        speaker = speakers[0]
        m = re.match(r"^([\w\- ]{1,30}):\s*(.+)$", raw)
        if m and m.group(1).strip().lower() in known:
            speaker = known[m.group(1).strip().lower()]
            raw = m.group(2).strip()
        lines.append(Line(speaker, raw, LINE_PAUSE))
    return lines


def split_long(text: str, limit: int = MAX_CHUNK_CHARS) -> list[str]:
    """Break long text at sentence ends (then commas) so each chunk stays short."""
    if len(text) <= limit:
        return [text]
    sentences = re.split(r"(?<=[.!?…。！？])\s+", text)
    chunks: list[str] = []
    for sentence in sentences:
        pieces = [sentence]
        if len(sentence) > limit:
            pieces = re.split(r"(?<=[,;:])\s+", sentence)
        for piece in pieces:
            if chunks and len(chunks[-1]) + 1 + len(piece) <= limit:
                chunks[-1] += " " + piece
            else:
                chunks.append(piece)
    return chunks


def srt_time(seconds: float) -> str:
    ms = round(seconds * 1000)
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def pick_device(requested: str) -> str:
    import torch

    if requested != "auto":
        return requested
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def load_model(lang: str, device: str):
    """English uses the original model; other languages the multilingual one."""
    if lang == "en":
        from chatterbox.tts import ChatterboxTTS

        model = ChatterboxTTS.from_pretrained(device=device)
        return model, (lambda text, ref, **kw: model.generate(text, audio_prompt_path=ref, **kw))

    from chatterbox.mtl_tts import SUPPORTED_LANGUAGES, ChatterboxMultilingualTTS

    if lang not in SUPPORTED_LANGUAGES:
        sys.exit(f"Language '{lang}' is not supported. Choose one of: {', '.join(SUPPORTED_LANGUAGES)}")
    model = ChatterboxMultilingualTTS.from_pretrained(device=device)
    return model, (lambda text, ref, **kw: model.generate(text, language_id=lang, audio_prompt_path=ref, **kw))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script", type=Path, help="text file with the narration")
    ap.add_argument("--voice", action="append", required=True, metavar="NAME=FILE.wav",
                    help="speaker name and reference recording; repeat for more speakers")
    ap.add_argument("--out", type=Path, default=Path("narration"), help="output name without extension")
    ap.add_argument("--lang", default="en", help="language code, e.g. en, de, fr, ja (default: en)")
    ap.add_argument("--exaggeration", type=float, default=0.5,
                    help="emotion intensity 0.25-1.0; higher = more expressive (default 0.5)")
    ap.add_argument("--cfg", type=float, default=0.5,
                    help="pacing; lower (~0.3) = slower, calmer speech (default 0.5)")
    ap.add_argument("--device", default="auto", help="auto, cuda, mps or cpu")
    ap.add_argument("--dry-run", action="store_true", help="only show how the script will be read")
    args = ap.parse_args()

    voices: dict[str, Path] = {}
    for item in args.voice:
        name, sep, path = item.partition("=")
        if not sep:
            sys.exit(f"--voice must look like NAME=file.wav (got '{item}')")
        voices[name.strip()] = Path(path)
    lines = parse_script(args.script.read_text(encoding="utf-8"), list(voices))
    if not lines:
        sys.exit("The script is empty.")

    if args.dry_run:
        for i, line in enumerate(lines, 1):
            for chunk in split_long(line.text):
                print(f"{i:03} [{line.speaker}] {chunk}")
            print(f"     (pause {line.pause_after:.2f}s)")
        return

    for name, path in voices.items():
        if not path.is_file():
            sys.exit(f"Reference recording for '{name}' not found: {path}")

    import numpy as np
    import soundfile as sf

    device = pick_device(args.device)
    print(f"Loading voice model on {device} (first run downloads a few GB)…")
    model, generate = load_model(args.lang, device)
    sr = model.sr

    lines_dir = Path(f"{args.out}_lines")
    lines_dir.mkdir(parents=True, exist_ok=True)
    full: list[np.ndarray] = []
    subtitles: list[str] = []
    t = 0.0
    for i, line in enumerate(lines, 1):
        print(f"[{i}/{len(lines)}] {line.speaker}: {line.text}")
        parts = []
        for chunk in split_long(line.text):
            wav = generate(chunk, str(voices[line.speaker]),
                           exaggeration=args.exaggeration, cfg_weight=args.cfg)
            parts.append(wav.squeeze(0).detach().cpu().numpy())
            parts.append(np.zeros(int(0.12 * sr), dtype=np.float32))  # breath between chunks
        audio = np.concatenate(parts[:-1])
        sf.write(lines_dir / f"{i:03}_{line.speaker}.wav", audio, sr)

        duration = len(audio) / sr
        subtitles.append(f"{i}\n{srt_time(t)} --> {srt_time(t + duration)}\n{line.text}\n")
        full += [audio, np.zeros(int(line.pause_after * sr), dtype=np.float32)]
        t += duration + line.pause_after

    out_wav = args.out.with_suffix(".wav")
    sf.write(out_wav, np.concatenate(full), sr)
    args.out.with_suffix(".srt").write_text("\n".join(subtitles), encoding="utf-8")
    print(f"Done: {out_wav} ({t:.1f}s), {args.out.with_suffix('.srt')}, {lines_dir}/")


if __name__ == "__main__":
    main()
