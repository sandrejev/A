# Step 2 — Animate the character from a webcam or recorded video

No motion-capture suit needed: modern face and body tracking (Google MediaPipe) works from a normal webcam or phone video.

## Option A: our browser animator (in this repo, works on Windows, Mac and Linux)

The `animator/` folder is a small web app that:

- loads your `.vrm` character,
- tracks **head, face expressions, blinking, mouth, arms and upper body** (legs optional) from the **webcam** or a **recorded video file** (for example, filmed on a phone),
- can drive the mouth from a **narration audio file** instead (for AI voice-overs, see step 3) or from the microphone,
- records the result as an **MP4/WebM with a green background**, ready for your video editor.

### Start it

You need Python (any 3.x) and Chrome or Edge.

```bash
cd animator
python start.py
```

This opens `http://localhost:8000`. (Opening `index.html` directly doesn't work: browsers only allow webcam access on `localhost` or `https` pages.)

### Use it

1. **Character**: *Load .vrm model* (or *Use sample character* to try it out).
2. **Motion**: either *Start webcam* or *Use recorded video*.
   - Good light on the face, plain background, and the camera at eye level.
   - For arms, the upper body must be visible. Tick *Track legs* only when the whole body is in frame.
   - *Smoothing*: higher is calmer but slower to react.
3. **Mouth / lip sync**: one of these:
   - *From face tracking*: your own mouth movements (when you speak on camera).
   - *From narration audio file*: load the AI narration WAV. The mouth follows the sound, and the audio goes into the recording.
   - *From microphone*: speak live.
4. **Look**: background color (keep green for keying), size (1920×1080 for YouTube, 1080×1920 for Shorts), framing. Drag in the picture to orbit, scroll to zoom.
5. **Record**:
   - *Start/Stop recording* records whatever happens live.
   - *Record whole video file* rewinds the recorded video, plays it once, and saves the clip. If narration is loaded, it starts at the same moment.

The file lands in your Downloads folder.

### Typical "recorded video" workflow

1. Film yourself (or your daughter) acting the scene with a phone: upper body, good light, landscape orientation.
2. Make the narration with `voice/narrate.py` (step 3) **or** keep the voice from the video (*Include sound from recorded video*).
3. In the animator: load the character, then the video, plus the narration if you have one. Click **Record whole video file**.
4. Put the clip in the editor and remove the green with chroma key.

Tip: for a narration-driven scene, act along while playing the narration, so the gestures fit the words.

## Option B: ready-made free apps (more polish, Windows-first)

| App | Platform | What it's good at |
|---|---|---|
| [**VSeeFace**](https://www.vseeface.icu/) | Windows | The classic free 3D VTuber app. Very good face tracking from a webcam, VRM support, sends to OBS. |
| [**Warudo**](https://warudo.app/) | Windows (Steam, free) | Modern and flexible: scenes, props, effects, "blueprint" automation, webcam or iPhone tracking. |
| [**XR Animator**](https://github.com/ButzYung/SystemAnimatorOnline) | Browser / Windows / Mac | Full-body tracking from a webcam **or video file**, and can export the motion (BVH/VMD) to Blender. |
| **VTube Studio** | Windows / Mac / phone | The standard for **2D Live2D** models (if you go the 2D route). |

To record these, use [**OBS Studio**](https://obsproject.com/) (free): add the app as a *Game/Window Capture*, set a green or transparent background in the app, and record.

### Better face tracking with an iPhone

An iPhone with Face ID gives the best face tracking (ARKit, 52 face shapes). VSeeFace, Warudo and VTube Studio all accept it through companion apps (iFacialMocap, VTube Studio's phone app). This is the cheapest "pro" upgrade if you want one later.

## Option C: high-quality offline animation (advanced)

For scenes like dancing, walking or full-body action: XR Animator or [Rokoko Video](https://www.rokoko.com/products/vision) (free tier) turns a video into a motion file, which you import into **Blender** with the VRM add-on and render with nice lighting and cameras. That's more work, but it looks like an animated film rather than a stream.
