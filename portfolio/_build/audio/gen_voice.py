# Step 1: one voice clip per caption. Spoken text = the on-screen caption text (cards: title + subtitle).
# Only pronunciation is adapted ("n8n" -> "n-eight-n", arrows -> pauses); the words are the same.
# Kokoro-82M (Apache-2.0), synthetic voice af_heart. Usage: python gen_voice.py <model-dir>
import json, os, re, sys, soundfile as sf
from kokoro_onnx import Kokoro
M = sys.argv[1] if len(sys.argv) > 1 else "."
k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
caps = json.load(open("captions.json"))
os.makedirs("lines", exist_ok=True)
def speakable(s):
    s = s.replace("n8n", "n-eight-n").replace(" → ", ", to ").replace(" — ", ", ").replace("SheetReach + ", "SheetReach plus ")
    return re.sub(r"\s+", " ", s)
dur = {}
for c in caps:
    words = (c["title"] + ". " + c["text"]) if c.get("card") else c["text"]
    a, sr = k.create(speakable(words), voice="af_heart", speed=1.0, lang="en-us")
    sf.write(f"lines/{c['id']}.wav", a, sr)
    dur[c["id"]] = round(len(a) / sr, 2)
    print(f"{c['id']:<11} {dur[c['id']]:5.2f}s")
json.dump(dur, open("durations.json", "w"), indent=1)
