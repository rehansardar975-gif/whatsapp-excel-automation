#!/usr/bin/env bash
# Mix voice.wav + music.wav under the video (video stream copied unchanged).
# Usage: ./mix.sh <video-without-audio.mp4> <output.mp4>
set -euo pipefail
IN="${1:?input video}"; OUT="${2:?output mp4}"
DUCK="sidechaincompress=threshold=0.05:ratio=2.5:attack=40:release=700"
ffmpeg -nostdin -v error -y -i voice.wav -af "aresample=48000,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=7" -ac 1 voice48.wav
ffmpeg -nostdin -v error -y -i music.wav -af "loudnorm=I=-30:TP=-9:LRA=6" -ar 48000 music48.wav
ffmpeg -nostdin -v error -y -i music48.wav -i voice48.wav -filter_complex \
  "[1:a]asplit=2[v1][v2];[v2]aformat=channel_layouts=stereo[vsc];[0:a][vsc]$DUCK[md];[v1]aformat=channel_layouts=stereo[vst];[vst][md]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.89[out]" \
  -map "[out]" -ar 48000 mix.wav
ffmpeg -nostdin -v error -y -i "$IN" -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
rm -f voice48.wav music48.wav
