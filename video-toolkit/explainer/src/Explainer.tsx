import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import timeline from '../public/timeline.json';
import hugoMeta from '../public/paint/hugo/meta.json';
import ramuMeta from '../public/paint/ramu/meta.json';
import dalMeta from '../public/paint/dal/meta.json';
import henMeta from '../public/paint/hen/meta.json';

export const FPS = 30;
const INK = '#272525', AMBER = '#F6B31E', PAPER = '#FCFBF7', BLUE = '#1E88E5', DEEP = '#14171c';
const W = 1080;

type Line = {scene: string; cue?: string; cap: string; say: string; start: number; end: number; i: number};
const LINES = timeline.lines as Line[];
const SCENES = ['hook', 'coaching', 'loci', 'kitchen', 'idea', 'kada', 'recall', 'compare', 'science', 'founder', 'cta'];
const sceneStart = (s: string) => {
  const i = SCENES.indexOf(s);
  return i === 0 ? 0 : LINES.find(l => l.scene === s)!.start - 0.35;
};
const sceneEnd = (s: string) => {
  const i = SCENES.indexOf(s);
  return i === SCENES.length - 1 ? timeline.duration : sceneStart(SCENES[i + 1]);
};
const cue = (c: string) => LINES.find(l => l.cue === c)!;
const lineOf = (scene: string, n: number) => LINES.filter(l => l.scene === scene)[n];
/** time a word is spoken inside a line, estimated by its character position */
const wordAt = (l: Line, word: string) => {
  const k = l.cap.toLowerCase().indexOf(word.toLowerCase());
  return l.start + (l.end - l.start) * Math.max(0, k) / l.cap.length;
};

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
  const p = spring({frame: f - at * fps, fps, config: {damping: 14, mass: 0.6}});
  return <div style={{opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * from}px) scale(${0.92 + 0.08 * p})`, ...style}}>{children}</div>;
};

/** visible only between a and b, with fades */
const Span: React.FC<{a: number; b: number; children: React.ReactNode; fade?: number}> = ({a, b, children, fade = 0.35}) => {
  const t = useT();
  if (t < a - 0.01 || t > b + 0.01) return null;
  const o = Math.min(ramp(t, a, a + fade), 1 - ramp(t, b - fade, b));
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

const Heading: React.FC<{children: React.ReactNode; at: number; top?: number; size?: number; color?: string}> = ({children, at, top = 230, size = 86, color = INK}) => (
  <Pop at={at} style={{position: 'absolute', top, left: 70, right: 70, textAlign: 'center', fontSize: size, fontWeight: 800, color, lineHeight: 1.05, letterSpacing: -1}}>{children}</Pop>
);

const Kicker: React.FC<{children: React.ReactNode; at: number; color?: string}> = ({children, at, color = INK}) => (
  <Pop at={at} style={{position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center'}}>
    <span style={{fontSize: 30, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase', color, borderBottom: `4px solid ${AMBER}`, paddingBottom: 6}}>{children}</span>
  </Pop>
);

/** Sketchy-style two-part label: blue title + white detail */
const Label: React.FC<{x: number; y: number; title: string; detail: string; at: number; align?: 'left' | 'right'}> = ({x, y, title, detail, at, align = 'left'}) => (
  <Pop at={at} from={20} style={{position: 'absolute', left: align === 'left' ? x : undefined, right: align === 'right' ? W - x : undefined, top: y, boxShadow: '0 10px 30px rgba(0,0,0,.25)', borderRadius: 10, overflow: 'hidden', border: `3px solid ${BLUE}`}}>
    <div style={{background: BLUE, color: 'white', fontSize: 34, fontWeight: 800, padding: '8px 18px'}}>{title}</div>
    <div style={{background: 'white', color: INK, fontSize: 30, fontWeight: 600, padding: '8px 18px'}}>{detail}</div>
  </Pop>
);

// ---------- captions ----------
const Captions = () => {
  const t = useT();
  const l = LINES.find(x => t >= x.start - 0.1 && t < x.end + 0.6);
  if (!l) return null;
  const words = l.cap.split(' ');
  const total = l.cap.length;
  let acc = 0;
  const o = Math.min(ramp(t, l.start - 0.1, l.start + 0.1), 1 - ramp(t, l.end + 0.4, l.end + 0.6));
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 1440, display: 'flex', justifyContent: 'center', opacity: o}}>
      <div style={{background: 'rgba(20,23,28,.86)', borderRadius: 22, padding: '20px 30px', fontSize: 46, fontWeight: 700, lineHeight: 1.25, textAlign: 'center', color: 'white', maxWidth: 940}}>
        {words.map((w, i) => {
          const at = l.start + (l.end - l.start) * acc / total;
          acc += w.length + 1;
          const on = t >= at;
          return <span key={i} style={{color: on ? 'white' : 'rgba(255,255,255,.38)'}}>{w}{i < words.length - 1 ? ' ' : ''}</span>;
        })}
      </div>
    </div>
  );
};

// ---------- scenes ----------
const Hook = () => {
  const t = useT();
  const l2 = lineOf('hook', 1), l3 = lineOf('hook', 2);
  const fadeLines = ramp(t, l2.start, l2.start + 1.6);
  const rows = Array.from({length: 13}, (_, i) => i);
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <Kicker at={0.2}>Why you forget</Kicker>
      {/* the textbook page */}
      <div style={{position: 'absolute', left: 170, top: 420, width: 740, height: 860, background: 'white', borderRadius: 16, boxShadow: '0 30px 60px rgba(0,0,0,.12)', padding: 50, transform: `rotate(${-2 + fadeLines * 1}deg)`}}>
        <div style={{fontSize: 40, fontWeight: 800, color: INK}}>Pharmacology · Ch. 14</div>
        <div style={{fontSize: 26, color: '#888', marginBottom: 30}}>Autonomic drugs: classification</div>
        {rows.map(i => {
          const seed = Math.sin(i * 91.7) * 0.5 + 0.5;
          const gone = interpolate(fadeLines, [seed * 0.6, seed * 0.6 + 0.4], [1, 0.06], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return <div key={i} style={{height: 18, margin: '24px 0', width: `${70 + seed * 30}%`, background: '#c9c4ba', borderRadius: 9, opacity: gone, filter: `blur(${(1 - gone) * 6}px)`}} />;
        })}
      </div>
      <Pop at={0.4} style={{position: 'absolute', left: 90, top: 250, ...hand, fontSize: 110, color: INK, transform: 'rotate(-6deg)'}}>March ✓</Pop>
      <Pop at={l2.start + 0.2} style={{position: 'absolute', right: 70, top: 1150, ...hand, fontSize: 110, color: '#d6453d', transform: 'rotate(-4deg)'}}>September ?</Pop>
      <Pop at={wordAt(l3, "It's not you")} style={{position: 'absolute', left: 0, right: 0, top: 1300, textAlign: 'center', fontSize: 70, fontWeight: 800, color: INK}}>
        It's not <span style={{background: AMBER, padding: '0 14px', borderRadius: 8}}>you</span>.
      </Pop>
    </AbsoluteFill>
  );
};

const Coaching = () => {
  const t = useT();
  const s = sceneStart('coaching');
  const l1 = lineOf('coaching', 0), l2 = lineOf('coaching', 1), l3 = lineOf('coaching', 2);
  const books = ['Coaching module 3', 'Class notes', 'PDF folder (unread)', "Senior's notes", 'Test series', 'Textbook vol. 2', 'Revision no. 4', 'Flashcards (week 3)'];
  const cols = ['#c9584c', '#3f6fb5', '#6a8f4e', '#b07a2e', '#7c5aa6', '#2f8c8c', '#a94f7a', '#5d6670'];
  const scroll = (t - l2.start) * 160;
  const dim = ramp(t, l3.start - 0.2, l3.start + 0.4);
  return (
    <AbsoluteFill style={{background: '#EEEAE1'}}>
      <Kicker at={s + 0.1}>The usual way</Kicker>
      <Heading at={s + 0.3} top={220}>More. And more.<br />And more.</Heading>
      {/* scrolling linear text behind */}
      {t > l2.start - 0.3 && (
        <div style={{position: 'absolute', inset: '440px 80px 520px 80px', overflow: 'hidden', opacity: 0.55 * ramp(t, l2.start - 0.3, l2.start + 0.4)}}>
          <div style={{transform: `translateY(${-scroll}px)`, fontSize: 25, color: '#57534c', lineHeight: 1.55, fontFamily: 'Georgia, serif'}}>
            {Array.from({length: 60}, (_, i) => <p key={i} style={{margin: '0 0 12px'}}>{i + 1}. The drug is classified as … acts on … contraindicated in … dose … adverse effects include … note the exception …</p>)}
          </div>
        </div>
      )}
      {/* the pile */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 520, display: 'flex', flexDirection: 'column-reverse', alignItems: 'center'}}>
        {books.map((b, i) => {
          const at = l1.start + 0.25 + i * ((l1.end - l1.start) / books.length);
          const p = spring({frame: (t - at) * FPS, fps: FPS, config: {damping: 12}});
          if (t < at) return null;
          return <div key={i} style={{width: 560 + ((i * 37) % 120), height: 66, background: cols[i], color: 'white', fontSize: 30, fontWeight: 700, borderRadius: 8, display: 'flex', alignItems: 'center', paddingLeft: 30, boxShadow: '0 6px 0 rgba(0,0,0,.18)', transform: `translateY(${(1 - p) * -500}px) rotate(${((i * 53) % 9) - 4}deg)`, margin: '4px 0'}}>{b}</div>;
        })}
      </div>
      <div style={{position: 'absolute', inset: 0, background: `rgba(20,23,28,${0.72 * dim})`}} />
      <Pop at={l3.start} style={{position: 'absolute', left: 80, right: 80, top: 700, textAlign: 'center', color: 'white', fontSize: 78, fontWeight: 800, lineHeight: 1.1}}>
        Your brain was never built to remember <span style={{color: AMBER}}>pages.</span>
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
  const l2 = lineOf('loci', 1), l3 = lineOf('loci', 2);
  const draw = ramp(t, s + 0.2, s + 2.6);
  return (
    <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #3a3226, #15120e 75%)'}}>
      <Kicker at={s + 0.1} color="#e9dfc9">Rome, 2,000 years ago</Kicker>
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <path d="M120 600 L540 420 L960 600 Z" stroke="#e9dfc9" strokeWidth={6} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} strokeLinejoin="round" />
        {[150, 400, 650, 860].map((x, i) => <Column key={i} x={x - 30} draw={ramp(t, s + 0.4 + i * 0.25, s + 2.4 + i * 0.25)} />)}
        <path d="M80 1300 L1000 1300" stroke="#e9dfc9" strokeWidth={6} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      </svg>
      <Pop at={s + 0.6} style={{position: 'absolute', top: 470, left: 0, right: 0, textAlign: 'center', color: '#e9dfc9', fontSize: 40, fontWeight: 700, letterSpacing: 3}}>SPEECHES · NO NOTES</Pop>
      <Pop at={wordAt(l2, 'the method')} style={{position: 'absolute', top: 800, left: 60, right: 60, textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: 104, color: '#f6eedb', textShadow: '0 6px 30px rgba(0,0,0,.6)', lineHeight: 1.05}}>The Method<br />of Loci</Pop>
      <Pop at={wordAt(l2, 'Cicero')} style={{position: 'absolute', top: 1060, left: 0, right: 0, textAlign: 'center', color: '#cbbf9f', fontSize: 34, fontStyle: 'italic', fontFamily: 'Georgia, serif'}}>as recorded by Cicero, De Oratore</Pop>
      <Pop at={l3.start + 0.3} style={{position: 'absolute', top: 1180, left: 0, right: 0, textAlign: 'center'}}>
        <span style={{...hand, fontSize: 92, color: '#15120e', background: AMBER, padding: '0 30px', borderRadius: 14}}>loci = places</span>
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
      <svg width={68} height={90} viewBox="0 0 68 90"><path d="M34 88 C34 88 4 52 4 33 A30 30 0 0 1 64 33 C64 52 34 88 34 88 Z" fill="#d6453d" stroke="white" strokeWidth={5} /><circle cx={34} cy={33} r={11} fill="white" /></svg>
      <div style={{position: 'absolute', top: -58, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', ...hand, fontSize: 52, color: INK}}>{label}</div>
    </div>
  );
};

const Kitchen = () => {
  const t = useT();
  const s = sceneStart('kitchen');
  const l2 = lineOf('kitchen', 1), l3 = lineOf('kitchen', 2);
  const draw = ramp(t, s + 0.1, s + 2.2);
  const dash = (o: number) => ({pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - Math.min(1, Math.max(0, draw * 1.4 - o))});
  const st = {stroke: INK, strokeWidth: 6, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <Kicker at={s + 0.1}>You already do this</Kicker>
      <Span a={s} b={l3.start}><Heading at={s + 0.3} top={220} size={80}>Picture the kitchen<br />at home</Heading></Span>
      <svg width={1080} height={1920} style={{position: 'absolute', top: 190}}>
        {/* shelves + counter */}
        <path d="M110 560 L970 560 M110 860 L970 860" {...st} {...dash(0)} />
        <path d="M80 1230 L1000 1230 L1000 1290 L80 1290 Z" {...st} fill="#efe6d4" {...dash(0.1)} />
        {/* salt jar on top shelf */}
        <path d="M200 556 L200 450 Q200 430 220 430 L300 430 Q320 430 320 450 L320 556" {...st} {...dash(0.2)} />
        <path d="M195 430 L325 430 L325 400 L195 400 Z" {...st} fill="#e9e1d2" {...dash(0.25)} />
        <text x={260} y={505} textAnchor="middle" fontSize={34} fontWeight={800} fill={INK} opacity={draw}>SALT</text>
        {/* spice tins */}
        {[430, 520, 610].map((x, i) => <rect key={i} x={x} y={480} width={70} height={76} rx={10} {...st} fill={['#e8b64a', '#c9584c', '#6a8f4e'][i]} {...dash(0.3 + i * 0.05)} />)}
        {/* tea tin middle shelf */}
        <path d="M720 856 L720 720 L860 720 L860 856" {...st} fill="#2f8c8c" {...dash(0.35)} />
        <path d="M710 720 L870 720 L870 690 L710 690 Z" {...st} fill="#2a6f6f" {...dash(0.4)} />
        <text x={790} y={800} textAnchor="middle" fontSize={36} fontWeight={800} fill="white" opacity={draw}>TEA</text>
        <path d="M160 856 L160 760 L380 760 L380 856" {...st} {...dash(0.4)} />
        {/* pressure cooker on counter */}
        <path d="M330 1226 L330 1060 Q330 1030 360 1030 L600 1030 Q630 1030 630 1060 L630 1226" {...st} fill="#cfd5db" {...dash(0.45)} />
        <path d="M320 1030 L640 1030 Q640 985 600 985 L360 985 Q320 985 320 1030 Z" {...st} fill="#b8c0c8" {...dash(0.5)} />
        <path d="M470 985 L470 950 L490 950 L490 985 M630 1010 L820 990 L820 1020 L630 1040" {...st} fill="#272525" {...dash(0.55)} />
        {/* steam */}
        <path d={`M480 940 q-30 -40 0 -80 q30 -40 0 -80`} {...st} stroke="#9aa3ab" opacity={0.5 + 0.5 * Math.sin(t * 4)} {...dash(0.6)} />
      </svg>
      <Pin x={260} y={590} at={wordAt(l2, 'salt')} label="salt" />
      <Pin x={480} y={1175} at={wordAt(l2, 'pressure')} label="cooker" />
      <Pin x={790} y={880} at={wordAt(l2, 'tea')} label="tea" />
      <Pop at={l3.start + 0.2} style={{position: 'absolute', left: 60, right: 60, top: 220, textAlign: 'center', fontSize: 72, fontWeight: 800, color: INK, lineHeight: 1.15}}>
        You never memorised it.<br /><span style={{background: AMBER, padding: '0 14px', borderRadius: 8}}>You know the place.</span>
      </Pop>
    </AbsoluteFill>
  );
};

const Idea = () => {
  const t = useT();
  const s = sceneStart('idea'), e = sceneEnd('idea');
  const l2 = lineOf('idea', 1);
  const z = interpolate(t, [s, e], [1.0, 1.25]);
  return (
    <AbsoluteFill style={{background: DEEP}}>
      <div style={{position: 'absolute', top: 360, left: 0, width: 1080, height: 1100, overflow: 'hidden'}}>
        <Img src={staticFile('hero.jpg')} style={{height: 1100, position: 'absolute', left: -560, transform: `scale(${z})`, transformOrigin: '60% 40%'}} />
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,23,28,1) 0%, rgba(20,23,28,0) 18%, rgba(20,23,28,0) 75%, rgba(20,23,28,1) 100%)'}} />
      </div>
      <Pop at={s + 0.2} style={{position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center'}}>
        <Img src={staticFile('logo-light.svg')} style={{width: 520}} />
      </Pop>
      <Pop at={s + 1.0} style={{position: 'absolute', top: 260, left: 0, right: 0, textAlign: 'center', color: 'white', fontSize: 62, fontWeight: 800}}>
        1 topic = <span style={{color: AMBER}}>1 scene</span>
      </Pop>
      <Pop at={l2.start} style={{position: 'absolute', top: 1260, left: 0, right: 0, textAlign: 'center'}}>
        <span style={{...hand, fontSize: 84, color: INK, background: AMBER, padding: '0 28px', borderRadius: 14}}>every character = a fact</span>
      </Pop>
    </AbsoluteFill>
  );
};

// ---------- Ramu's Kada ----------
const SH = 1000, SW = 1774 * SH / 887; // scene drawn at 1000 px tall
const SS = SH / 887; // source px -> scene px
type Meta = {x: number; y: number; w: number; h: number; frames: number};
const CH: Record<string, {meta: Meta; cue: string}> = {
  ramu: {meta: ramuMeta, cue: 'ramu'},
  hugo: {meta: hugoMeta, cue: 'hugo'},
  dal: {meta: dalMeta, cue: 'dal'},
  hen: {meta: henMeta, cue: 'hen'},
};
const centre = (n: string) => {const m = CH[n].meta; return {x: (m.x + m.w / 2) * SS, y: (m.y + m.h / 2) * SS};};
type Cam = {x: number; y: number; z: number}; // scene point at screen centre-ish, zoom
const SCREEN_CY = 860;
const camAt = (t: number, keys: [number, Cam][]): Cam => {
  let c = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [tk, ck] = keys[i];
    const p = ramp(t, tk, tk + 1.3);
    if (p <= 0) break;
    c = {x: c.x + (ck.x - c.x) * p, y: c.y + (ck.y - c.y) * p, z: c.z + (ck.z - c.z) * p};
  }
  return c;
};
const toScreen = (c: Cam, x: number, y: number) => ({x: W / 2 + (x - c.x) * c.z, y: SCREEN_CY + (y - c.y) * c.z});

const Painted: React.FC<{name: string; start: number; t: number; grey?: number; glow?: number}> = ({name, start, t, grey = 0, glow = 0}) => {
  const m = CH[name].meta;
  const f = Math.floor((t - start) * FPS);
  if (f < 0) return null;
  const idx = Math.min(m.frames - 1, f);
  const done = f >= m.frames;
  const breathe = done ? 1 + 0.008 * Math.sin((t - start) * 2.4 + m.x) : 1;
  return (
    <Img src={staticFile(`paint/${name}/${String(idx).padStart(4, '0')}.png`)}
      style={{position: 'absolute', left: m.x * SS, top: m.y * SS, width: m.w * SS, height: m.h * SS,
        transform: `scaleY(${breathe})`, transformOrigin: '50% 100%',
        filter: `grayscale(${grey}) ${glow ? `drop-shadow(0 0 ${18 * glow}px rgba(246,179,30,${glow}))` : ''}`}} />
  );
};

const Shop: React.FC<{cam: Cam; t: number; grey?: number; blur?: number; only?: string[]; highlight?: string; hl?: number}> = ({cam, t, grey = 0, blur = 0, highlight, hl = 0}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: SW, height: SH, transformOrigin: '0 0',
    transform: `translate(${W / 2 - cam.x * cam.z}px, ${SCREEN_CY - cam.y * cam.z}px) scale(${cam.z})`}}>
    <div style={{position: 'absolute', inset: 0, filter: `grayscale(${grey}) blur(${blur}px) brightness(${1 - grey * 0.35})`}}>
      <Img src={staticFile('background_empty.png')} style={{width: SW, height: SH}} />
      {Object.keys(CH).filter(n => n !== highlight).map(n => <Painted key={n} name={n} t={t} start={cue(CH[n].cue).start - 0.15} />)}
    </div>
    {highlight && <Painted name={highlight} t={t} start={cue(CH[highlight].cue).start - 0.15} grey={grey * (1 - hl)} glow={hl} />}
  </div>
);

const Kada = () => {
  const t = useT();
  const s = sceneStart('kada');
  const wide: Cam = {x: SW / 2, y: SH / 2, z: W / SW};
  const at = (n: string, z = 1.75, dy = 0): Cam => ({...centre(n), y: centre(n).y + dy, z});
  const cam = camAt(t, [
    [s, wide],
    [cue('ramu').start + 0.3, at('ramu', 1.6)],
    [cue('hugo').start - 0.3, at('hugo', 1.35, 20)],
    [cue('dal').start - 0.3, at('dal', 1.55, 20)],
    [cue('hen').start - 0.3, at('hen', 1.75, -30)],
    [cue('henTag').end - 0.6, {x: SW * 0.55, y: SH / 2, z: 0.95}],
  ]);
  const lbl = (n: string, dx: number, dy: number) => toScreen(cam, centre(n).x + dx, centre(n).y + dy);
  const r = lbl('ramu', -120, -250), h = lbl('hugo', -330, -330), d = lbl('dal', -100, 230), hn = lbl('hen', -170, -230);
  const shown = (c: string, next: string) => [cue(c).start + 0.4, cue(next).start - 0.4] as const;
  return (
    <AbsoluteFill style={{background: DEEP}}>
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <Shop cam={cam} t={t} />
      </AbsoluteFill>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,23,28,.95) 0%, rgba(20,23,28,0) 22%, rgba(20,23,28,0) 70%, rgba(20,23,28,.9) 100%)'}} />
      <Pop at={s + 0.2} style={{position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{color: AMBER, fontSize: 30, fontWeight: 700, letterSpacing: 6}}>LIVE EXAMPLE · RAMUS OSTEOTOMIES</div>
        <div style={{...hand, color: 'white', fontSize: 100, lineHeight: 1}}>Ramu's Kada</div>
      </Pop>
      <Span a={shown('ramu', 'hugo')[0] + 0.8} b={shown('ramu', 'hugo')[1]}><Label x={r.x} y={r.y} at={cue('ramu').start + 1.2} title="Ramu" detail="the ramus of the mandible" /></Span>
      <Span a={cue('hugoTag').start} b={cue('dal').start - 0.4}><Label x={Math.max(40, h.x)} y={h.y} at={cue('hugoTag').start + 0.1} title="Split geyser (Hugo + geyser)" detail="Sagittal split · Obwegeser 1957" /></Span>
      <Span a={cue('dalTag').start} b={cue('hen').start - 0.4}><Label x={Math.max(40, d.x)} y={d.y} at={cue('dalTag').start + 0.1} title="Pipe bends down (Dal)" detail="Vertical buccal cut · Dal Pont 1961" /></Span>
      <Span a={cue('henTag').start} b={cue('henTag').end - 0.4}><Label x={Math.max(40, Math.min(hn.x, 1040 - 620))} y={hn.y} at={cue('henTag').start + 0.1} title="Hen sucking a short straw" detail="Short medial cut · Hunsuck 1968" /></Span>
    </AbsoluteFill>
  );
};

const Countdown: React.FC<{a: number; b: number}> = ({a, b}) => {
  const t = useT();
  if (t < a || t > b) return null;
  const p = (t - a) / (b - a);
  const n = Math.max(1, Math.ceil(3 * (1 - p)));
  const R = 110, C = 2 * Math.PI * R;
  return (
    <div style={{position: 'absolute', top: 1000, left: 540 - 140, width: 280, height: 280}}>
      <svg width={280} height={280}>
        <circle cx={140} cy={140} r={R} stroke="rgba(255,255,255,.2)" strokeWidth={16} fill="rgba(20,23,28,.6)" />
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
  const wide: Cam = {x: SW * 0.55, y: SH / 2, z: 0.95};
  const isQ2 = t >= q2.start - 0.3;
  const highlight = t >= a2.start - 0.2 ? 'hugo' : t >= a1.start - 0.2 && !isQ2 ? 'hen' : undefined;
  const cam = camAt(t, [
    [s, wide],
    [a1.start - 0.4, {...centre('hen'), z: 1.6}],
    [q2.start - 0.5, wide],
    [a2.start - 0.4, {...centre('hugo'), y: centre('hugo').y + 20, z: 1.3}],
    [dn.start, wide],
  ]);
  const hl = highlight === 'hen' ? ramp(t, a1.start - 0.2, a1.start + 0.5) : highlight === 'hugo' ? ramp(t, a2.start - 0.2, a2.start + 0.5) : 0;
  const greyIn = ramp(t, s, s + 0.8) * (1 - ramp(t, dn.start, dn.start + 0.8));
  const qCard = (q: string, a: number, b: number) => (
    <Span a={a} b={b}><Pop at={a} style={{position: 'absolute', top: 300, left: 70, right: 70, background: 'white', borderRadius: 24, padding: '34px 40px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,.4)'}}>
      <div style={{fontSize: 28, fontWeight: 800, color: BLUE, letterSpacing: 4}}>ACTIVE RECALL</div>
      <div style={{fontSize: 62, fontWeight: 800, color: INK, lineHeight: 1.1, marginTop: 8}}>{q}</div>
    </Pop></Span>
  );
  return (
    <AbsoluteFill style={{background: DEEP}}>
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <Shop cam={cam} t={t} grey={greyIn} blur={greyIn * 3 * (highlight ? 1 - hl * 0.4 : 1)} highlight={highlight} hl={hl} />
      </AbsoluteFill>
      <Pop at={s + 0.1} style={{position: 'absolute', top: 130, left: 0, right: 0, textAlign: 'center', color: AMBER, fontSize: 34, fontWeight: 800, letterSpacing: 6}}>YOUR TURN · DON'T LOOK BACK</Pop>
      {qCard('Who shortened the inner cut?', q1.start, a1.end + 0.3)}
      {qCard('Who split the ramus lengthwise?', q2.start, a2.end + 0.3)}
      <Countdown a={q1.end + 0.1} b={a1.start - 0.1} />
      <Countdown a={q2.end + 0.1} b={a2.start - 0.1} />
      <Span a={a1.start} b={q2.start - 0.3}><Label x={90} y={1130} at={a1.start + 0.2} title="Hunsuck · 1968" detail="Short straw = short medial cut" /></Span>
      <Span a={a2.start} b={dn.start}><Label x={90} y={1130} at={a2.start + 0.2} title="Obwegeser · 1957" detail="Split geyser = sagittal split" /></Span>
      <Span a={dn.start} b={sceneEnd('recall')}>
        <Pop at={dn.start + 0.1} style={{position: 'absolute', top: 340, left: 0, right: 0, textAlign: 'center'}}>
          <div style={{display: 'inline-block', background: '#2FBF71', color: 'white', borderRadius: 999, width: 170, height: 170, fontSize: 120, lineHeight: '170px', fontWeight: 800}}>✓</div>
          <div style={{color: 'white', fontSize: 70, fontWeight: 800, marginTop: 20, textShadow: '0 4px 20px rgba(0,0,0,.6)'}}>You just recalled it.</div>
        </Pop>
      </Span>
    </AbsoluteFill>
  );
};

const Compare = () => {
  const t = useT();
  const s = sceneStart('compare');
  const l0 = lineOf('compare', 0), l1 = lineOf('compare', 1), l2 = lineOf('compare', 2);
  const rows: [string, string, number][] = [
    ['Re-read the notes', 'Retrieve from a scene', wordAt(l0, 'SketchRoot')],
    ['Page after page', 'The place gives the order', l1.start],
    ['Facts in a list', 'The image holds the fact', wordAt(l1, 'The image')],
    ['Cram, forget, repeat', 'Recall + spaced revision', l2.start],
  ];
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <Kicker at={s + 0.1}>What's different</Kicker>
      <div style={{position: 'absolute', top: 260, left: 60, right: 60, display: 'flex', gap: 24}}>
        <Pop at={s + 0.2} style={{flex: 1, textAlign: 'center', fontSize: 40, fontWeight: 800, color: '#8a857c', padding: 18, borderBottom: '5px solid #cfc9bd'}}>Usual coaching</Pop>
        <Pop at={wordAt(l0, 'SketchRoot')} style={{flex: 1, textAlign: 'center', fontSize: 40, fontWeight: 800, color: INK, padding: 18, borderBottom: `5px solid ${AMBER}`}}>SketchRoot</Pop>
      </div>
      {rows.map(([a, b, at], i) => (
        <div key={i} style={{position: 'absolute', top: 400 + i * 220, left: 60, right: 60, display: 'flex', gap: 24}}>
          <Pop at={at - 0.25} style={{flex: 1, background: '#ebe7df', borderRadius: 18, padding: '30px 26px', fontSize: 38, fontWeight: 600, color: '#77726a', textDecoration: t > at + 0.4 ? 'line-through' : 'none', minHeight: 170, display: 'flex', alignItems: 'center'}}>{a}</Pop>
          <Pop at={at} style={{flex: 1, background: 'white', border: `4px solid ${AMBER}`, borderRadius: 18, padding: '30px 26px', fontSize: 40, fontWeight: 800, color: INK, minHeight: 170, display: 'flex', alignItems: 'center', boxShadow: '0 12px 30px rgba(0,0,0,.08)'}}>{b}</Pop>
        </div>
      ))}
    </AbsoluteFill>
  );
};

const Paper: React.FC<{at: number; top: number; cite: string; journal: string; finding: string; rot: number}> = ({at, top, cite, journal, finding, rot}) => (
  <Pop at={at} style={{position: 'absolute', top, left: 80, right: 80, background: 'white', borderRadius: 14, padding: '34px 40px', boxShadow: '0 20px 50px rgba(0,0,0,.35)', transform: `rotate(${rot}deg)`, borderLeft: `14px solid ${BLUE}`}}>
    <div style={{fontSize: 30, color: '#666', fontWeight: 700}}>{cite} · <i>{journal}</i></div>
    <div style={{fontSize: 46, fontWeight: 800, color: INK, lineHeight: 1.15, marginTop: 10}}>{finding}</div>
  </Pop>
);

const Science = () => {
  const s = sceneStart('science');
  const l1 = lineOf('science', 1);
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg,#1b2430,#14171c)'}}>
      <Kicker at={s + 0.1} color="white">The science</Kicker>
      <Paper at={s + 0.3} top={330} rot={-1.5} cite="Maguire et al., 2003" journal="Nature Neuroscience" finding="Memory champions aren't smarter. They use a spatial strategy that engages the hippocampus." />
      <Paper at={l1.start + 0.2} top={760} rot={1.2} cite="Dresler et al., 2017" journal="Neuron" finding="6 weeks of method-of-loci training: ordinary learners' brain networks shift toward the champions'." />
      <Pop at={l1.start + 1.5} style={{position: 'absolute', top: 1260, left: 100, right: 100, textAlign: 'center', color: '#9aa4b2', fontSize: 28, lineHeight: 1.4}}>
        Lab studies, not dental-exam trials. Use it with questions and spaced revision.
      </Pop>
    </AbsoluteFill>
  );
};

const Founder = () => {
  const t = useT();
  const s = sceneStart('founder');
  const l1 = lineOf('founder', 1);
  const exams = ['NEET MDS', 'INI CET', 'INBDE', 'AIIMS'];
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <Kicker at={s + 0.1}>Who draws these</Kicker>
      <Pop at={s + 0.2} style={{position: 'absolute', top: 250, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <Img src={staticFile('founder.jpg')} style={{width: 330, height: 330, borderRadius: '50%', border: `10px solid ${AMBER}`, objectFit: 'cover'}} />
      </Pop>
      <Pop at={s + 0.5} style={{position: 'absolute', top: 620, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{fontSize: 56, fontWeight: 800, color: INK}}>Dr. Jishnu Mohan</div>
        <div style={{fontSize: 32, color: '#6b665d', marginTop: 6}}>M.D.S. Oral & Maxillofacial Surgery · Founder</div>
      </Pop>
      {['AIR 1 · AIIMS New Delhi PhD Entrance 2025', 'AIR 37 · NEET MDS 2022', 'AIR 91 · INI CET 2022'].map((c, i) => (
        <Pop key={i} at={s + 1 + i * 0.35} style={{position: 'absolute', top: 790 + i * 100, left: 140, right: 140, background: i === 0 ? INK : 'white', color: i === 0 ? AMBER : INK, border: `3px solid ${INK}`, borderRadius: 16, padding: '18px 0', textAlign: 'center', fontSize: 36, fontWeight: 800}}>{c}</Pop>
      ))}
      <div style={{position: 'absolute', top: 1140, left: 60, right: 60, display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap'}}>
        {exams.map((e, i) => (
          <Pop key={e} at={wordAt(l1, e === 'AIIMS' ? 'AIIMS' : e) } style={{background: AMBER, color: INK, borderRadius: 999, padding: '14px 30px', fontSize: 38, fontWeight: 800}}>{e}</Pop>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Cta = () => {
  const t = useT();
  const s = sceneStart('cta');
  const l1 = lineOf('cta', 1);
  const pulse = 1 + 0.03 * Math.sin(t * 5);
  return (
    <AbsoluteFill style={{background: DEEP}}>
      <Pop at={s + 0.1} style={{position: 'absolute', top: 380, left: 60, right: 60, textAlign: 'center', color: 'white', fontSize: 96, fontWeight: 800, lineHeight: 1.05}}>
        Stop re-reading.<br /><span style={{color: AMBER}}>Start retrieving.</span>
      </Pop>
      <Pop at={l1.start - 0.1} style={{position: 'absolute', top: 820, left: 0, right: 0, textAlign: 'center'}}>
        <Img src={staticFile('logo-light.svg')} style={{width: 640}} />
        <div style={{marginTop: 50, display: 'inline-block', transform: `scale(${pulse})`, background: AMBER, color: INK, fontSize: 54, fontWeight: 800, padding: '24px 50px', borderRadius: 999}}>sketchroot.com</div>
        <div style={{color: '#cbd2db', fontSize: 34, marginTop: 30}}>Early access is open</div>
      </Pop>
    </AbsoluteFill>
  );
};

const SCENE_COMP: Record<string, React.FC> = {hook: Hook, coaching: Coaching, loci: Loci, kitchen: Kitchen, idea: Idea, kada: Kada, recall: Recall, compare: Compare, science: Science, founder: Founder, cta: Cta};

export const Explainer: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{background: DEEP, fontFamily: 'Karla, sans-serif'}}>
      <Fonts />
      <Audio src={staticFile('narration.wav')} />
      {SCENES.map(s => {
        const C = SCENE_COMP[s];
        return <Span key={s} a={sceneStart(s)} b={sceneEnd(s) + 0.25} fade={0.3}><C /></Span>;
      })}
      <Captions />
      {/* progress */}
      <div style={{position: 'absolute', top: 0, left: 0, height: 10, width: `${(t / timeline.duration) * 100}%`, background: AMBER}} />
    </AbsoluteFill>
  );
};
