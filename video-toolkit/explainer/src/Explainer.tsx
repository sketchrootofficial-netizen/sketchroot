import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import timeline from '../public/timeline.json';
import hugoMeta from '../public/paint/hugo/meta.json';
import ramuMeta from '../public/paint/ramu/meta.json';
import dalMeta from '../public/paint/dal/meta.json';
import henMeta from '../public/paint/hen/meta.json';
import abkariMeta from '../public/paint/abkari/meta.json';
import hulliganMeta from '../public/paint/hulligan/meta.json';
import blairMeta from '../public/paint/blair/meta.json';
import catMeta from '../public/paint/cat/meta.json';
import heroMeta from '../public/paint/hero/meta.json';

export const FPS = 30;
const INK = '#272525', AMBER = '#F6B31E', PAPER = '#FCFBF7', BLUE = '#1E88E5', DEEP = '#14171c', RED = '#E5483F';
const W = 1080;

type Line = {scene: string; cue?: string; cap: string; say: string; start: number; end: number; i: number};
const LINES = timeline.lines as Line[];
// keep in step with SCENES in mix.py (the whooshes land on these)
const SCENES = ['hook', 'problem', 'loci', 'kitchen', 'idea', 'kada', 'recall', 'compare', 'cta'];
const sceneStart = (s: string) => (s === SCENES[0] ? 0 : LINES.find(l => l.scene === s)!.start - 0.35);
const sceneEnd = (s: string) => {
  const i = SCENES.indexOf(s);
  return i === SCENES.length - 1 ? timeline.duration : sceneStart(SCENES[i + 1]);
};
const cue = (c: string) => LINES.find(l => l.cue === c)!;
const lineOf = (scene: string, n: number) => LINES.filter(l => l.scene === scene)[n];
/** time a word is spoken inside a line, estimated by its character position (same rule as mix.py) */
const wordAt = (l: Line, word: string) => {
  const k = l.cap.toLowerCase().indexOf(word.toLowerCase());
  return l.start + (l.end - l.start) * Math.max(0, k) / l.cap.length;
};

// punch words: giant word + impact sound (mix.py PUNCH) + screen shake
const PUNCH: {t: number; text: string; color?: string}[] = [
  {t: wordAt(cue('blank'), 'Blank'), text: 'BLANK.', color: RED},
  {t: wordAt(cue('places'), 'place'), text: 'PLACES', color: AMBER},
  {t: wordAt(cue('hugoTag'), 'Obwegesser'), text: 'OBWEGESSER'},
  {t: wordAt(cue('dalTag'), 'Dal Pont'), text: 'DAL PONT'},
  {t: wordAt(cue('henTag'), 'Hunsuck'), text: 'HUNSUCK'},
  {t: wordAt(cue('abkariTag'), 'Epker'), text: 'EPKER'},
  {t: wordAt(cue('bsso'), 'BSSO'), text: 'BSSO', color: AMBER},
  {t: wordAt(cue('a1'), 'Hunsuck'), text: 'HUNSUCK!', color: '#2FBF71'},
  {t: wordAt(cue('a2'), 'Epker'), text: 'EPKER!', color: '#2FBF71'},
];
const KEYWORDS = /(obwegesser|dal pont|hunsuck|epker|bsso|sagittal|vertical buccal|inner cut|stripping|blank|places?|loci|sketchroot|neet|retrieve|picture|1957|1961|1968|1977)/i;

const ease = Easing.bezier(0.33, 0, 0.2, 1);
const ramp = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
const useT = () => useCurrentFrame() / FPS;

// ---------- shared pieces ----------
const Fonts = () => (
  <style>{`
@font-face{font-family:Karla;src:url(${staticFile('karla-latin.woff2')}) format("woff2");font-weight:200 800}
@font-face{font-family:Caveat;src:url(${staticFile('caveat-full.woff2')}) format("woff2")}
`}</style>
);
const hand: React.CSSProperties = {fontFamily: 'Caveat, cursive', fontWeight: 700};

