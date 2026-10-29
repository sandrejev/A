# VTuber Studio

Everything we need to make YouTube videos with our own animated character, using free software and a normal webcam or phone.

```
 1. CHARACTER            2. ANIMATION                      3. VIDEO
 ───────────             ───────────                       ───────
 VRoid Studio   ──.vrm──▶ animator/ (this repo)   ──clip──▶ CapCut / DaVinci Resolve
 (design it)             webcam or phone video             + green-screen key
                         → face + body tracking            + narration from voice/
                         → green-screen MP4                  (cloned voice, subtitles)
```

| Step | Tool | Guide |
|---|---|---|
| 1. Create the character | **VRoid Studio** (free), export `.vrm` | [docs/1-character.md](docs/1-character.md) |
| 2. Animate it from video | **`animator/`** browser app (here), or VSeeFace / Warudo / XR Animator | [docs/2-animation.md](docs/2-animation.md) |
| 3. Edit and add a voice | **CapCut** or **DaVinci Resolve**; **`voice/`** (Chatterbox voice cloning) | [docs/3-editing-and-voice.md](docs/3-editing-and-voice.md) |

## Quick start

**Animator** (needs Python and Chrome or Edge):

```bash
cd animator
python start.py
```

Click *Use sample character* → *Start webcam* → *Start recording*.

**Narration in a cloned voice** (see the [install steps](docs/3-editing-and-voice.md#install-once) first):

```bash
cd voice
python narrate.py example_script.txt --voice narrator=voices/narrator.wav --voice kiki=voices/kiki.wav --out episode1
```

## Making one episode

1. Write the script (`voice/my_episode.txt`).
2. Generate the narration → `episode.wav` + `episode.srt`.
3. Film yourself acting the scene with a phone while the narration plays.
4. Animator: load the character, the video and the narration → **Record whole video file**.
5. Editor: background + character clip (chroma key) + music + captions → export 1080p → upload.

## Repo layout

```
animator/   browser app: VRM + MediaPipe tracking + lip sync + recording
voice/      Chatterbox voice cloning: narrate.py (scripts) and app.py (web page)
docs/       step-by-step guides for each stage
```

## Credits

- [three.js](https://threejs.org/) and [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) for rendering VRM models
- [MediaPipe](https://ai.google.dev/edge/mediapipe) face and pose landmarkers for tracking
- [Kalidokit](https://github.com/yeemachine/kalidokit) for turning landmarks into bone rotations
- [Chatterbox](https://github.com/resemble-ai/chatterbox) by Resemble AI for voice cloning
