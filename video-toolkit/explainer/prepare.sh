#!/usr/bin/env bash
# Build everything the Remotion composition reads from public/ (run from video-toolkit/explainer).
# usage: ./prepare.sh <kokoro-multi-lang-v1_0 dir>   (sherpa-onnx TTS model, see README section 6)
set -e
K=${1:?path to kokoro-multi-lang-v1_0}
cd "$(dirname "$0")"
mkdir -p public/paint
cp ../paint/background_empty.png ../reel/founder.jpg ../reel/logo-light.svg \
   ../ramus/caveat-full.woff2 ../ramus/karla-latin.woff2 public/
python3 tts.py "$K" 33 1.15      # hm_omega, Indian English; narration.wav + timeline.json
python3 mix.py                   # music bed + sound effects + narration -> mix.wav
cd ..
for c in ramu "hugo,trauma" dal hen abkari hulligan blair cat; do
  n=${c%%,*}; m=$(echo "$c" | sed 's#\([a-z]*\)#paint/mask_\1.png#g')
  python3 paint/painter.py ramus/ramus.png "$m" explainer/public/paint/$n 105 &
done
# the mountain palace paints itself in too: whole image, downscaled
python3 -c "
from PIL import Image
im=Image.open('reel/hero.jpg').convert('RGB').resize((1200,675),Image.LANCZOS); im.save('/tmp/hero_src.png')
Image.new('L',im.size,255).save('/tmp/hero_mask.png')"
python3 paint/painter.py /tmp/hero_src.png /tmp/hero_mask.png explainer/public/paint/hero 120 &
wait