const Pop: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties; from?: number}> = ({at, children, style, from = 40}) => {
  const {fps} = useVideoConfig();
  const f = useCurrentFrame();
  const p = spring({frame: f - at * fps, fps, config: {damping: 13, mass: 0.55}});
  return <div style={{opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * from}px) scale(${0.9 + 0.1 * p})`, ...style}}>{children}</div>;
};

/** visible only between a and b, with fades */
const Span: React.FC<{a: number; b: number; children: React.ReactNode; fade?: number}> = ({a, b, children, fade = 0.25}) => {
  const t = useT();
  if (t < a - 0.01 || t > b + 0.01) return null;
  const o = Math.min(ramp(t, a, a + fade), 1 - ramp(t, b - fade, b));
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

const Kicker: React.FC<{children: React.ReactNode; at: number; color?: string}> = ({children, at, color = INK}) => (
  <Pop at={at} style={{position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center'}}>
    <span style={{fontSize: 30, fontWeight: 800, letterSpacing: 6, textTransform: 'uppercase', color, borderBottom: `5px solid ${AMBER}`, paddingBottom: 6}}>{children}</span>
  </Pop>
);

/** Sketchy-style two-part label: blue title + white detail */
const Label: React.FC<{x: number; y: number; title: string; detail: string; at: number}> = ({x, y, title, detail, at}) => (
  <Pop at={at} from={20} style={{position: 'absolute', left: Math.max(30, Math.min(x, W - 660)), top: y, boxShadow: '0 10px 30px rgba(0,0,0,.3)', borderRadius: 10, overflow: 'hidden', border: `3px solid ${BLUE}`}}>
    <div style={{background: BLUE, color: 'white', fontSize: 36, fontWeight: 800, padding: '8px 20px'}}>{title}</div>
    <div style={{background: 'white', color: INK, fontSize: 32, fontWeight: 700, padding: '8px 20px'}}>{detail}</div>
  </Pop>
);

const BigWords = () => {
  const t = useT();
  const p = PUNCH.find(x => t >= x.t - 0.05 && t < x.t + 1.15);
  if (!p) return null;
  const k = spring({frame: (t - p.t) * FPS, fps: FPS, config: {damping: 9, mass: 0.5}});
  const out = ramp(t, p.t + 0.85, p.t + 1.15);
  const size = p.text.length > 8 ? 128 : 170;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 1180, textAlign: 'center', opacity: 1 - out, transform: `scale(${2.1 - 1.1 * k}) rotate(-4deg)`}}>
      <span style={{fontSize: size, fontWeight: 800, letterSpacing: -2, color: p.color ?? 'white', WebkitTextStroke: `10px ${INK}`, paintOrder: 'stroke fill', textShadow: '0 12px 0 rgba(0,0,0,.35)'}}>{p.text}</span>
    </div>
  );
};

/** small camera shake right after each punch word */
const useShake = () => {
  const t = useT();
  const p = PUNCH.find(x => t >= x.t && t < x.t + 0.3);
  if (!p) return 'none';
  const a = 14 * (1 - (t - p.t) / 0.3);
  return `translate(${Math.sin(t * 90) * a}px, ${Math.cos(t * 73) * a}px)`;
};

// ---------- captions ----------
const Captions = () => {
  const t = useT();
  const l = LINES.find(x => t >= x.start - 0.1 && t < x.end + 0.5);
  if (!l) return null;
  const words = l.cap.split(' ');
  const total = l.cap.length;
  let acc = 0;
  const o = Math.min(ramp(t, l.start - 0.1, l.start + 0.08), 1 - ramp(t, l.end + 0.3, l.end + 0.5));
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: 1500, display: 'flex', justifyContent: 'center', opacity: o}}>
      <div style={{background: 'rgba(20,23,28,.9)', borderRadius: 22, padding: '18px 30px', fontSize: 48, fontWeight: 800, lineHeight: 1.22, textAlign: 'center', color: 'white', maxWidth: 980}}>
        {words.map((w, i) => {
          const at = l.start + (l.end - l.start) * acc / total;
          acc += w.length + 1;
          const on = t >= at;
          const key = KEYWORDS.test(w);
          return <span key={i} style={{color: on ? (key ? AMBER : 'white') : 'rgba(255,255,255,.35)'}}>{w}{i < words.length - 1 ? ' ' : ''}</span>;
        })}
      </div>
    </div>
  );
};

// ---------- Ramu's Kada (shared by hook, kada and recall) ----------
const SH = 1000, SW = 1774 * SH / 887; // scene drawn 1000 px tall
const SS = SH / 887; // source px -> scene px
type Meta = {x: number; y: number; w: number; h: number; frames: number};
const META: Record<string, Meta> = {hulligan: hulliganMeta, blair: blairMeta, cat: catMeta, hugo: hugoMeta, dal: dalMeta, hen: henMeta, abkari: abkariMeta, ramu: ramuMeta};
const TAUGHT = ['ramu', 'hugo', 'dal', 'hen', 'abkari'];
const centre = (n: string) => {const m = META[n]; return {x: (m.x + m.w / 2) * SS, y: (m.y + m.h / 2) * SS};};
type Cam = {x: number; y: number; z: number};
const SCREEN_CY = 860;
const camAt = (t: number, keys: [number, Cam, number?][]): Cam => {
  let c = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [tk, ck, d = 0.9] = keys[i];
    const p = ramp(t, tk, tk + d);
    if (p <= 0) break;
    c = {x: c.x + (ck.x - c.x) * p, y: c.y + (ck.y - c.y) * p, z: c.z + (ck.z - c.z) * p};
  }
  // never show past the edges of the painting once it fills the width
  const half = W / 2 / c.z;
  return half * 2 <= SW ? {...c, x: Math.min(Math.max(c.x, half), SW - half)} : {...c, x: SW / 2};
};
const toScreen = (c: Cam, x: number, y: number) => ({x: W / 2 + (x - c.x) * c.z, y: SCREEN_CY + (y - c.y) * c.z});

const Painted: React.FC<{name: string; start: number; t: number; speed?: number; grey?: number; glow?: number}> = ({name, start, t, speed = 1, grey = 0, glow = 0}) => {
  const m = META[name];
  const f = Math.floor((t - start) * FPS * speed);
  if (f < 0) return null;
  const idx = Math.min(m.frames - 1, f);
  const done = f >= m.frames;
  const breathe = done ? 1 + 0.01 * Math.sin((t - start) * 2.6 + m.x) : 1;
  return (
    <Img src={staticFile(`paint/${name}/${String(idx).padStart(4, '0')}.png`)}
      style={{position: 'absolute', left: m.x * SS, top: m.y * SS, width: m.w * SS, height: m.h * SS,
        transform: `scaleY(${breathe})`, transformOrigin: '50% 100%',
        filter: `grayscale(${grey}) ${glow ? `drop-shadow(0 0 ${22 * glow}px rgba(246,179,30,${glow}))` : ''}`}} />
  );
};

const Shop: React.FC<{cam: Cam; t: number; chars: {name: string; start: number; speed?: number}[]; grey?: number; blur?: number; highlight?: string[]; hl?: number}> =
  ({cam, t, chars, grey = 0, blur = 0, highlight = [], hl = 0}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: SW, height: SH, transformOrigin: '0 0',
    transform: `translate(${W / 2 - cam.x * cam.z}px, ${SCREEN_CY - cam.y * cam.z}px) scale(${cam.z})`}}>
    <div style={{position: 'absolute', inset: 0, filter: `grayscale(${grey}) blur(${blur}px) brightness(${1 - grey * 0.35})`}}>
      <Img src={staticFile('background_empty.png')} style={{width: SW, height: SH}} />
      {chars.filter(c => !highlight.includes(c.name)).map(c => <Painted key={c.name} t={t} {...c} />)}
    </div>
    {chars.filter(c => highlight.includes(c.name)).map(c => <Painted key={c.name} t={t} {...c} grey={grey * (1 - hl)} glow={hl} />)}
  </div>
);
const kadaChars = () => TAUGHT.map(n => ({name: n, start: cue(n).start - 0.15, speed: 1.3}));
const Vignette = () => <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,23,28,.95) 0%, rgba(20,23,28,0) 20%, rgba(20,23,28,0) 68%, rgba(20,23,28,.95) 82%)'}} />;

// ---------- scenes ----------
const Hook = () => {
  const t = useT();
  const order = ['hulligan', 'blair', 'cat', 'hugo', 'dal', 'hen', 'abkari', 'ramu'];
  const chars = order.map((n, i) => ({name: n, start: 0.05 + i * 0.42, speed: 2.4}));
  const l2 = lineOf('hook', 1), om = cue('oneMin');
  const cam = camAt(t, [
    [0, {x: 520, y: 520, z: 1.25}],
    [0.3, {x: SW - 560, y: 520, z: 1.25}, 3.6],
    [l2.start, {x: SW / 2, y: 520, z: 0.78}, 1.0],
  ]);
  const four = TAUGHT.slice(1);
  const hl = ramp(t, l2.start + 0.3, l2.start + 0.8);
  return (
    <AbsoluteFill style={{background: DEEP}}>
      <AbsoluteFill style={{overflow: 'hidden'}}><Shop cam={cam} t={t} chars={chars} grey={0.75 * hl} highlight={four} hl={hl} /></AbsoluteFill>
      <Vignette />
      <Pop at={0.1} style={{position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{color: AMBER, fontSize: 32, fontWeight: 800, letterSpacing: 5}}>NEET MDS · INI CET · INBDE</div>
        <div style={{color: 'white', fontSize: 84, fontWeight: 800, lineHeight: 1.0, marginTop: 6}}>Every BSSO question<br />in <span style={{color: AMBER}}>one picture</span></div>
      </Pop>
      <Pop at={om.start} style={{position: 'absolute', top: 1260, left: 0, right: 0, textAlign: 'center'}}>
        <span style={{background: AMBER, color: INK, fontSize: 64, fontWeight: 800, padding: '12px 40px', borderRadius: 999}}>⏱ 60 seconds</span>
      </Pop>
    </AbsoluteFill>
  );
};

const Problem = () => {
  const t = useT();
  const s = sceneStart('problem');
  const bl = PUNCH[0].t, l3 = lineOf('problem', 2);
  const names = [['Obwegeser', 'sagittal split', '1957'], ['Dal Pont', 'vertical buccal cut', '1961'], ['Hunsuck', 'short medial cut', '1968'], ['Epker', 'minimal stripping', '1977']];
  const gone = ramp(t, bl - 0.1, bl + 0.25);
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <Kicker at={s + 0.1}>Be honest</Kicker>
      <div style={{position: 'absolute', left: 110, top: 300, width: 860, background: 'white', borderRadius: 18, boxShadow: '0 30px 60px rgba(0,0,0,.12)', padding: '40px 50px', transform: `rotate(-1.5deg)`}}>
        <div style={{fontSize: 38, fontWeight: 800, color: INK}}>OMFS · Orthognathic surgery</div>
        <div style={{fontSize: 26, color: '#888', marginBottom: 20}}>Ramus osteotomies: read 5 times ✓✓✓✓✓</div>
        {names.map(([n, d, y], i) => (
          <Pop key={i} at={s + 0.5 + i * 0.35} style={{display: 'flex', justifyContent: 'space-between', fontSize: 40, padding: '18px 0', borderTop: '2px solid #eee', opacity: 1 - gone * 0.96, filter: `blur(${gone * 12}px)`}}>
            <b style={{color: INK}}>{n}</b><span style={{color: '#666'}}>{d}</span><span style={{color: BLUE, fontWeight: 800}}>{y}</span>
          </Pop>
        ))}
      </div>
      <div style={{position: 'absolute', inset: 0, background: `rgba(255,255,255,${0.6 * gone * (1 - ramp(t, l3.start, l3.start + 0.3))})`}} />
      <Pop at={l3.start + 0.1} style={{position: 'absolute', left: 70, right: 70, top: 920, textAlign: 'center', fontSize: 74, fontWeight: 800, color: INK, lineHeight: 1.1}}>
        Not a <s style={{color: '#999'}}>you</s> problem.<br />A <span style={{background: AMBER, padding: '0 14px', borderRadius: 8}}>textbook</span> problem.
      </Pop>
    </AbsoluteFill>
  );
};

const Column: React.FC<{x: number; draw: number}> = ({x, draw}) => {
  const d = `M${x} 1240 L${x} 640 M${x + 90} 640 L${x + 90} 1240 M${x + 30} 1240 L${x + 30} 650 M${x + 60} 650 L${x + 60} 1240 M${x - 25} 640 L${x + 115} 640 M${x - 35} 610 L${x + 125} 610 M${x - 25} 1240 L${x + 115} 1240 M${x - 35} 1270 L${x + 125} 1270`;
  return <path d={d} stroke="#e9dfc9" strokeWidth={6} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />;
};

const Loci = () => {
  const t = useT();
  const s = sceneStart('loci');
  const l2 = cue('places'), l3 = lineOf('loci', 2);
  const draw = ramp(t, s + 0.1, s + 1.8);
  return (
    <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #3a3226, #15120e 75%)'}}>
      <Kicker at={s + 0.1} color="#e9dfc9">Rome · 2,000 years ago</Kicker>
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <path d="M120 600 L540 420 L960 600 Z" stroke="#e9dfc9" strokeWidth={6} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} strokeLinejoin="round" />
        {[150, 400, 650, 860].map((x, i) => <Column key={i} x={x - 30} draw={ramp(t, s + 0.2 + i * 0.18, s + 1.6 + i * 0.18)} />)}
        <path d="M80 1300 L1000 1300" stroke="#e9dfc9" strokeWidth={6} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      </svg>
      <Pop at={s + 0.5} style={{position: 'absolute', top: 470, left: 0, right: 0, textAlign: 'center', color: '#e9dfc9', fontSize: 40, fontWeight: 800, letterSpacing: 3}}>HOUR-LONG SPEECHES · NO NOTES</Pop>
      <Pop at={wordAt(l2, 'The method')} style={{position: 'absolute', top: 780, left: 60, right: 60, textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: 108, color: '#f6eedb', textShadow: '0 6px 30px rgba(0,0,0,.6)', lineHeight: 1.05}}>The Method<br />of Loci</Pop>
      <Pop at={l3.start} style={{position: 'absolute', top: 1050, left: 0, right: 0, textAlign: 'center', fontSize: 50, fontWeight: 800, color: '#f6eedb'}}>
        <s style={{color: '#9b8f75'}}>lists</s> &nbsp;→&nbsp; <span style={{color: '#15120e', background: AMBER, padding: '0 18px', borderRadius: 10}}>places</span>
      </Pop>
    </AbsoluteFill>
  );
};

const Pin: React.FC<{x: number; y: number; at: number; label: string}> = ({x, y, at, label}) => {
  const t = useT();
  const p = spring({frame: (t - at) * FPS, fps: FPS, config: {damping: 10}});
  if (t < at) return null;
  return (
    <div style={{position: 'absolute', left: x - 34, top: y - 96 - (1 - p) * 160, opacity: Math.min(1, p * 2), textAlign: 'center'}}>
      <svg width={68} height={90} viewBox="0 0 68 90"><path d="M34 88 C34 88 4 52 4 33 A30 30 0 0 1 64 33 C64 52 34 88 34 88 Z" fill={RED} stroke="white" strokeWidth={5} /><circle cx={34} cy={33} r={11} fill="white" /></svg>
      <div style={{position: 'absolute', top: -58, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', ...hand, fontSize: 52, color: INK}}>{label}</div>
    </div>
  );
};

const Kitchen = () => {
  const t = useT();
  const s = sceneStart('kitchen');
  const l1 = lineOf('kitchen', 0), l2 = lineOf('kitchen', 1);
  const draw = ramp(t, s + 0.05, s + 1.6);
  const dash = (o: number) => ({pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - Math.min(1, Math.max(0, draw * 1.4 - o))});
  const st = {stroke: INK, strokeWidth: 6, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <Kicker at={s + 0.1}>You already do this</Kicker>
      <Span a={s} b={l2.start}><Pop at={s + 0.2} style={{position: 'absolute', top: 220, left: 60, right: 60, textAlign: 'center', fontSize: 80, fontWeight: 800, color: INK, lineHeight: 1.05}}>Your kitchen<br />at home</Pop></Span>
      <svg width={1080} height={1920} style={{position: 'absolute', top: 190}}>
        <path d="M110 560 L970 560 M110 860 L970 860" {...st} {...dash(0)} />
        <path d="M80 1230 L1000 1230 L1000 1290 L80 1290 Z" {...st} fill="#efe6d4" {...dash(0.1)} />
        <path d="M200 556 L200 450 Q200 430 220 430 L300 430 Q320 430 320 450 L320 556" {...st} {...dash(0.2)} />
        <path d="M195 430 L325 430 L325 400 L195 400 Z" {...st} fill="#e9e1d2" {...dash(0.25)} />
        <text x={260} y={505} textAnchor="middle" fontSize={34} fontWeight={800} fill={INK} opacity={draw}>SALT</text>
        {[430, 520, 610].map((x, i) => <rect key={i} x={x} y={480} width={70} height={76} rx={10} {...st} fill={['#e8b64a', '#c9584c', '#6a8f4e'][i]} {...dash(0.3 + i * 0.05)} />)}
        <path d="M720 856 L720 720 L860 720 L860 856" {...st} fill="#2f8c8c" {...dash(0.35)} />
        <path d="M710 720 L870 720 L870 690 L710 690 Z" {...st} fill="#2a6f6f" {...dash(0.4)} />
        <text x={790} y={800} textAnchor="middle" fontSize={36} fontWeight={800} fill="white" opacity={draw}>TEA</text>
        <path d="M160 856 L160 760 L380 760 L380 856" {...st} {...dash(0.4)} />
        <path d="M330 1226 L330 1060 Q330 1030 360 1030 L600 1030 Q630 1030 630 1060 L630 1226" {...st} fill="#cfd5db" {...dash(0.45)} />
        <path d="M320 1030 L640 1030 Q640 985 600 985 L360 985 Q320 985 320 1030 Z" {...st} fill="#b8c0c8" {...dash(0.5)} />
        <path d="M470 985 L470 950 L490 950 L490 985 M630 1010 L820 990 L820 1020 L630 1040" {...st} fill="#272525" {...dash(0.55)} />
        <path d={`M480 940 q-30 -40 0 -80 q30 -40 0 -80`} {...st} stroke="#9aa3ab" opacity={0.5 + 0.5 * Math.sin(t * 4)} {...dash(0.6)} />
      </svg>
      <Pin x={260} y={590} at={wordAt(l1, 'salt')} label="salt" />
      <Pin x={480} y={1175} at={wordAt(l1, 'pressure')} label="cooker" />
      <Pin x={790} y={880} at={wordAt(l1, 'tea')} label="tea" />
      <Pop at={l2.start + 0.05} style={{position: 'absolute', left: 60, right: 60, top: 220, textAlign: 'center', fontSize: 74, fontWeight: 800, color: INK, lineHeight: 1.15}}>
        Nobody made you<br /><span style={{background: AMBER, padding: '0 14px', borderRadius: 8}}>memorise it.</span>
      </Pop>
    </AbsoluteFill>
  );
};

const Idea = () => {
  const t = useT();
  const s = sceneStart('idea'), e = sceneEnd('idea');
  const p = cue('palace'), l2 = lineOf('idea', 1);
  const f = Math.max(0, Math.min(heroMeta.frames - 1, Math.floor((t - p.start + 0.1) * FPS * 1.5)));
  const z = interpolate(t, [s, e], [1.0, 1.18]);
  const H = 1150, Wd = H * heroMeta.w / heroMeta.h;
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <div style={{position: 'absolute', top: 300, left: 0, width: 1080, height: H, overflow: 'hidden'}}>
        <Img src={staticFile(`paint/hero/${String(f).padStart(4, '0')}.png`)} style={{height: H, width: Wd, position: 'absolute', left: -(Wd - 1080) * 0.62, transform: `scale(${z})`, transformOrigin: '62% 40%'}} />
      </div>
      <Pop at={s + 0.2} style={{position: 'absolute', top: 110, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{color: INK, fontSize: 70, fontWeight: 800, lineHeight: 1.05}}>So we <span style={{...hand, fontSize: 96, color: '#c9584c'}}>paint</span> the places</div>
        <div style={{color: '#6b665d', fontSize: 38, fontWeight: 700, marginTop: 8}}>1 topic = 1 scene</div>
      </Pop>
      <Pop at={l2.start} style={{position: 'absolute', top: 1300, left: 0, right: 0, textAlign: 'center'}}>
        <span style={{...hand, fontSize: 86, color: INK, background: AMBER, padding: '0 30px', borderRadius: 14}}>every character = a fact</span>
      </Pop>
    </AbsoluteFill>
  );
};

const LABELS: {n: string; c: string; dx: number; dy: number; title: string; detail: string}[] = [
  {n: 'ramu', c: 'ramu', dx: -330, dy: -260, title: 'Ramu', detail: 'the ramus of the mandible'},
  {n: 'hugo', c: 'hugoTag', dx: -330, dy: -340, title: 'Split geyser', detail: 'Sagittal split · Obwegeser 1957'},
  {n: 'dal', c: 'dalTag', dx: -320, dy: -300, title: 'Pipe bends down', detail: 'Vertical buccal cut · Dal Pont 1961'},
  {n: 'hen', c: 'henTag', dx: -330, dy: -240, title: 'Short straw', detail: 'Short medial cut · Hunsuck 1968'},
  {n: 'abkari', c: 'abkariTag', dx: -380, dy: -250, title: 'Tiny, gentle knife', detail: 'Minimal stripping · Epker 1977'},
];

const Kada = () => {
  const t = useT();
  const s = sceneStart('kada');
  const at = (n: string, z = 1.75, dy = 0): Cam => ({...centre(n), y: centre(n).y + dy, z});
  const wide: Cam = {x: SW * 0.6, y: SH / 2, z: 0.9};
  const cam = camAt(t, [
    [s, {x: SW / 2, y: SH / 2, z: 0.78}],
    [cue('ramu').start, at('ramu', 1.6)],
    [cue('hugo').start - 0.3, at('hugo', 1.35, 20)],
    [cue('dal').start - 0.3, at('dal', 1.55, 20)],
    [cue('hen').start - 0.3, at('hen', 1.75, -30)],
    [cue('abkari').start - 0.3, at('abkari', 1.6, -20)],
    [cue('bsso').start - 0.2, wide],
  ]);
  const four = TAUGHT.slice(1);
  const hl = ramp(t, cue('bsso').start, cue('bsso').start + 0.5);
  return (
    <AbsoluteFill style={{background: DEEP}}>
      <AbsoluteFill style={{overflow: 'hidden'}}><Shop cam={cam} t={t} chars={kadaChars()} highlight={hl > 0 ? four : []} hl={hl} /></AbsoluteFill>
      <Vignette />
      <Pop at={s + 0.1} style={{position: 'absolute', top: 110, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{color: AMBER, fontSize: 30, fontWeight: 800, letterSpacing: 5}}>WATCH · RAMUS OSTEOTOMIES</div>
        <div style={{...hand, color: 'white', fontSize: 104, lineHeight: 1}}>Ramu's Kada</div>
      </Pop>
      {LABELS.map((L, i) => {
        const next = LINES[cue(L.c).i + 1];
        const a = L.n === 'ramu' ? cue('ramu').start + 1.1 : cue(L.c).start + 0.05;
        const p = toScreen(cam, centre(L.n).x + L.dx, centre(L.n).y + L.dy);
        return <Span key={i} a={a} b={next.start - 0.2}><Label x={p.x} y={Math.max(330, p.y)} at={a} title={L.title} detail={L.detail} /></Span>;
      })}
      <Span a={cue('bsso').start + 0.2} b={sceneEnd('kada')}>
        <Pop at={cue('bsso').start + 0.3} style={{position: 'absolute', top: 330, left: 40, right: 40, background: 'white', borderRadius: 20, padding: '22px 26px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,.4)'}}>
          <div style={{fontSize: 34, fontWeight: 800, color: BLUE, letterSpacing: 3}}>TODAY'S BSSO =</div>
          <div style={{fontSize: 38, fontWeight: 800, color: INK, lineHeight: 1.3}}>split + vertical buccal cut<br />+ short medial cut + gentle stripping</div>
        </Pop>
      </Span>
    </AbsoluteFill>
  );
};

const Countdown: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  if (t < a || t > b) return null;
  const p = (t - a) / (b - a);
  const n = Math.max(1, Math.ceil(3 * (1 - p)));
  const R = 110, C = 2 * Math.PI * R;
  const beat = 1 + 0.08 * Math.exp(-((t - a) * 3 / (b - a) % 1) * 6);
  return (
    <div style={{position: 'absolute', top: 1000, left: 540 - 140, width: 280, height: 280, transform: `scale(${beat})`}}>
      <svg width={280} height={280}>
        <circle cx={140} cy={140} r={R} stroke="rgba(255,255,255,.2)" strokeWidth={16} fill="rgba(20,23,28,.7)" />
        <circle cx={140} cy={140} r={R} stroke={AMBER} strokeWidth={16} fill="none" strokeDasharray={C} strokeDashoffset={C * p} transform="rotate(-90 140 140)" strokeLinecap="round" />
      </svg>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 130, fontWeight: 800}}>{n}</div>
    </div>
  );
};

const Recall = () => {
  const t = useT();
  const s = sceneStart('recall');
  const q1 = cue('q1'), a1 = cue('a1'), q2 = cue('q2'), a2 = cue('a2'), dn = cue('done');
  const wide: Cam = {x: SW * 0.6, y: SH / 2, z: 0.9};
  const isQ2 = t >= q2.start - 0.3;
  const highlight = t >= a2.start - 0.2 ? ['abkari'] : t >= a1.start - 0.2 && !isQ2 ? ['hen'] : [];
  const cam = camAt(t, [
    [s, wide],
    [a1.start - 0.3, {...centre('hen'), z: 1.6}, 0.6],
    [q2.start - 0.4, wide],
    [a2.start - 0.3, {...centre('abkari'), z: 1.5}, 0.6],
    [dn.start, wide],
  ]);
  const hl = highlight[0] === 'hen' ? ramp(t, a1.start - 0.2, a1.start + 0.4) : highlight[0] === 'abkari' ? ramp(t, a2.start - 0.2, a2.start + 0.4) : 0;
  const greyIn = ramp(t, s, s + 0.6) * (1 - ramp(t, dn.start, dn.start + 0.6));
  const qCard = (q: string, a: number, b: number) => (
    <Span a={a} b={b}><Pop at={a} style={{position: 'absolute', top: 300, left: 60, right: 60, background: 'white', borderRadius: 24, padding: '30px 40px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,.4)'}}>
      <div style={{fontSize: 30, fontWeight: 800, color: BLUE, letterSpacing: 4}}>ACTIVE RECALL · NO PEEKING</div>
      <div style={{fontSize: 66, fontWeight: 800, color: INK, lineHeight: 1.1, marginTop: 8}}>{q}</div>
    </Pop></Span>
  );
  return (
    <AbsoluteFill style={{background: DEEP}}>
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <Shop cam={cam} t={t} chars={kadaChars()} grey={greyIn} blur={greyIn * 4 * (highlight.length ? 1 - hl * 0.5 : 1)} highlight={highlight} hl={hl} />
      </AbsoluteFill>
      <Pop at={s + 0.05} style={{position: 'absolute', top: 140, left: 0, right: 0, textAlign: 'center', color: AMBER, fontSize: 40, fontWeight: 800, letterSpacing: 6}}>QUICK TEST</Pop>
      {qCard('Who shortened the inner cut?', q1.start, a1.end + 0.2)}
      {qCard('Who made the split gentle?', q2.start, a2.end + 0.2)}
      <Countdown a={q1.end + 0.05} b={a1.start - 0.05} />
      <Countdown a={q2.end + 0.05} b={a2.start - 0.05} />
      <Span a={dn.start} b={sceneEnd('recall')}>
        <Pop at={dn.start + 0.05} style={{position: 'absolute', top: 330, left: 0, right: 0, textAlign: 'center'}}>
          <div style={{display: 'inline-block', background: '#2FBF71', color: 'white', borderRadius: 999, width: 170, height: 170, fontSize: 120, lineHeight: '170px', fontWeight: 800}}>✓</div>
          <div style={{color: 'white', fontSize: 66, fontWeight: 800, marginTop: 20, textShadow: '0 4px 20px rgba(0,0,0,.7)'}}>You walked through a shop.</div>
        </Pop>
      </Span>
    </AbsoluteFill>
  );
};

const Compare = () => {
  const t = useT();
  const s = sceneStart('compare');
  const l0 = lineOf('compare', 0), l1 = lineOf('compare', 1), l2 = lineOf('compare', 2), sc = cue('science');
  const rows: [string, string, number, number][] = [
    ['More pages', 'One picture', l0.start, wordAt(l1, 'one picture')],
    ['Read it again', 'Tested on it', l0.start + 0.4, wordAt(l1, 'tests')],
    ['Forgotten by the exam', 'Back right before you forget', l0.start + 0.8, l2.start],
  ];
  const sci = ramp(t, sc.start - 0.2, sc.start + 0.2);
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <Kicker at={s + 0.1}>The difference</Kicker>
      <div style={{position: 'absolute', top: 250, left: 60, right: 60, display: 'flex', gap: 24, opacity: 1 - sci * 0.85}}>
        <Pop at={s + 0.1} style={{flex: 1, textAlign: 'center', fontSize: 42, fontWeight: 800, color: '#8a857c', padding: 16, borderBottom: '5px solid #cfc9bd'}}>Coaching</Pop>
        <Pop at={wordAt(l1, 'SketchRoot')} style={{flex: 1, textAlign: 'center', fontSize: 42, fontWeight: 800, color: INK, padding: 16, borderBottom: `5px solid ${AMBER}`}}>SketchRoot</Pop>
      </div>
      {rows.map(([a, b, ta, tb], i) => (
        <div key={i} style={{position: 'absolute', top: 390 + i * 210, left: 60, right: 60, display: 'flex', gap: 24, opacity: 1 - sci * 0.85}}>
          <Pop at={ta} style={{flex: 1, background: '#ebe7df', borderRadius: 18, padding: '26px', fontSize: 40, fontWeight: 700, color: '#77726a', textDecoration: t > tb ? 'line-through' : 'none', minHeight: 160, display: 'flex', alignItems: 'center'}}>{a}</Pop>
          <Pop at={tb} style={{flex: 1, background: 'white', border: `5px solid ${AMBER}`, borderRadius: 18, padding: '26px', fontSize: 42, fontWeight: 800, color: INK, minHeight: 160, display: 'flex', alignItems: 'center', boxShadow: '0 12px 30px rgba(0,0,0,.08)'}}>{b}</Pop>
        </div>
      ))}
      <Span a={sc.start - 0.1} b={sceneEnd('compare')}>
        <Pop at={sc.start} style={{position: 'absolute', top: 470, left: 80, right: 80, background: 'white', borderRadius: 14, padding: '34px 40px', boxShadow: '0 20px 50px rgba(0,0,0,.25)', transform: 'rotate(-1.5deg)', borderLeft: `14px solid ${BLUE}`}}>
          <div style={{fontSize: 30, color: '#666', fontWeight: 700}}>Maguire et al., 2003 · <i>Nature Neuroscience</i></div>
          <div style={{fontSize: 52, fontWeight: 800, color: INK, lineHeight: 1.15, marginTop: 10}}>Memory champions aren't smarter. They use <span style={{background: AMBER, padding: '0 8px'}}>places</span>.</div>
        </Pop>
      </Span>
    </AbsoluteFill>
  );
};

const Cta = () => {
  const t = useT();
  const s = sceneStart('cta');
  const cm = cue('comment'), url = cue('url');
  const pulse = 1 + 0.035 * Math.sin(t * 6);
  return (
    <AbsoluteFill style={{background: DEEP}}>
      <Pop at={s + 0.05} style={{position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 30}}>
        <Img src={staticFile('founder.jpg')} style={{width: 200, height: 200, borderRadius: '50%', border: `8px solid ${AMBER}`, objectFit: 'cover'}} />
        <div style={{color: 'white'}}>
          <div style={{fontSize: 46, fontWeight: 800}}>Dr. Jishnu Mohan</div>
          <div style={{fontSize: 30, color: AMBER, fontWeight: 800}}>AIR 1 · AIIMS PhD Entrance 2025</div>
          <div style={{fontSize: 28, color: '#cbd2db'}}>AIR 37 NEET MDS · AIR 91 INI CET</div>
        </div>
      </Pop>
      <Pop at={cm.start} style={{position: 'absolute', top: 520, left: 90, right: 90}}>
        <div style={{background: 'white', borderRadius: 30, padding: '30px 36px', position: 'relative'}}>
          <div style={{fontSize: 30, color: '#777', fontWeight: 700}}>Comment below</div>
          <div style={{fontSize: 58, color: INK, fontWeight: 800, lineHeight: 1.1}}>Which topic should we paint next?</div>
          <div style={{position: 'absolute', bottom: -30, left: 70, width: 0, height: 0, borderLeft: '30px solid transparent', borderRight: '30px solid transparent', borderTop: '34px solid white'}} />
        </div>
      </Pop>
      <Pop at={url.start - 0.1} style={{position: 'absolute', top: 900, left: 0, right: 0, textAlign: 'center'}}>
        <Img src={staticFile('logo-light.svg')} style={{width: 600}} />
        <div style={{marginTop: 40, display: 'inline-block', transform: `scale(${pulse})`, background: AMBER, color: INK, fontSize: 58, fontWeight: 800, padding: '22px 52px', borderRadius: 999}}>sketchroot.com</div>
        <div style={{color: '#cbd2db', fontSize: 34, marginTop: 26}}>Early access is open</div>
      </Pop>
    </AbsoluteFill>
  );
};

const SCENE_COMP: Record<string, React.FC> = {hook: Hook, problem: Problem, loci: Loci, kitchen: Kitchen, idea: Idea, kada: Kada, recall: Recall, compare: Compare, cta: Cta};

/** quick zoom-punch as each scene arrives */
const Arrive: React.FC<{at: number; children: React.ReactNode}> = ({at, children}) => {
  const t = useT();
  const k = spring({frame: (t - at) * FPS, fps: FPS, config: {damping: 15, mass: 0.5}});
  return <AbsoluteFill style={{transform: `scale(${1.08 - 0.08 * k})`}}>{children}</AbsoluteFill>;
};

export const Explainer: React.FC = () => {
  const t = useT();
  const shake = useShake();
  return (
    <AbsoluteFill style={{background: DEEP, fontFamily: 'Karla, sans-serif'}}>
      <Fonts />
      <Audio src={staticFile('mix.wav')} />
      <AbsoluteFill style={{transform: shake}}>
        {SCENES.map(s => {
          const C = SCENE_COMP[s];
          return <Span key={s} a={sceneStart(s)} b={sceneEnd(s) + 0.2} fade={0.2}><Arrive at={sceneStart(s)}><C /></Arrive></Span>;
        })}
        <BigWords />
      </AbsoluteFill>
      <Captions />
      <div style={{position: 'absolute', top: 0, left: 0, height: 10, width: `${(t / timeline.duration) * 100}%`, background: AMBER}} />
    </AbsoluteFill>
  );
};
