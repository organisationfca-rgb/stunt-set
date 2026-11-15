// Police pixel dessinée en code (5 x 7 pixels), avec les accents du français.
// Aucun fichier de police externe : tout est ici.

const RAW = {
  A: '.XXX./X...X/X...X/XXXXX/X...X/X...X/X...X',
  B: 'XXXX./X...X/X...X/XXXX./X...X/X...X/XXXX.',
  C: '.XXX./X...X/X..../X..../X..../X...X/.XXX.',
  D: 'XXXX./X...X/X...X/X...X/X...X/X...X/XXXX.',
  E: 'XXXXX/X..../X..../XXXX./X..../X..../XXXXX',
  F: 'XXXXX/X..../X..../XXXX./X..../X..../X....',
  G: '.XXX./X...X/X..../X.XXX/X...X/X...X/.XXXX',
  H: 'X...X/X...X/X...X/XXXXX/X...X/X...X/X...X',
  I: 'XXX/.X./.X./.X./.X./.X./XXX',
  J: '..XXX/...X./...X./...X./...X./X..X./.XX..',
  K: 'X...X/X..X./X.X../XX.../X.X../X..X./X...X',
  L: 'X..../X..../X..../X..../X..../X..../XXXXX',
  M: 'X...X/XX.XX/X.X.X/X.X.X/X...X/X...X/X...X',
  N: 'X...X/XX..X/X.X.X/X..XX/X...X/X...X/X...X',
  O: '.XXX./X...X/X...X/X...X/X...X/X...X/.XXX.',
  P: 'XXXX./X...X/X...X/XXXX./X..../X..../X....',
  Q: '.XXX./X...X/X...X/X...X/X.X.X/X..X./.XX.X',
  R: 'XXXX./X...X/X...X/XXXX./X.X../X..X./X...X',
  S: '.XXXX/X..../X..../.XXX./....X/....X/XXXX.',
  T: 'XXXXX/..X../..X../..X../..X../..X../..X..',
  U: 'X...X/X...X/X...X/X...X/X...X/X...X/.XXX.',
  V: 'X...X/X...X/X...X/X...X/X...X/.X.X./..X..',
  W: 'X...X/X...X/X...X/X.X.X/X.X.X/XX.XX/X...X',
  X: 'X...X/X...X/.X.X./..X../.X.X./X...X/X...X',
  Y: 'X...X/X...X/.X.X./..X../..X../..X../..X..',
  Z: 'XXXXX/....X/...X./..X../.X.../X..../XXXXX',
  a: '...../...../.XXX./....X/.XXXX/X...X/.XXXX',
  b: 'X..../X..../XXXX./X...X/X...X/X...X/XXXX.',
  c: '..../..../.XXX/X.../X.../X.../.XXX',
  d: '....X/....X/.XXXX/X...X/X...X/X...X/.XXXX',
  e: '...../...../.XXX./X...X/XXXXX/X..../.XXX.',
  f: '..XX/.X../.X../XXX./.X../.X../.X..',
  g: '...../...../.XXXX/X...X/X...X/.XXXX/....X/.XXX.',
  h: 'X..../X..../X.XX./XX..X/X...X/X...X/X...X',
  i: '.X./.../XX./.X./.X./.X./XXX',
  ı: '.../.../XX./.X./.X./.X./XXX',
  j: '..X/.../.XX/..X/..X/..X/..X/XX.',
  k: 'X.../X.../X..X/X.X./XX../X.X./X..X',
  l: 'XX./.X./.X./.X./.X./.X./XXX',
  m: '...../...../XX.X./X.X.X/X.X.X/X...X/X...X',
  n: '...../...../X.XX./XX..X/X...X/X...X/X...X',
  o: '...../...../.XXX./X...X/X...X/X...X/.XXX.',
  p: '...../...../XXXX./X...X/X...X/XXXX./X..../X....',
  q: '...../...../.XXXX/X...X/X...X/.XXXX/....X/....X',
  r: '..../..../X.XX/XX../X.../X.../X...',
  s: '...../...../.XXXX/X..../.XXX./....X/XXXX.',
  t: '.X../.X../XXX./.X../.X../.X../..XX',
  u: '...../...../X...X/X...X/X...X/X..XX/.XX.X',
  v: '...../...../X...X/X...X/X...X/.X.X./..X..',
  w: '...../...../X...X/X...X/X.X.X/X.X.X/.X.X.',
  x: '...../...../X...X/.X.X./..X../.X.X./X...X',
  y: '...../...../X...X/X...X/X...X/.XXXX/....X/.XXX.',
  z: '...../...../XXXXX/...X./..X../.X.../XXXXX',
  0: '.XXX./X...X/X..XX/X.X.X/XX..X/X...X/.XXX.',
  1: '..X../.XX../..X../..X../..X../..X../.XXX.',
  2: '.XXX./X...X/....X/...X./..X../.X.../XXXXX',
  3: 'XXXXX/...X./..X../...X./....X/X...X/.XXX.',
  4: '...X./..XX./.X.X./X..X./XXXXX/...X./...X.',
  5: 'XXXXX/X..../XXXX./....X/....X/X...X/.XXX.',
  6: '..XX./.X.../X..../XXXX./X...X/X...X/.XXX.',
  7: 'XXXXX/....X/...X./..X../.X.../.X.../.X...',
  8: '.XXX./X...X/X...X/.XXX./X...X/X...X/.XXX.',
  9: '.XXX./X...X/X...X/.XXXX/....X/...X./.XX..',
  '.': './././././X/X',
  ',': '../../../../.X/.X/X.',
  '!': 'X/X/X/X/X/./X',
  '?': '.XXX./X...X/....X/...X./..X../...../..X..',
  ':': './X/X/./X/X/.',
  ';': '../.X/.X/../.X/.X/X.',
  "'": '.X/.X/X./../../../..',
  '"': 'X.X/X.X/.../.../.../.../...',
  '-': '..../..../..../XXXX/..../..../....',
  '+': '...../..X../..X../XXXXX/..X../..X../.....',
  '×': '...../X...X/.X.X./..X../.X.X./X...X/.....',
  '(': '..X/.X./X../X../X../.X./..X',
  ')': 'X../.X./..X/..X/..X/.X./X..',
  '/': '....X/....X/...X./..X../.X.../X..../X....',
  '%': 'XX..X/XX..X/...X./..X../.X.../X..XX/X..XX',
  '«': '...../..X.X/.X.X./X.X../.X.X./..X.X/.....',
  '»': '...../X.X../.X.X./..X.X/.X.X./X.X../.....',
  _: '...../...../...../...../...../...../XXXXX',
  '=': '...../...../XXXXX/...../XXXXX/...../.....',
  '<': '...X/..X./.X../X.../.X../..X./...X',
  '>': 'X.../.X../..X./...X/..X./.X../X...',
  '*': '...../X.X.X/.XXX./XXXXX/.XXX./X.X.X/.....',
  '#': '.X.X./.X.X./XXXXX/.X.X./XXXXX/.X.X./.X.X.',
  '&': '.XX../X..X./X.X../.X.../X.X.X/X..X./.XX.X',
  '@': '.XXX./X...X/X.XXX/X.X.X/X.XXX/X..../.XXX.',
  '…': '...../...../...../...../...../...../X.X.X',
  '°': '.XX./X..X/X..X/.XX./..../..../....',
  '→': '...../..X../...X./XXXXX/...X./..X../.....',
  '←': '...../..X../.X.../XXXXX/.X.../..X../.....',
  '↑': '..X../.XXX./X.X.X/..X../..X../..X../..X..',
  '↓': '..X../..X../..X../..X../X.X.X/.XXX./..X..',
  '★': '..X../..X../XXXXX/.XXX./.XXX./XX.XX/X...X',
  '♪': '..XX./..X.X/..X../..X../.XX../XXX../.X...',
};

