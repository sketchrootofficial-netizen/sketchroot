#!/usr/bin/env bash
# Render the full video in N parallel segments, then join them.  Usage: bash socransky/render_parallel.sh [jobs] [fps]
set -euo pipefail
cd "$(dirname "$0")/.."
J=${1:-$(nproc)}; F=${2:-30}; mkdir -p out/parts
D=$(node -e "console.log(require('./socransky/beats.js').DURATION)")
: > out/parts/list.txt
for ((k=0;k<J;k++)); do
  a=$(node -e "console.log((Math.round($D*$k/$J*$F)/$F).toFixed(4))"); b=$(node -e "console.log((Math.round($D*($k+1)/$J*$F)/$F).toFixed(4))")
  node socransky/render.js "$PWD/out/parts/p$k.mp4" "" "$F" "$a" "$b" 2> "out/parts/p$k.log" &
  echo "file 'p$k.mp4'" >> out/parts/list.txt
done
wait
ffmpeg -y -v error -f concat -safe 0 -i out/parts/list.txt -c copy -movflags +faststart out/socransky.mp4
echo "done: out/socransky.mp4"
