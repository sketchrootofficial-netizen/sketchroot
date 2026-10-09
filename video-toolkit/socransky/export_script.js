// node socransky/export_script.js > docs/socransky-narration-script.md
const {TL, DURATION} = require('./beats.js');
const ts = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const L = [];
L.push("# So-Cranky's Bar: Socransky's microbial complexes", '');
L.push(`### Voice-over script with on-screen cues · ${ts(DURATION)} · ${TL.filter(b => b.mcq).length} MCQs`, '');
L.push('Generated from `socransky/beats.js`. Edit the beats there, re-run this script and re-render, so the timings stay in sync.', '');
L.push('**Cues:** `[ADD: x]` the character paints in (pencil, then colour) · `[CAM: x]` the camera frames it · `[WASH]` the whole level turns to colour · **MCQ** the card slides in: read the question and options, stay silent for the 6-second countdown, then say the answer and read the "keep in mind" points.', '');
L.push('**Recording:** record one file per section (the chip names in capitals). Speak slower than feels natural: the captions reveal at about 2.3 words a second.', '');
let sec = '';
let q = 0;
for (const b of TL) {
  if (b.chip && b.chip[0] !== sec) { sec = b.chip[0]; L.push('---', '', `## ${sec}`, ''); }
  const cues = [];
  if (b.card) cues.push(`[CARD: ${b.card}]`);
  if (b.cam) cues.push(`[CAM: ${[].concat(b.cam).join(', ')}]`);
  (b.reveal || []).forEach(r => cues.push(`[ADD: ${r}]`));
  if (b.wash) cues.push(`[WASH: ${b.wash}]`);
  L.push(`**${ts(b.start)}** ${cues.map(c => '`' + c + '`').join(' ')}`, '');
  if (b.say) L.push(b.say, '');
  if (b.mcq) {
    const m = b.mcq; q++;
    L.push(`**MCQ ${q}.** ${m.q}`, '');
    m.o.forEach((o, k) => L.push(`- ${'ABCD'[k]}. ${o}${k === m.a ? ' ✅' : ''}`));
    L.push('', `*(pause ${b.think} s, think…)* The answer is **${'ABCD'[m.a]}: ${m.o[m.a]}**.`, '');
    L.push('Keep in mind:', ...m.keep.map(k => `- ${k}`), '');
  }
}
L.push('---', '', '## Fact checks before release', '');
L.push('These hooks rest on standard periodontology texts (Newman & Carranza, Lindhe). Have a colleague verify them against the primary papers:');
L.push("- Socransky et al. 1998, J Clin Periodontol 25:134–144: 13,261 samples, 185 subjects, 40 species, checkerboard DNA–DNA hybridisation");
L.push('- Keystone-pathogen hypothesis: Hajishengallis, Darveau & Curtis, Nat Rev Microbiol 2012');
L.push('- JP2 clone: 530-bp deletion in the leukotoxin promoter (A. actinomycetemcomitans serotype b)');
L.push('- T. forsythia NAM requirement and BspA; T. denticola dentilisin (PrtP) and Msp');
L.push("- Socransky's 1979 criteria for periodontal pathogens");
L.push('- A. odontolyticus first isolated from deep carious lesions');
console.log(L.join('\n'));
