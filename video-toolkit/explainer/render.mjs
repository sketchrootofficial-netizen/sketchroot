// node render.mjs [out.mp4] [--stills=12.5,60]  (run from explainer/)
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
const args = process.argv.slice(2);
const out = path.resolve(args.find(a => !a.startsWith('--')) ?? '../out/sketchroot-explainer.mp4');
const stills = args.find(a => a.startsWith('--stills='))?.slice(9);
// Chromium that ships in the container / with Playwright; Remotion would otherwise download its own
const browserExecutable = process.env.CHROME ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'Explainer', browserExecutable});
if (stills) {
  for (const s of stills.split(',')) {
    const frame = Math.round(+s * composition.fps);
    await renderStill({serveUrl, composition, frame, output: out.replace(/\.\w+$/, `_${s}.png`), browserExecutable});
  }
} else {
  await renderMedia({serveUrl, composition, codec: 'h264', crf: 18, outputLocation: out, browserExecutable,
    concurrency: Number(process.env.CONC ?? 4),
    onProgress: ({progress}) => process.stdout.write(`\r${(progress * 100).toFixed(1)}%`)});
  console.log('\n' + out);
}
