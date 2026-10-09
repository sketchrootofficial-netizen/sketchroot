#!/usr/bin/env bash
# Build everything the Remotion composition reads from public/ (run from video-toolkit/explainer).
# usage: ./prepare.sh <kokoro-en-v0_19 dir>   (sherpa-onnx TTS model, see README section 6)
set -e
K=${1:?path to kokoro-en-v0_19}
cd "$(dirname "$0")"
mkdir -p public/paint
cp ../paint/background_empty.png ../reel/founder.jpg ../reel/hero.jpg ../reel/logo-light.svg \
   ../ramus/caveat-full.woff2 ../ramus/karla-latin.woff2 public/
python3 tts.py "$K" 6 1.02          # narration.wav + timeline.json from script.json
cd ..
for c in ramu "hugo,trauma" dal hen; do
  n=${c%%,*}; m=$(echo "$c" | sed 's#\([a-z]*\)#paint/mask_\1.png#g')
  python3 paint/painter.py ramus/ramus.png "$m" explainer/public/paint/$n 105 &
done
wait
