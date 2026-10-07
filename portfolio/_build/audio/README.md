# Video audio build (voiceover + music)

The model files (about 350 MB) are not committed.
1. `pip install kokoro-onnx==0.6.1 soundfile numpy`. Download `kokoro-v1.0.onnx` and `voices-v1.0.bin` (GitHub release `thewh1teagle/kokoro-onnx` → `model-files-v1.0`).
2. `python gen_voice.py <model-dir>`: one clip per subtitle in `captions.json` → `lines/*.wav` + `durations.json`.
3. Record: `node e2e/record-demo.mjs <workflowId>`. Subtitles come from `captions.json` and each stays on screen for its clip's length.
4. `python sync.py <recorded.mp4> <cut ranges…>`: finds when each subtitle really appears (from the pixels), writes `voice.wav` and `cuts.txt`.
5. `ffmpeg -i recorded.mp4 -filter_complex "$(cat cuts.txt)" -map "[out]" silent.mp4`, then `python music.py` (set DUR to the video length) and `./mix.sh silent.mp4 final.mp4`.

Licences: `../../video/VOICE-AND-MUSIC-LICENSE.md`.
