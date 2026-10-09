// Vectorise ink line-art with potrace and order the strokes for a draw-on
// animation (left-to-right bands, top-to-bottom inside each band).
// usage (from video-toolkit/ramus, after `npm install`): node ../tools/trace_ink.js ink.png ink_paths.js
const fs = require('fs'), potrace = require('potrace');
const [, , inp, out] = process.argv;
potrace.trace(inp, { turdSize: 18, optTolerance: 0.6, threshold: 128 }, (err, svg) => {
  if (err) throw err;
  const d = svg.match(/ d="([^"]*)"/)[1];
  const W = +svg.match(/width="(\d+)"/)[1];
  const items = d.split(/(?=M)/).map(s => s.trim()).filter(Boolean).map(s => {
    const n = s.match(/-?[\d.]+/g).map(Number), xs = [], ys = [];
    for (let i = 0; i < n.length - 1; i += 2) { xs.push(n[i]); ys.push(n[i + 1]); }
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    return { d: s, k: Math.floor(cx / W * 6) * 10000 + cy, size: Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys) };
  }).filter(o => o.size > 6).sort((a, b) => a.k - b.k);
  fs.writeFileSync(out, 'window.INK=' + JSON.stringify(items.map(o => o.d)) + ';');
  console.log(items.length, 'strokes ->', out);
});