// Accents : 2 lignes dessinées au-dessus de la lettre (ou cédille en dessous).
const ACCENTS = {
  acute: ['...X.', '..X..'],
  grave: ['.X...', '..X..'],
  circ: ['..X..', '.X.X.'],
  dia: ['.....', '.X.X.'],
};
const COMPOSED = {
  é: ['e', 'acute'], è: ['e', 'grave'], ê: ['e', 'circ'], ë: ['e', 'dia'],
  à: ['a', 'grave'], â: ['a', 'circ'], ù: ['u', 'grave'], û: ['u', 'circ'], ü: ['u', 'dia'],
  î: ['ı', 'circ'], ï: ['ı', 'dia'], ô: ['o', 'circ'], ö: ['o', 'dia'], ç: ['c', 'ced'],
  É: ['E', 'acute'], È: ['E', 'grave'], Ê: ['E', 'circ'], Ë: ['E', 'dia'],
  À: ['A', 'grave'], Â: ['A', 'circ'], Ù: ['U', 'grave'], Û: ['U', 'circ'],
  Î: ['I', 'circ'], Ï: ['I', 'dia'], Ô: ['O', 'circ'], Ç: ['C', 'ced'],
};
const ALIASES = { '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', ' ': ' ', ' ': ' ', œ: 'oe', Œ: 'OE' };

