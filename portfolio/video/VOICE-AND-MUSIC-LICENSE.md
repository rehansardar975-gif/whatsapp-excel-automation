# Voice and music licence record — P07 demo video

File: `P07-sheetreach-n8n-demo.mp4`, 2 min 14 s, 1440×900, H.264 + AAC stereo.

## Voiceover
- **Model:** Kokoro-82M, an open-weight text-to-speech model, licence **Apache-2.0** (commercial use allowed).
- **Runtime:** `kokoro-onnx` 0.6.1 (MIT). Model files `kokoro-v1.0.onnx` and `voices-v1.0.bin` come from the GitHub release `thewh1teagle/kokoro-onnx` → `model-files-v1.0`.
- **Voice:** `af_heart`, a built-in synthetic voice (the same voice as P05 and P06). It is not a clone of any real person or celebrity.
- **Text:** exactly the on-screen subtitles (`portfolio/_build/audio/captions.json`). Only pronunciation is adapted: "n8n" is spoken as "n-eight-n" and arrows (→) as "to". The words are the same.
- **Sync:** each line starts 0.2 s after its subtitle appears. Appearance times were measured from the video frames (`sync.py`), and every line ends before the next subtitle.

## Background music
- **Original composition**, generated in code for this video (`portfolio/_build/audio/music.py`): a soft pad (Dmaj9 → Bm7 → Gmaj7 → A6sus) with a quiet bell arpeggio at 72 bpm.
- No samples, loops, recordings or third-party music were used, so no licence from anyone else is needed.

## Mix
- Voice normalised to −16 LUFS; music at −30 LUFS and ducked further under the voice (`mix.sh`).
- Measured on the final file: −15.1 LUFS integrated, peak −3.1 dBFS.

## Footage
Screen recording of the real running apps (SheetReach + self-hosted n8n 2.42.4) with fictional sample data. Three silent stretches were cut: page loading, the end of the processing wait and one navigation. Nothing on screen was staged or painted in.
