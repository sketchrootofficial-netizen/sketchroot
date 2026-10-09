// So-Cranky's Bar: Socransky's microbial complexes, one building, every MCQ.
// Single source for the video (scene.html) and the voice-over script (export_script.js).
//
// Beat fields
//   say    narration line (also the on-screen caption)
//   cam    box id (or array of ids) the camera frames
//   reveal [ids]  characters that paint in (pencil, then colour), staggered by `gap` seconds
//   ghost  zone(s) whose pencil under-drawing fades in · wash  zone(s) that turn fully colour
//          zones: all (whole building), wall, street, door, floor, base
//   chip   [label, colour] section tag, top left
//   card   'title' | 'diagram' | 'legend' | 'end'
//   mcq    {q, o:[4 options], a: index of the answer, keep:[points to remember]}
//   hold   extra seconds on the beat

// Boxes in building pixels (4310 × 2262, see build.py): mural 0–1672 × 150–1050, street below it,
// door column 1672–2638, orange floor 2638– × 150–1091, red basement 2638– × 1091–2032
const BOX = {
  all: {x: 0, y: 0, w: 4310, h: 2262},
  wall: {x: 0, y: 150, w: 1672, h: 900}, street: {x: 0, y: 1050, w: 1672, h: 982}, door: {x: 1672, y: 150, w: 966, h: 1882},
  floor: {x: 2638, y: 150, w: 1672, h: 941}, base: {x: 2638, y: 1091, w: 1672, h: 941}, inside: {x: 2638, y: 150, w: 1672, h: 1882},
  front: {x: 0, y: 150, w: 2638, h: 1882},
  // the doorman and the two outsiders (from layout-ref.png)
  crank: {x: 1940, y: 680, w: 540, h: 1350}, outs: {x: 720, y: 1150, w: 900, h: 900},
  nox: {x: 720, y: 1480, w: 520, h: 580}, aab: {x: 1180, y: 1150, w: 430, h: 900},
  // street wall: blue, yellow, green, purple
  act: {x: 0, y: 230, w: 345, h: 780},
  strep: {x: 320, y: 180, w: 390, h: 880},
  mit: {x: 320, y: 190, w: 380, h: 170}, ora: {x: 370, y: 345, w: 290, h: 125}, san: {x: 380, y: 460, w: 300, h: 140},
  ssp: {x: 380, y: 580, w: 310, h: 120}, gor: {x: 370, y: 690, w: 280, h: 140}, int: {x: 350, y: 820, w: 320, h: 220},
  green: {x: 700, y: 180, w: 660, h: 850}, skate: {x: 700, y: 190, w: 660, h: 500},
  cgi: {x: 740, y: 195, w: 330, h: 255}, csp: {x: 1030, y: 205, w: 320, h: 260}, coc: {x: 700, y: 455, w: 370, h: 235},
  ccon: {x: 1080, y: 480, w: 250, h: 250}, eco: {x: 720, y: 705, w: 320, h: 265}, aaa: {x: 1010, y: 725, w: 350, h: 290},
  purple: {x: 1300, y: 250, w: 372, h: 780},
  vpa: {x: 1340, y: 270, w: 332, h: 340}, aod: {x: 1300, y: 620, w: 372, h: 400},
  // orange main floor
  core: {x: 3008, y: 395, w: 1020, h: 450}, fuso: {x: 3438, y: 395, w: 590, h: 440},
  rec: {x: 2638, y: 190, w: 350, h: 330}, gra: {x: 3098, y: 160, w: 240, h: 300}, sho: {x: 3918, y: 170, w: 270, h: 290},
  con: {x: 2668, y: 560, w: 400, h: 310}, nod: {x: 4048, y: 460, w: 262, h: 320},
  pin: {x: 3018, y: 465, w: 150, h: 255}, pni: {x: 3168, y: 465, w: 160, h: 265}, pmi: {x: 3318, y: 495, w: 140, h: 255},
  prev: {x: 3008, y: 449, w: 460, h: 300},
  fnn: {x: 3443, y: 395, w: 145, h: 440}, fnv: {x: 3573, y: 450, w: 130, h: 385}, fnp: {x: 3698, y: 445, w: 155, h: 390},
  fpe: {x: 3838, y: 520, w: 185, h: 255},
  // red basement
  pgi: {x: 2638, y: 1091, w: 1000, h: 700}, tfo: {x: 3458, y: 1141, w: 540, h: 420}, tde: {x: 3898, y: 1341, w: 412, h: 620},
};

