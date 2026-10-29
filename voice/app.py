"""A simple web page for making voice lines: type text, pick a voice, press Speak.

    python app.py      (then open the address it prints, usually http://127.0.0.1:7860)
"""
import gradio as gr

from narrate import load_model, pick_device

LANGUAGES = ["en", "de", "fr", "es", "it", "nl", "pl", "pt", "ru", "ja", "ko", "zh", "sv", "da", "fi", "no", "tr"]
_models = {}


def speak(text, reference, lang, exaggeration, cfg):
    if not text.strip():
        raise gr.Error("Type something to say first.")
    if not reference:
        raise gr.Error("Upload or record a voice sample (10-20 seconds of clear speech).")
    if lang not in _models:
        _models[lang] = load_model(lang, pick_device("auto"))
    model, generate = _models[lang]
    wav = generate(text, reference, exaggeration=exaggeration, cfg_weight=cfg)
    return model.sr, wav.squeeze(0).detach().cpu().numpy()


demo = gr.Interface(
    fn=speak,
    inputs=[
        gr.Textbox(label="What should the character say?", lines=4),
        gr.Audio(label="Voice sample (upload or record)", type="filepath", sources=["upload", "microphone"]),
        gr.Dropdown(LANGUAGES, value="en", label="Language"),
        gr.Slider(0.25, 1.0, value=0.5, step=0.05, label="Emotion (higher = more dramatic)"),
        gr.Slider(0.2, 0.8, value=0.5, step=0.05, label="Pace (lower = slower, calmer)"),
    ],
    outputs=gr.Audio(label="Result (use the download button to save)"),
    title="Character Voice",
    flagging_mode="never",
)

if __name__ == "__main__":
    demo.launch()
