# SketchRoot video toolkit

Everything used to make SketchRoot's reels and memory-palace explainers: HTML scenes rendered frame by frame with headless Chromium, Python image tools for cut-outs, inpainting and "painting" build-ups, and ffmpeg to encode.

Nothing here is part of the website. Netlify publishes the repo root, so `netlify.toml` returns a 404 for every `/video-toolkit/*` path.

## Setup (once)

```bash
cd video-toolkit
npm install                 # playwright, roughjs, potrace, vivus
npx playwright install chromium   # skip if Chromium is already available
(cd ramus && npm install)   # the explainer loads roughjs from ramus/node_modules
python -m venv venv && venv/bin/pip install -r requirements.txt
# also needs ffmpeg on PATH
```

**Run every Python command from inside `video-toolkit/`.** The scripts use paths relative to it, such as `ramus/ramus.png` and `paint/...`.

### Files you add locally (git-ignored, never committed: this repo is public)
| File | What it is | Used by |
|---|---|---|
| `music.mp3` | NF "The Search" clip (licensed track for the reels) | `reel/render.js` |
| `reel/intro_music.wav` | The track extended for the intro video (see the intro section) | `reel/render_intro.js` |
| `story/song.mp3` | "Experience Reimagined" | `story/render.js` |
| `meme/in.mp4` | Source meme clip | `meme/render.js` |

### Model weights (download when needed)
| Weights | Save to | Source |
|---|---|---|
| LaMa inpainting `big-lama.pt` | `paint/big-lama.pt` | https://github.com/enesmsahin/simple-lama-inpainting/releases/download/v0.1.0/big-lama.pt |
| Real-ESRGAN anime 4× `RealESRGAN_x4plus_anime_6B.pth` | `story/anime6B.pth` | https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth |
| rembg u2net / isnet | auto, on first run | (downloads itself) |

---

## 1. Beat-synced reels (`reel/`)
`reel.html` is the 30 s reel: problem → beat drop → the Hugo sagittal-split recall → founder → comment hook. `intro.html` is the longer brand-intro cut.

```bash
python tools/beats.py music.mp3 > beats_out.txt   # energy profile + onset list -> copy the JSON list into reel/beats.json
node reel/render.js $PWD/out/reel.mp4 0 29.75 30          # full render
node reel/render.js $PWD/out/still.png 4.2,13.6,21.5      # stills for checking
```
- **Timing:** every scene is a block in `render(t)` inside `reel.html`. The drop is `DROP=13.30`. Change text in the HTML and times in `render(t)`.
- **Intro video:** build its music by looping the track's 8-second phrase, then render:
  ```bash
  ffmpeg -i music.mp3 -filter_complex "[0]atrim=0:26,asetpts=N/SR/TB,afade=t=out:st=25.99:d=0.01[a];[0]atrim=18:29.75,asetpts=N/SR/TB,afade=t=in:d=0.01[c];[a][c]concat=n=2:v=0:a=1" reel/intro_music.wav
  node reel/render_intro.js $PWD/out/intro.mp4 0 37.72 30
  ```

## 2. Emotional story reel (`story/`), "The Keys"
Character panels are cut from `story/sheet.png` and upscaled 4× with Real-ESRGAN (`story/panels/` already holds them). The story is the `SHOTS` / `CAPS` / `BUBS` arrays in `story.html`.
```bash
venv/bin/python story/upscale.py                 # re-cut + upscale panels (needs story/anime6B.pth)
node story/render.js $PWD/out/keys.mp4 0 98 30   # uses story/song.mp3 from 1:01
```

## 3. Meme reel template (`meme/`)
Animated, word-by-word captions over a reaction clip. Put the clip frames in `meme/frames/` with
`ffmpeg -i meme/in.mp4 -vf "crop=720:752:0:264,scale=1080:1128" -q:v 2 meme/frames/%04d.jpg` (adjust the crop to your clip), then `node meme/render.js $PWD/out/meme.mp4`.

## 4. Ramu's Kada explainer, text version (`ramus/`)
A 3:47, 1920×1080 explainer: the pencil draw-on intro, orthognathic primer, mandible map, 7 stalls with a hand-drawn mandible (rough.js) drawing each osteotomy's cuts, the modern BSSO, new stalls, comparison, recall quiz.
```bash
venv/bin/python ramus/cut.py                      # character stickers -> ramus/st_*.png + stickers.json
venv/bin/python tools/make_ink.py ramus/ramus.png ramus/ink.png
(cd ramus && node ../tools/trace_ink.js ink.png ink_paths.js)   # pencil strokes for the intro
node ramus/render.js $PWD/out/explainer.mp4       # ~20 min on a laptop
```
- **Cut lines:** the osteotomy cuts are SVG paths in the `CUTS` object (lateral view, viewBox ≈ 880×470). The scene order is the `OST` array.

## 5. Sketchy-style "painting" pipeline (`paint/`), for the voice-led videos
The style we're aiming for: one scene, empty at first, each character **painting in** (pencil → flat colour → detail) as the narrator mentions it, then **idling** gently.

| Step | Command | Output |
|---|---|---|
| Masks for every character | `venv/bin/python paint/masks.py` | `paint/mask_<name>.png`, `mask_all.png` |
| Empty background (LaMa) | `venv/bin/python paint/inpaint.py ramus/ramus.png paint/mask_all.png paint/background_empty.png` | the bare shop (already included) |
| Paint-in frames for one character | `venv/bin/python paint/painter.py ramus/ramus.png paint/mask_hugo.png,paint/mask_trauma.png paint/el_1957 120` | 120 RGBA frames + `meta.json` |
| Idle-life loop | `venv/bin/python paint/idle.py out/idle.mp4 12 1920` | 12 s seamless loop: breathing, sway, steam, the cat's tail, the hen's sip, lamp flicker, dust |