// Chaque glyphe devient : { w, runs: [[x, y, longueur], ...] } (y peut être négatif pour les accents)
const GLYPHS = new Map();

function build(rows, fixedWidth) {
  const runs = [];
  let w = fixedWidth || 0;
  rows.forEach(([y, row]) => {
    let start = -1;
    for (let x = 0; x <= row.length; x++) {
      const on = row[x] === 'X';
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        runs.push([start, y, x - start]);
        if (x > w) w = x;
        start = -1;
      }
    }
    if (!fixedWidth && row.length > w) w = row.length;
  });
  return { w, runs };
}

for (const ch of Object.keys(RAW)) {
  const rows = RAW[ch].split('/').map((r, y) => [y, r]);
  GLYPHS.set(ch, build(rows, /[0-9]/.test(ch) ? 5 : 0));
}
for (const ch of Object.keys(COMPOSED)) {
  const [base, acc] = COMPOSED[ch];
  const baseRows = RAW[base].split('/');
  const w = baseRows[0].length;
  const pad = (r) => (w >= 5 ? r : r.slice(Math.floor((5 - w) / 2), Math.floor((5 - w) / 2) + w));
  let rows = baseRows.map((r, y) => [y, r]);
  if (acc === 'ced') {
    rows = rows.concat([[7, pad('..X..')], [8, pad('.XX..')]]);
  } else {
    const upper = base === base.toUpperCase() && base !== 'ı';
    const top = upper ? -3 : 0; // au-dessus des capitales, ou dans le vide au-dessus des minuscules
    if (!upper) rows = rows.filter(([y]) => y >= 2);
    rows = rows.concat(ACCENTS[acc].map((r, i) => [top + i + (upper ? 0 : 0), pad(r)]));
  }
  GLYPHS.set(ch, build(rows));
}
GLYPHS.set(' ', { w: 3, runs: [] });

export const FONT_H = 7;
export const LINE_H = 10;

export function normalize(str) {
  let out = '';
  for (const ch of String(str)) out += ALIASES[ch] !== undefined ? ALIASES[ch] : ch;
  return out;
}

export function glyph(ch) {
  return GLYPHS.get(ch) || GLYPHS.get('?');
}

export function measure(str, scale = 1) {
  const s = normalize(str);
  let w = 0;
  for (const ch of s) w += glyph(ch).w + 1;
  return Math.max(0, w - 1) * scale;
}