const BLUE = ['BLUE COMPLEX', '#1F3FFF'], YEL = ['YELLOW COMPLEX', '#C9C400'], PUR = ['PURPLE COMPLEX', '#8E2BC2'],
  GRN = ['GREEN COMPLEX', '#1B7A1B'], ORA = ['ORANGE COMPLEX', '#E8780F'], RED = ['RED COMPLEX', '#D91F26'],
  OUT = ['NO COMPLEX', '#6F6A64'], INTRO = ['SO-CRANKY\'S BAR', '#272525'];

const BEATS = [
  // ───────── INTRO ─────────
  {card: 'title', cam: 'all', ghost: 'all', hold: 3, chip: INTRO,
    say: "Welcome to So-Cranky's Bar. Every bacterium in Socransky's complexes has a seat here, and every MCQ has a hook."},
  {cam: 'all', ghost: 'wall', chip: INTRO,
    say: "In 1998, Sigmund Socransky and his team sorted the bacteria living under your gums into gangs. They called them microbial complexes, and named each one by a colour."},
  {card: 'diagram', cam: 'all', chip: INTRO,
    say: "This is the diagram examiners love. Six colours, a bridge, and a red corner. You won't memorise it tonight. You'll walk through it."},
  {cam: 'all', ghost: ['door', 'floor', 'base'], chip: INTRO,
    say: "Here's the bar. Outside is the street wall: the clean tooth surface, where the early colonisers stick. Inside, upstairs, is the orange main floor, the bridge crowd. And downstairs, in the basement, deepest in the pocket: the red complex."},
  {cam: 'crank', reveal: ['crank'], chip: INTRO,
    say: "And at the door, me. Professor So-Cranky. My wristbands are colour-coded. I decide who gets in, and which floor they're allowed on."},
  {cam: 'crank', wash: 'door', chip: INTRO, mcq: {
    q: 'Socransky et al. (1998) defined the subgingival microbial complexes using:',
    o: ['Culture on blood agar', 'Checkerboard DNA–DNA hybridisation', '16S rRNA gene sequencing', 'Dark-field microscopy'], a: 1,
    keep: ['13,261 subgingival plaque samples from 185 adults', '40 bacterial species tested', 'Cluster analysis grouped them into colour-coded complexes (J Clin Periodontol 1998;25:134–144)']}},

  // ───────── BLUE ─────────
  {cam: 'wall', chip: BLUE,
    say: "We start outside, on the street wall. Bare enamel, freshly coated with salivary pellicle. Only pioneers can stick here."},
  {cam: 'act', reveal: ['act'], chip: BLUE,
    say: "In the blue band, a hairy actor in a red cape: Actinomyces. Gram-positive, filamentous, and those long threads are his fimbriae, which grab the pellicle. The blue complex is Actinomyces species."},
  {cam: 'act', chip: BLUE, mcq: {
    q: 'Which of the following is an early coloniser of the tooth surface?',
    o: ['Porphyromonas gingivalis', 'Actinomyces naeslundii', 'Treponema denticola', 'Tannerella forsythia'], a: 1,
    keep: ['Early colonisers: streptococci and Actinomyces', 'They bind receptors in the salivary pellicle with adhesins and fimbriae', 'Red-complex species are late colonisers']}},

  // ───────── YELLOW ─────────
  {cam: 'strep', reveal: ['mit'], chip: YEL,
    say: "Next door, the yellow band: a chain of cranky little cocci holding hands. Cocci in chains: streptococci. The yellow complex is the streptococci."},
  {cam: 'strep', reveal: ['ora', 'san', 'ssp', 'gor', 'int'], gap: 1.6, chip: YEL,
    say: "S. mitis in boxing mittens. S. oralis shouting through a megaphone. S. sanguis, the singer. A plain Streptococcus species. S. gordonii, the gardener. And at the bottom, S. intermedius, the intern."},
  {cam: 'int', chip: YEL,
    say: "Watch the crumbs falling on the pavement. Streptococci ferment sugar and drop lactate. Someone on this wall is hungry for it."},
  {cam: 'strep', chip: YEL, mcq: {
    q: 'The predominant initial coloniser of a freshly cleaned tooth surface is:',
    o: ['Streptococcus sanguinis', 'Fusobacterium nucleatum', 'Prevotella intermedia', 'Campylobacter rectus'], a: 0,
    keep: ['Streptococci make up the majority of the first bacteria on clean enamel', 'S. sanguinis, S. oralis, S. mitis and S. gordonii are the classic pioneers', 'Yellow complex = streptococci']}},

  // ───────── PURPLE ─────────
  {cam: 'vpa', reveal: ['vpa'], chip: PUR,
    say: "Skip to the purple band. A tiny veiled girl picking the crumbs off the pavement: Veillonella parvula. Veil, Veillonella. Parvula, little. She eats the lactate the streptococci drop."},
  {cam: 'vpa', chip: PUR, mcq: {
    q: 'Veillonella parvula uses which product of streptococcal metabolism as its energy source?',
    o: ['Glucose', 'Lactate', 'Hemin', 'Vitamin K'], a: 1,
    keep: ['Veillonella: Gram-negative anaerobic coccus', 'Turns lactic acid into weaker acids (propionate, acetate)', 'Classic example of metabolic cross-feeding in plaque']}},
  {cam: 'aod', reveal: ['aod'], chip: PUR,
    say: "Below her, a purple character with a drill, grinding a tooth to dust: Actinomyces odontolyticus. Odonto, tooth. Lyticus, dissolving. It was first isolated from deep carious lesions."},
  {cam: 'purple', chip: PUR, mcq: {
    q: 'The purple complex consists of:',
    o: ['V. parvula and A. odontolyticus', 'V. parvula and A. naeslundii', 'S. noxia and A. odontolyticus', 'E. corrodens and V. parvula'], a: 0,
    keep: ['Purple complex has only two members', 'Do not confuse A. odontolyticus (purple) with Actinomyces spp. (blue)', 'Both are early colonisers']}},

  // ───────── GREEN ─────────
  {cam: 'skate', reveal: ['cgi', 'csp', 'coc'], gap: 1.8, chip: GRN,
    say: "Now the green band: the skate gang. Three Capnocytophaga on skateboards. C. gingivalis, C. sputigena spitting, and C. ochracea spraying ochre paint."},
  {cam: 'skate', chip: GRN,
    say: "Why skateboards? Capnocytophaga have no flagella. They glide. And capno means carbon dioxide: they need a CO2-rich atmosphere."},
  {cam: 'skate', chip: GRN, mcq: {
    q: 'Capnocytophaga species are characterised by:',
    o: ['Flagellar motility', 'Gliding motility', 'Spore formation', 'A Gram-positive cell wall'], a: 1,
    keep: ['Gram-negative, capnophilic (CO2-loving), gliding', 'Three in the green complex: C. gingivalis, C. sputigena, C. ochracea', 'Skateboards = gliding']}},
  {cam: 'ccon', reveal: ['ccon'], chip: GRN,
    say: "The small clerk writing a concise note: Campylobacter concisus."},
  {cam: 'eco', reveal: ['eco'], chip: GRN,
    say: "The rusty one boring a pit into the bricks: Eikenella corrodens. Its colonies corrode, or pit, the agar they grow on."},
  {cam: 'eco', chip: GRN, mcq: {
    q: 'Eikenella corrodens gets its species name because its colonies:',
    o: ['Produce black pigment', 'Pit or corrode the agar surface', 'Swarm across the plate', 'Dissolve red blood cells'], a: 1,
    keep: ['Gram-negative, facultative rod; green complex', 'A member of the HACEK group (endocarditis)', 'Classic cause of human-bite wound infections']}},
  {cam: 'aaa', reveal: ['aaa'], chip: GRN,
    say: "And at the velvet rope, the bouncer with a laser eye: Aggregatibacter actinomycetemcomitans, serotype a. His laser is leukotoxin."},
  {cam: 'aaa', chip: GRN, mcq: {
    q: 'The leukotoxin of Aggregatibacter actinomycetemcomitans primarily kills:',
    o: ['Erythrocytes', 'Neutrophils and monocytes', 'Gingival fibroblasts', 'Osteoclasts'], a: 1,
    keep: ['Leukotoxin belongs to the RTX toxin family', 'Kills the host defenders: PMNs and monocytes / macrophages', 'Genus renamed from Actinobacillus to Aggregatibacter in 2006']}},
  {cam: 'wall', wash: 'wall', chip: GRN,
    say: "That's the whole wall: blue, yellow, purple and green. The early colonisers. Mostly host-compatible, they build the stage the others will stand on."},

  // ───────── OUTSIDERS ─────────
  {cam: 'outs', ghost: 'street', reveal: ['nox', 'aab'], gap: 2, chip: OUT,
    say: "Down on the street, two characters never got a wristband. A. actinomycetemcomitans serotype b, the bouncer's green twin, and Selenomonas noxia with her backpack. In Socransky's diagram they sit outside every complex."},
  {cam: 'outs', wash: 'street', chip: OUT, mcq: {
    q: 'Which A. actinomycetemcomitans serotype lies outside the complexes and is linked to localized aggressive periodontitis?',
    o: ['Serotype a', 'Serotype b', 'Serotype c', 'Serotype e'], a: 1,
    keep: ['Serotype a: green complex · serotype b: no complex', 'JP2 clone (serotype b) has a 530-bp deletion in the leukotoxin promoter, so it makes far more toxin', 'Localized aggressive periodontitis is now the molar–incisor pattern, Grade C (2017 classification)']}},

  // ───────── THE BRIDGE ─────────
  {cam: 'fnn', reveal: ['fnn'], ghost: 'floor', chip: ORA,
    say: "Now past the ropes and up to the main floor. Right in the middle, with a nuclear hat and a lit fuse: Fusobacterium nucleatum. Nucleatum, nuclear."},
  {cam: 'fnn', chip: ORA,
    say: "He's long, with pointed ends: fusiform, spindle-shaped. And he's the bridge. Fusobacterium sticks to almost every early coloniser and to the late colonisers too. Without him, the basement crowd never gets in."},
  {cam: 'fnn', chip: ORA, mcq: {
    q: 'The "bridge" organism linking early and late colonisers in plaque is:',
    o: ['Streptococcus mitis', 'Fusobacterium nucleatum', 'Veillonella parvula', 'Treponema denticola'], a: 1,
    keep: ['Coaggregates with nearly all oral bacteria (adhesins such as FadA, Fap2, RadD)', 'Gram-negative anaerobe, fusiform (spindle-shaped)', 'Also linked to colorectal cancer and preterm birth']}},

  // ───────── ORANGE ─────────
  {cam: 'floor', chip: ORA,
    say: "Welcome to the orange main floor. See how it sags in the middle? As this crowd grows, inflammation rises and the pocket deepens."},
  {cam: 'fuso', reveal: ['fnv', 'fnp', 'fpe'], gap: 2, chip: ORA,
    say: "Fusobacterium brought the family. F. nucleatum vincentii, with a bandaged ear, like Vincent. Polymorphum, hiding behind many masks: poly, many, morph, forms. And the tick-shaped F. periodonticum."},
  {cam: 'pin', reveal: ['pin'], chip: ORA,
    say: "In the inner circle, a pregnant reporter: Prevotella intermedia. Pregnancy and P. intermedia always go together."},
  {cam: 'pin', chip: ORA, mcq: {
    q: 'Prevotella intermedia increases in pregnancy gingivitis because it:',
    o: ['Ferments glucose faster', 'Uses oestrogen and progesterone in place of vitamin K', 'Is transmitted from the fetus', 'Resists salivary IgA'], a: 1,
    keep: ['Steroid hormones substitute for the naphthoquinone (vitamin K) it needs', 'Black-pigmented, Gram-negative anaerobe', 'Also a key player in necrotising gingivitis (with fusobacteria and spirochaetes)']}},
  {cam: 'pni', reveal: ['pni'], chip: ORA,
    say: "Beside her, a black crescent moon: Prevotella nigrescens. Nigrescens, blackening. Both Prevotellas form black-pigmented colonies."},
  {cam: 'pmi', reveal: ['pmi'], chip: ORA,
    say: "And the little singer with the microphone: P. micros. Peptostreptococcus micros, now renamed Parvimonas micra."},
  {cam: 'prev', chip: ORA, mcq: {
    q: 'All of the following orange-complex members are Gram-negative EXCEPT:',
    o: ['Prevotella intermedia', 'Fusobacterium nucleatum', 'Parvimonas micra', 'Campylobacter rectus'], a: 2,
    keep: ['Parvimonas micra (formerly Peptostreptococcus micros) is a Gram-positive anaerobic coccus', 'Other Gram-positives on the floor: Eubacterium nodatum and Streptococcus constellatus', 'Every red-complex member is Gram-negative']}},
  {cam: 'rec', reveal: ['rec'], chip: ORA,
    say: "Around the edge, the rowdy ones. Straight-backed and smashing chairs: Campylobacter rectus. Rectus, straight. His old name was Wolinella recta."},
  {cam: 'gra', reveal: ['gra'], chip: ORA, say: "C. gracilis, the graceful dancer."},
  {cam: 'sho', reveal: ['sho'], chip: ORA, say: "C. showae, the showman on his stage."},
  {cam: 'nod', reveal: ['nod'], chip: ORA, say: "Eubacterium nodatum, tied up in knots. Nodatum, knotted."},
  {cam: 'con', reveal: ['con'], chip: ORA,
    say: "And under a cape full of stars, carrying an abscess balloon: Streptococcus constellatus. Careful. He's a streptococcus, but he sits in the orange complex, not the yellow."},
  {cam: 'con', chip: ORA, mcq: {
    q: 'Which streptococcus belongs to the ORANGE complex rather than the yellow?',
    o: ['S. intermedius', 'S. constellatus', 'S. gordonii', 'S. mitis'], a: 1,
    keep: ['S. intermedius = yellow, S. constellatus = orange (both anginosus group)', 'The anginosus group is known for forming abscesses', 'Stars on the cape = constellation']}},
  {cam: 'floor', wash: 'floor', chip: ORA,
    say: "That's the orange complex. In the core: Fusobacterium, Prevotella and Parvimonas. Around them: the Campylobacters, Eubacterium nodatum and Streptococcus constellatus."},
  {cam: 'floor', chip: ORA, mcq: {
    q: 'Red-complex species are rarely detected in the absence of which complex?',
    o: ['Yellow', 'Purple', 'Orange', 'Green'], a: 2,
    keep: ['Orange colonises first and paves the way for red', 'Orange and red are the most closely associated complexes', 'More orange → more red → deeper pockets']}},

  // ───────── RED ─────────
  {cam: 'base', ghost: 'base', chip: RED,
    say: "Now down the stairs, to the deepest part of the pocket: the red basement VIP bar. Only three members, and they're the ones most strongly linked to periodontitis."},
  {cam: 'pgi', reveal: ['pgi'], chip: RED,
    say: "Behind the bar, wearing a crown: Porphyromonas gingivalis. He pours fire onto a counter shaped like gums, and the gums bleed."},
  {cam: 'pgi', chip: RED,
    say: "His bottle is heme. P. gingivalis needs heme for its iron, which is why his colonies turn black on blood agar. His knives are the gingipains: cysteine proteases that cut after arginine and lysine."},
  {cam: 'pgi', chip: RED, mcq: {
    q: 'Gingipains of Porphyromonas gingivalis are:',
    o: ['Serine proteases', 'Cysteine proteases', 'Metalloproteinases', 'Aspartic proteases'], a: 1,
    keep: ['Arg-gingipains (RgpA, RgpB) and Lys-gingipain (Kgp)', 'Degrade host proteins, cytokines and complement; release heme', 'Black pigment on blood agar = stored heme']}},
  {cam: 'pgi', chip: RED,
    say: "And the crown? He's a keystone pathogen. Even in small numbers, he disarms the host's complement defence and tips the whole community into dysbiosis."},
  {cam: 'pgi', chip: RED, mcq: {
    q: 'Porphyromonas gingivalis is called a "keystone pathogen" because it:',
    o: ['Is the most abundant species in plaque', 'Causes dysbiosis even at low abundance', 'Is the first coloniser of enamel', 'Is the only cause of periodontitis'], a: 1,
    keep: ['Keystone-pathogen hypothesis: Hajishengallis et al., 2012', 'Subverts complement (C5aR) and TLR2 signalling', 'Low numbers, big effect: the king, not the crowd']}},
  {cam: 'tfo', reveal: ['tfo'], chip: RED,
    say: "Up on the watchtower: Tannerella forsythia, scraping hides. Look at her snacks, packets marked NAM. She needs N-acetylmuramic acid to grow."},
  {cam: 'tfo', chip: RED,
    say: "Her flag says BspA, a leucine-rich surface protein that helps her stick and triggers inflammation. Old names: Bacteroides forsythus, then Tannerella forsythensis."},
  {cam: 'tfo', chip: RED, mcq: {
    q: 'Tannerella forsythia requires which growth factor in culture?',
    o: ['Hemin', 'N-acetylmuramic acid (NAM)', 'Lactate', 'Bicarbonate'], a: 1,
    keep: ['NAM is a building block of bacterial cell wall peptidoglycan', 'Virulence factors: BspA, S-layer, proteases', 'Old names: Bacteroides forsythus, Tannerella forsythensis']}},
  {cam: 'tde', reveal: ['tde'], chip: RED,
    say: "And corkscrewing through the floor: Treponema denticola, opening a cola with a tooth for a cap. Denti, cola."},
  {cam: 'tde', chip: RED,
    say: "He's a spirochaete. His flagella sit inside the cell, between the membranes, so he twists like a corkscrew through tissue. His protease is called dentilisin."},
  {cam: 'tde', chip: RED, mcq: {
    q: 'The major chymotrypsin-like protease of Treponema denticola is:',
    o: ['Gingipain', 'Dentilisin', 'Leukotoxin', 'Collagenase-3'], a: 1,
    keep: ['Dentilisin (PrtP): a chymotrypsin-like protease', 'Spirochaete, motile by periplasmic flagella (endoflagella)', 'Major surface protein: Msp']}},
  {cam: 'base', wash: 'base', chip: RED, mcq: {
    q: 'The red complex consists of:',
    o: ['P. gingivalis, P. intermedia, T. denticola', 'P. gingivalis, T. forsythia, T. denticola', 'P. gingivalis, A. actinomycetemcomitans, T. forsythia', 'F. nucleatum, T. forsythia, T. denticola'], a: 1,
    keep: ['King (P. gingivalis), tanner (T. forsythia), cola-corkscrew (T. denticola)', 'All three are Gram-negative anaerobes', 'P. intermedia is orange; A. a. is green or outside']}},
  {cam: 'base', chip: RED, mcq: {
    q: 'The red complex shows the strongest association with:',
    o: ['Healthy gingiva', 'Increasing pocket depth and bleeding on probing', 'Root caries', 'Pericoronitis'], a: 1,
    keep: ['The counter bleeds = bleeding on probing', 'The basement = the deepest pockets', 'Prevalence and levels rise with pocket depth']}},

  // ───────── RECAP ─────────
  {card: 'legend', cam: 'all', wash: 'all', chip: INTRO,
    say: "Now zoom out. Walk it the way the bacteria do: the wall, the door, upstairs, then the basement. That's the order plaque matures, and the order the disease gets worse."},
  {card: 'legend', cam: 'all', chip: INTRO, mcq: {
    q: 'The correct sequence of plaque colonisation is:',
    o: ['Red → orange → yellow', 'Yellow / blue → orange → red', 'Orange → yellow → red', 'Green → red → orange'], a: 1,
    keep: ['Early: yellow, blue, purple, green', 'Bridge: orange (F. nucleatum)', 'Late: red']}},
  {card: 'legend', cam: 'all', chip: INTRO, mcq: {
    q: "Socransky's criteria for identifying periodontal pathogens include all EXCEPT:",
    o: ['Association with disease', 'Elimination with treatment', 'Host response to the organism', 'Growth in pure culture from every lesion'], a: 3,
    keep: ["Socransky's criteria (1979) modified Koch's postulates for mixed infections", 'Association, elimination, host response, virulence factors, animal studies', 'Pure culture from every lesion is Koch, not Socransky']}},
  {cam: 'all', chip: INTRO,
    say: "One last thing to keep in mind. The 1998 data covered 40 species. Newer sequencing found hundreds more, but the complexes are still what the exams ask. Know the colours, know the order, know the red three."},
  {card: 'end', cam: 'all', hold: 2, chip: INTRO,
    say: "Which bacterium tripped you up? Tell me in the comments. I'll be at the bar."},
];

// ---------- timing (shared with export_script.js) ----------
const WPS = 2.3;            // slow, clear narration
const words = s => (s || '').split(/\s+/).filter(Boolean).length;
const MCQ_THINK = 6;        // countdown seconds
function timeline() {
  let t = 0;
  return BEATS.map((b, i) => {
    const r = Object.assign({i}, b);
    r.start = t;
    if (b.mcq) {
      const m = b.mcq;
      r.qRead = Math.max(4, (words(m.q) + words(m.o.join(' '))) / 2.6);
      r.think = MCQ_THINK;
      r.keepAt = r.qRead + r.think + 2.2;
      r.dur = r.keepAt + Math.max(5, words(m.keep.join(' ')) / 2.4) + 1;
    } else {
      const revEnd = (b.reveal ? (b.reveal.length - 1) * (b.gap || 1.5) + 3.2 : 0);
      r.dur = Math.max(3.5, words(b.say) / WPS + 1.2, revEnd + 1) + (b.hold || 0);
    }
    t += r.dur;
    return r;
  });
}
const TL = timeline();
const DURATION = TL[TL.length - 1].start + TL[TL.length - 1].dur;
if (typeof module !== 'undefined') module.exports = {BOX, BEATS, TL, DURATION};
