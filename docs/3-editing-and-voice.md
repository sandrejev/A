# Step 3 — Edit the video and give the character a voice

## Video editing

| Editor | Price | Why pick it |
|---|---|---|
| [**CapCut** (desktop)](https://www.capcut.com/) | Free (some features Pro) | The easiest one. Drag and drop, auto-captions, stickers, sound effects, **chroma key** (*Remove background → Chroma key*). Great for your daughter. Needs an account. |
| [**DaVinci Resolve**](https://www.blackmagicdesign.com/products/davinciresolve) | Free | Professional editor (Windows, Mac, Linux). More to learn, but you'll never outgrow it. Excellent keying (*Effects → 3D Keyer*) and audio tools. Needs a decent GPU. |
| **Clipchamp** (Windows) / **iMovie** (Mac) | Free, built in | Fine for first videos. Both have a green-screen effect. |
| [Kdenlive](https://kdenlive.org/) / [Shotcut](https://shotcut.org/) | Free, open source | Good if you prefer open-source tools. |

**Suggestion:** start with **CapCut** together. When you want more control (color grading, multi-track audio), move to **DaVinci Resolve**.

### Putting the character into a video

1. Put your background (game footage, drawing, slides, a room image) on track 1.
2. Put the animator's green-screen clip on track 2 → apply **Chroma key** → pick the green.
3. Resize and move the character (bottom corner for "VTuber over gameplay", center for "talking" videos).
4. Add the narration WAV (if it isn't already in the clip), music and sound effects.
5. Import the `.srt` from `narrate.py` as captions, or use the editor's auto-captions.

**If the editor won't open a `.webm` file** (Firefox records WebM; Chrome/Edge usually record MP4): convert it with [HandBrake](https://handbrake.fr/) or `ffmpeg -i clip.webm -c:v libx264 -crf 18 -c:a aac clip.mp4`.

Also handy: [**Audacity**](https://www.audacityteam.org/) (free) for cleaning voice recordings, and [**OBS Studio**](https://obsproject.com/) for recording gameplay or screens.

## Voice: cloning and narration

Two ways to give the character a voice. Many VTubers use both.

### 1. Text → speech in a cloned voice (in this repo: `voice/`)

We use [**Chatterbox**](https://github.com/resemble-ai/chatterbox) by Resemble AI:

- free, open source (MIT license, so it's OK for monetized YouTube),
- clones a voice from a **10–20 second** sample,
- 23 languages (English, German, French, Spanish, Japanese and more), with an emotion slider,
- runs on your own computer. An NVIDIA GPU is fastest, Apple Silicon works, and CPU works but is slow.

#### Install (once)

Python **3.11** recommended.

```bash
cd voice
python -m venv .venv
```

Activate the environment. On Windows:

```bash
.venv\Scripts\activate
```

On Mac or Linux:

```bash
source .venv/bin/activate
```

Only with an NVIDIA GPU, install the CUDA version of PyTorch first:

```bash
pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124
```

Then:

```bash
pip install -r requirements.txt
```

The first run downloads the model (a few GB) from Hugging Face.

#### Record a voice sample

- 10–20 seconds of natural speech, one person, in a quiet room, no music.
- Speak in the style you want the character to have (energetic, calm, and so on).
- Save it as WAV in `voice/voices/` (that folder is git-ignored so your recordings stay private).

#### Easy mode: a web page

```bash
python app.py
```

Type the text, upload or record the voice sample, press Submit, and download the result.

#### Script mode: a whole episode at once

Write a script (see `example_script.txt`):

```text
narrator: Hello everyone, and welcome back!
kiki: Hi! Today we are building a robot.
```

Then run:

```bash
python narrate.py example_script.txt --voice narrator=voices/narrator.wav --voice kiki=voices/kiki.wav --out episode1
```

- `--lang de` for German (or `fr`, `es`, `ja`, ...).
- `--exaggeration 0.7` for more emotion, `--cfg 0.3` for slower, calmer speech.
- `--dry-run` shows how the script will be split without generating anything.

You get `episode1.wav` (the full narration), `episode1.srt` (subtitles) and `episode1_lines/` (one file per line, so you can redo a single line).

Then load `episode1.wav` in the animator under *Narration audio* so the mouth moves with it.

### 2. Speech → character voice (voice changer)

You talk, and it comes out in the character's voice, with your own timing and emotion. That often sounds more alive than text-to-speech.

- [**Applio**](https://applio.org/) (free, open source, RVC-based): train a voice model from about 10 minutes of recordings, then convert recordings or use it live.
- Paid and easiest: **ElevenLabs** (voice cloning, text-to-speech and "voice changer" in the browser; top quality, monthly fee).

## Safety and YouTube rules

- **Only clone voices with permission**: your own, your daughter's (with her OK), or a voice you designed. Never clone celebrities or other creators.
- A VTuber avatar is a great way to **protect your daughter's privacy**. Also keep the real voice samples, full name, school, and house details off the channel. The `.gitignore` here keeps voice samples and recordings out of GitHub.
- YouTube asks you to **disclose realistic synthetic content** when uploading (*Altered or synthetic content* checkbox). An AI-cloned narrator voice that sounds like a real person counts.
- YouTube channels need an adult owner (13+ in most countries, older in some). Run the channel under your account. If the videos are aimed at children, mark them **"Made for kids"**.
- Chatterbox adds an inaudible watermark to its audio (Resemble's PerTh), which helps identify AI audio. That's normal, and it doesn't change how it sounds.