- **New scene:** make the masks (edit the boxes in `masks.py`), inpaint the background, run `painter.py` per character, and tune the motion in `idle.py` (the `CHAR` dict, plus `bend()` for tails and `nudge()` for heads).
- **Narration:** `docs/ramus-kada-narration-script.md` is the voice script with `[ADD]`, `[CAM]`, `[ARROW]` and `[BOX]` cues for the edit.

## 6. "How SketchRoot works" explainer reel (`explainer/`, Remotion)
A 2:02, 1080×1920 reel in the style of Sketchy's "how it works" video, cut for a low skip rate. The order is:
1. **Hook:** the whole of Ramu's Kada paints in within 4 seconds, with "Four strange customers in this shop are every BSSO question you'll face in NEET MDS. Give me one minute."
2. **Problem:** you've read these names five times, and in the exam hall it's BLANK.
3. **The method of loci:** places, not lists.
4. **Your kitchen:** you already do this.
5. **The palace:** the mountain palace paints in.
6. **The example:** Ramu, then Hugo/Obwegesser, Dal/Dal Pont, the hen/Hunsuck and Abkari/Epker each paint in on first mention, with a label and a punch-word, and the scene ends on "that's today's BSSO".
7. **Recall test:** two questions with a ticking 3-2-1.
8. **Coaching vs SketchRoot:** with Maguire 2003.
9. **Founder, then the comment hook and early access.**

- **Narration:** Kokoro v1.0 TTS through sherpa-onnx, voice 33 (`hm_omega`, Indian English), at speed 1.15. The script is `explainer/script.json`. `cap` is the on-screen caption and `say` is the spelling the voice reads: "geezer" for geyser, "Obvegesser", "Daal", "low kai" for loci, and "a fact to remember", because a bare "fact" came out sounding like a slur. `cue` names a moment the visuals react to, and `pause` adds silence after a line (each recall question gets 3 s).
- **Music and sound effects:** `mix.py` synthesizes everything, so no licensed audio is used. The bed is a 118 BPM groove in D (marimba hook, plucked chords, bass, drums, a tabla figure) that drops to a pad during the recall countdowns. The effects are whooshes, pencil scratch, pops, impacts on punch words, ticks and a ding. The music ducks under the voice, and the result is written to `public/mix.wav`.
- **Timing:** everything is keyed to `public/timeline.json`, which `tts.py` writes. Edit the script, re-run `prepare.sh`, and the whole reel re-times itself. `PUNCH` in `src/Explainer.tsx` and in `mix.py` must name the same words.
- **Models:** Hugging Face is blocked in the cloud sessions, so the models come from the sherpa-onnx GitHub releases: TTS `tts-models/kokoro-multi-lang-v1_0.tar.bz2`, and speech-to-text `asr-models/sherpa-onnx-whisper-base.en.tar.bz2` for checking pronunciation and transcribing reference videos. Install with `pip install sherpa-onnx scikit-image scipy`.

```bash
cd explainer && npm install
./prepare.sh /path/to/kokoro-multi-lang-v1_0   # narration, music mix, timeline, paint-in frames, assets -> public/
npx remotion studio src/index.ts               # preview and scrub
node render.mjs ../out/sketchroot-explainer.mp4          # full render (~12 min on 4 cores)
node render.mjs ../out/s.png --stills=12,60,90           # stills for checking
```
- **Your own voice:** record `public/narration.wav`, put your line timings into `public/timeline.json` (running the sherpa Whisper model over the recording gives you them), then run `python3 mix.py`.
- `render.mjs` uses the Playwright headless shell in `/opt/pw-browsers`. Set `CHROME=` to use another browser.

## 7. Sticker cut-outs (`tools/`)
- `tools/cut_character_sticker.py`: the student with the SketchRoot book, from `reel/hero.jpg`
- `tools/cut_hugo_sticker.py u2net`: Hugo with the split geyser, from the Ramu's Kada sketch

---

## Optional heavier tools (need a GPU, or network access to Google Drive or Hugging Face)
- **Neural stroke painting:** [Paint Transformer (PyTorch)](https://github.com/Huage001/PaintTransformer), [LearningToPaint](https://github.com/hzwer/ICCV2019-LearningToPaint). Their weights are on Google Drive; run them on Colab.
- **Face life (blinks, smiles):** LivePortrait. **Image-to-video:** Wan 2.2 (5B), LTX-Video, FramePack. Or Kling or Runway with Motion Brush on single character stickers.
- **Hand-drawn diagrams skill:** https://github.com/muthuishere/hand-drawn-diagrams (clone into `~/.claude/skills/`).
- **Claude Code cloud sessions:** to let them download these, add `huggingface.co`, `*.huggingface.co`, `*.hf.co`, `drive.google.com`, `drive.usercontent.google.com` and `dl.fbaipublicfiles.com` to the environment's allowed domains.

## Docs
- `docs/ramus-kada-narration-script.md`: the voice-over script with edit cues
- `docs/ramus-kada-new-stalls.md`: new wordplay characters and image prompts for the orthognathic module
- `explainer/script.json`: the explainer reel narration (section 6)
- `docs/notes.md`: decisions, research sources and the content checks still open
