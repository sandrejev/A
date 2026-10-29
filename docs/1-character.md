# Step 1 — Create the character

## Recommendation: VRoid Studio (free, 3D, anime style)

[VRoid Studio](https://vroid.com/en/studio) (by pixiv) is the easiest way to get a VTuber-ready character. You design it like a character creator in a game: sliders for the face and body, hair you draw with a pen, ready-made clothes you can recolor or paint over. It runs on Windows and macOS.

It's the right fit because:

- **Kid-friendly.** No 3D modelling skills needed. Your daughter can design the character, and you help with the export.
- **It's rigged for you.** Every model already has a skeleton, blinking, mouth shapes (A, I, U, E, O) and expressions (happy, angry, sad, surprised). Those are exactly what face tracking needs.
- **It exports a `.vrm` file.** VRM is the standard VTuber avatar format. Our animator, VSeeFace, Warudo, XR Animator, Blender (with the VRM add-on), Unity and many other tools can load it.

### Workflow

1. Install VRoid Studio and click **New** → pick a base model (female or male; you can change everything after).
2. **Face**: eyes, eyebrows, mouth, face shape. Use **Face → Expressions** to preview blinking and mouth shapes.
3. **Hair**: start from a preset, then edit hair groups. Drawing your own hair guides is the most fun part, and also the slowest.
4. **Body** and **Outfit**: pick clothes, change colors, or open the texture editor and paint directly on the clothes (logos, patterns).
5. **Save often** (the `.vroid` project file is your master copy, and it's what you keep editing later).
6. **Camera/Exporter → Export as VRM**:
   - Choose **VRM 1.0** (VRM 0.0 also works with everything here).
   - Fill in the name and author, and set the **permissions**. For your own channel, "only the author" is fine.
   - Keep the default polygon and material reduction settings unless the model is slow.
7. Open the [animator](../animator/) → **Load .vrm model** to check it.

Want more outfits or hairstyles? Search "VRoid" on [BOOTH](https://booth.pm/en) for free and paid textures and clothes, and check each item's license before using it on YouTube.

## Alternatives

| Option | Look | Effort | Notes |
|---|---|---|---|
| **VRoid Studio** (recommended) | 3D anime | Low | Full face and body rig, VRM export. |
| **PNGtuber** ([veadotube mini](https://olmewe.itch.io/veadotube-mini), free) | 2D drawing | Very low | Two or more drawings (mouth closed/open) that switch when you talk. Good first project for a kid who likes drawing. No body tracking. |
| **Live2D Cubism** + VTube Studio | 2D anime (the Hololive look) | High | You need a layered drawing (every eye, eyelid, hair strand on its own layer), then rig it in Cubism. Most professional 2D VTubers pay artists and riggers for this. The free Cubism version is enough to learn. |
| **AI image → 3D** (Tripo, Meshy, Hunyuan3D) | 3D, any style | Low | Makes a static mesh. Body auto-rigging exists, but there are **no facial expressions or mouth shapes**, so it is a poor fit for talking characters today. |
| **Blender** + [VRM add-on](https://vrm-addon-for-blender.info/en/) | Anything | Very high | For later: edit a VRoid export (add a tail, ears, props) and export back to VRM. |

### Using AI in the character step

AI image generators are useful for **concept art**: generate a few ideas ("anime girl, cat ears, purple hoodie, cheerful, full body, character sheet"), pick the one you both like, then recreate it in VRoid using the image as a reference. You can also use AI-generated or hand-drawn patterns as clothing textures in VRoid's texture editor.

Fully automatic "photo or prompt → VTuber model" tools aren't reliable yet. Building the character in VRoid gives a much better result and is a nice creative project to do together.

## Tips

- Give the character a strong silhouette and one or two signature colors. It makes thumbnails easy to recognize.
- Big eyes and a clear mouth read well in small YouTube windows.
- Keep the `.vroid` file. You'll come back to tweak the outfit for special episodes (holidays, birthdays).
