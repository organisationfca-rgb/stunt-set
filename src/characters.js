// Les 12 cascadeurs. Tous dessinés par le code, sur la même base, avec les mêmes animations.
// La diversité passe uniquement par la teinte de peau, les cheveux, la coiffure et la tenue.
import { G, makeCanvas, withCtx, rect, disc, line, outlined, shade } from './gfx.js';

// efface un pixel du sprite en cours (pour arrondir un coin)
function G_clear(x, y) {
  G.ctx.clearRect(x, y, 1, 1);
}

const DARK = '#1a1326';

export const CHARS = [
  { id: 'nova', name: 'NOVA', build: 'f', skin: '#f2cda8', shade: '#d9a67e', hair: '#b5442a', style: 'ponytail', suit: '#19c3c9', suit2: '#0e7f8c', accent: '#ff2e97', extra: 'goggles' },
  { id: 'blitz', name: 'BLITZ', build: 'm', skin: '#f0c39b', shade: '#d19a72', hair: '#e7c15a', style: 'short', suit: '#ff8a3c', suit2: '#b3501a', accent: '#ffd23f', extra: 'harness' },
  { id: 'flare', name: 'FLARE', build: 'f', skin: '#7a4c2c', shade: '#5a361e', hair: '#20140f', style: 'bun', suit: '#ff2e97', suit2: '#8e1a5c', accent: '#ffd23f', extra: 'gloves' },
  { id: 'onyx', name: 'ONYX', build: 'm', skin: '#6a4226', shade: '#4d2e19', hair: '#1c1412', style: 'fade', suit: '#ffd23f', suit2: '#8a6a10', accent: '#2de2e6', extra: 'kneepads' },
  { id: 'echo', name: 'ECHO', build: 'f', skin: '#d1a074', shade: '#ad7d52', hair: '#2a1c18', style: 'longcurly', suit: '#8f5cff', suit2: '#4d2ba6', accent: '#2de2e6', extra: 'bandana' },
  { id: 'rift', name: 'RIFT', build: 'm', skin: '#c9966a', shade: '#a67648', hair: '#231a16', style: 'wavy', beard: true, suit: '#1fa37f', suit2: '#125c4c', accent: '#ff8a3c', extra: 'jacket' },
  { id: 'comet', name: 'COMET', build: 'f', skin: '#f0cfa8', shade: '#cfa77f', hair: '#17141c', style: 'bob', suit: '#9be33a', suit2: '#3c7a1e', accent: '#ff71ce', extra: 'goggles' },
  { id: 'volt', name: 'VOLT', build: 'm', skin: '#ecc79f', shade: '#c99f76', hair: '#141219', style: 'undercut', suit: '#ff3b4e', suit2: '#96202d', accent: '#f2f2f2', extra: 'jacket' },
  { id: 'pixel', name: 'PIXEL', build: 'f', skin: '#b07a48', shade: '#8c5c30', hair: '#17110f', style: 'braid', suit: '#ff71ce', suit2: '#a03a86', accent: '#ffd23f', extra: 'kneepads' },
  { id: 'dash', name: 'DASH', build: 'm', skin: '#a8703f', shade: '#855529', hair: '#17110f', style: 'quiff', suit: '#3a6cf4', suit2: '#1d3a9a', accent: '#ff8a3c', extra: 'harness' },
  { id: 'turbo', name: 'TURBO', build: 'f', skin: '#d9aa7c', shade: '#b58456', hair: '#5a3620', style: 'wavyshoulder', suit: '#ff6a2b', suit2: '#8f2b14', accent: '#2de2e6', extra: 'headband' },
  { id: 'jet', name: 'JET', build: 'm', skin: '#d0a074', shade: '#aa7b50', hair: '#2b1d14', style: 'curlytop', suit: '#3dfc9a', suit2: '#1d7a52', accent: '#ff2e97', extra: 'gloves' },
];

export function getChar(id) {
  return CHARS.find((c) => c.id === id) || CHARS[0];
}

const cache = new Map();
function cached(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const [c, ctx] = makeCanvas(w, h);
  withCtx(ctx, draw);
  const out = outlined(c); // contour sombre, comme dans les jeux d'arcade
  cache.set(key, out);
  return out;
}

// ---------- Personnage debout, de face (24 x 40) ----------
function drawHairFront(ch) {
  const h = ch.hair;
  switch (ch.style) {
    case 'short':
      rect(8, 3, 8, 3, h); rect(8, 6, 1, 1, h); rect(15, 6, 1, 1, h); break;
    case 'fade':
      rect(9, 3, 6, 2, h); rect(8, 5, 8, 1, ch.shade); rect(9, 5, 6, 1, h); break;
    case 'ponytail':
      rect(8, 3, 8, 3, h); rect(8, 6, 1, 2, h); rect(15, 6, 1, 1, h); rect(16, 5, 2, 3, h); rect(17, 8, 2, 5, h); break;
    case 'bun':
      rect(8, 3, 8, 3, h); rect(10, 0, 4, 3, h); rect(8, 6, 1, 1, h); rect(15, 6, 1, 1, h); break;
    case 'wavy':
      rect(8, 2, 8, 4, h); rect(7, 4, 1, 3, h); rect(16, 4, 1, 3, h); rect(9, 1, 2, 1, h); rect(13, 1, 2, 1, h); break;
    case 'longcurly':
      rect(8, 2, 8, 4, h); rect(9, 1, 6, 1, h);
      for (let y = 4; y < 16; y++) { rect(y % 2 ? 6 : 7, y, 2, 1, h); rect(y % 2 ? 16 : 15, y, 2, 1, h); }
      break;
    case 'undercut':
      rect(8, 2, 8, 3, h); rect(13, 1, 3, 1, h); rect(8, 5, 3, 1, h); break;
    case 'bob':
      rect(8, 3, 8, 3, h); rect(7, 4, 2, 8, h); rect(15, 4, 2, 8, h); rect(9, 6, 2, 1, h); break;
    case 'quiff':
      rect(8, 3, 8, 3, h); rect(10, 1, 6, 2, h); rect(12, 0, 3, 1, h); break;
    case 'braid':
      rect(8, 3, 8, 3, h); rect(8, 6, 1, 2, h); rect(15, 6, 1, 2, h);
      for (let y = 8; y < 19; y++) rect(y % 2 ? 5 : 6, y, 2, 1, h);
      rect(5, 19, 2, 1, ch.accent);
      break;
    case 'curlytop':
      rect(8, 3, 8, 3, h);
      for (let x = 8; x < 16; x += 2) rect(x, 1 + ((x / 2) % 2), 2, 2, h);
      break;
    case 'wavyshoulder':
      rect(8, 3, 8, 3, h); rect(7, 4, 1, 10, h); rect(16, 4, 1, 10, h); rect(6, 9, 1, 5, h); rect(17, 9, 1, 5, h); break;
  }
}

function drawStanding(ch) {
  const f = ch.build === 'f';
  // jambes et bottes
  const lx = f ? 8 : 7;
  const lw = f ? 4 : 5;
  const rx = 13;
  rect(lx, 25, lw, 11, ch.suit); rect(rx, 25, lw, 11, ch.suit);
  rect(lx + lw - 1, 25, 1, 11, ch.suit2); rect(rx + lw - 1, 25, 1, 11, ch.suit2);
  rect(lx - 1, 36, lw + 1, 3, DARK); rect(rx, 36, lw + 1, 3, DARK);
  rect(lx - 1, 38, lw + 1, 1, '#000'); rect(rx, 38, lw + 1, 1, '#000');
  // torse
  const tx = f ? 7 : 6;
  const tw = f ? 10 : 12;
  rect(tx, 13, tw, 11, ch.suit);
  rect(tx + tw - 2, 14, 2, 10, ch.suit2);
  if (f) for (let y = 19; y < 24; y++) { G_clear(7, y); G_clear(16, y); } // taille légèrement marquée
  rect(tx, 24, tw, 1, DARK); // ceinture
  rect(11, 24, 2, 1, ch.accent);
  // bras
  const ax = f ? 4 : 3;
  const bx = f ? 17 : 18;
  rect(ax, 13, 3, 11, ch.suit); rect(bx, 13, 3, 11, ch.suit);
  rect(bx + 2, 14, 1, 10, ch.suit2);
  const glove = ch.extra === 'gloves' ? ch.accent : DARK;
  rect(ax, 24, 3, 2, ch.extra === 'gloves' ? glove : ch.skin); rect(bx, 24, 3, 2, ch.extra === 'gloves' ? glove : ch.skin);
  // épaulettes renforcées
  rect(ax, 13, 3, 2, ch.suit2); rect(bx, 13, 3, 2, ch.suit2);
  // détails de tenue
  rect(12, 14, 1, 10, ch.accent); // fermeture
  if (ch.extra === 'harness') {
    line(tx + 1, 14, tx + tw - 2, 23, ch.accent); line(tx + tw - 2, 14, tx + 1, 23, ch.accent);
    rect(lx, 27, lw, 1, ch.accent); rect(rx, 27, lw, 1, ch.accent);
  }
  if (ch.extra === 'jacket') {
    rect(tx, 13, tw, 6, ch.suit2); rect(tx, 17, tw, 1, ch.accent); rect(11, 13, 2, 4, ch.suit);
    rect(ax, 18, 3, 1, ch.accent); rect(bx, 18, 3, 1, ch.accent);
  }
  if (ch.extra === 'kneepads' || ch.extra === 'harness' || ch.extra === 'gloves') {
    rect(lx, 30, lw, 2, ch.extra === 'kneepads' ? ch.accent : DARK); rect(rx, 30, lw, 2, ch.extra === 'kneepads' ? ch.accent : DARK);
  }
  rect(ax, 19, 3, 1, DARK); rect(bx, 19, 3, 1, DARK); // coudières
  // cou et tête
  rect(11, 12, 2, 1, ch.shade);
  rect(8, 4, 8, 8, ch.skin);
  rect(15, 5, 1, 6, ch.shade);
  G_clear(8, 4); G_clear(15, 4);
  if (f) { G_clear(8, 11); G_clear(15, 11); } else { rect(8, 11, 8, 1, ch.shade); }
  rect(10, 8, 1, 1, DARK); rect(13, 8, 1, 1, DARK);
  rect(11, 10, 2, 1, ch.shade);
  if (ch.beard) { rect(8, 10, 8, 2, ch.hair); rect(11, 10, 2, 1, ch.shade); }
  rect(tx, 15, 1, 9, 'rgba(255,255,255,0.28)'); rect(lx, 26, 1, 9, 'rgba(255,255,255,0.28)'); rect(rx, 26, 1, 9, 'rgba(255,255,255,0.18)'); rect(9, 6, 1, 4, 'rgba(255,255,255,0.25)');
  drawHairFront(ch);
  if (ch.extra === 'goggles') { rect(8, 5, 8, 2, DARK); rect(9, 5, 2, 2, ch.accent); rect(13, 5, 2, 2, ch.accent); }
  if (ch.extra === 'headband') { rect(8, 5, 8, 1, ch.accent); rect(16, 5, 2, 1, ch.accent); rect(17, 6, 1, 2, ch.accent); }
  if (ch.extra === 'bandana') { rect(9, 12, 6, 1, ch.accent); rect(10, 13, 4, 1, ch.accent); rect(11, 14, 2, 1, ch.accent); }
}

export function standing(id) {
  const ch = getChar(id);
  return cached('stand:' + ch.id, 24, 40, () => drawStanding(ch));
}

// ---------- Personnage détaillé, de face (48 x 80) : écran titre, choix du cascadeur, illustrations ----------
// Boîte ombrée : arête claire à gauche, ombre à droite et en bas. C'est ce qui donne le volume.
function sbox(x, y, w, h, base) {
  const sh = Math.max(1, Math.round(w / 5));
  rect(x, y, w, h, base);
  rect(x, y, 1, h, shade(base, 0.3));
  rect(x + w - sh, y, sh, h, shade(base, -0.24));
  rect(x, y + h - 1, w, 1, shade(base, -0.32));
}

function hairHero(ch) {
  const h = ch.hair;
  const hl = shade(h, 0.32);
  const cap = (y0, y1) => { rect(16, y0, 16, y1 - y0 + 1, h); rect(17, y0 - 1, 14, 1, h); };
  switch (ch.style) {
    case 'short':
      cap(3, 8); rect(15, 6, 1, 6, h); rect(32, 6, 1, 5, h); rect(17, 9, 4, 1, h); rect(19, 4, 6, 1, hl); break;
    case 'fade':
      rect(17, 3, 14, 4, h); rect(18, 2, 12, 1, h); rect(16, 7, 16, 2, shade(ch.shade, -0.25)); rect(18, 7, 12, 1, h); rect(20, 3, 5, 1, hl); break;
    case 'ponytail':
      cap(3, 8); rect(15, 6, 1, 5, h); rect(17, 9, 5, 1, h); rect(32, 5, 3, 4, h); rect(33, 9, 2, 2, ch.accent);
      rect(33, 11, 4, 13, h); rect(34, 24, 3, 3, h); rect(34, 12, 1, 10, hl); rect(19, 4, 6, 1, hl); break;
    case 'bun':
      cap(4, 8); rect(20, 0, 8, 4, h); rect(22, 1, 3, 1, hl); rect(15, 7, 1, 4, h); rect(32, 7, 1, 4, h); rect(19, 5, 5, 1, hl); break;
    case 'wavy':
      cap(2, 8); rect(15, 5, 1, 8, h); rect(32, 5, 1, 8, h); rect(18, 0, 4, 1, h); rect(25, 0, 5, 1, h);
      rect(17, 9, 4, 1, h); rect(26, 9, 5, 1, h); rect(20, 3, 6, 1, hl); break;
    case 'longcurly':
      cap(2, 8);
      for (let y = 6; y < 32; y++) { const o = (y >> 1) % 2; rect(12 + o, y, 4, 1, h); rect(32 - o, y, 4, 1, h); }
      rect(13, 31, 4, 2, h); rect(31, 31, 4, 2, h); rect(17, 9, 4, 1, h); rect(20, 3, 6, 1, hl); rect(13, 14, 1, 10, hl); break;
    case 'undercut':
      rect(16, 2, 17, 5, h); rect(18, 1, 14, 1, h); rect(24, 0, 8, 1, h); rect(16, 7, 6, 2, h);
      rect(27, 7, 5, 1, shade(ch.shade, -0.2)); rect(20, 3, 8, 1, hl); break;
    case 'bob':
      cap(3, 8); rect(13, 6, 3, 15, h); rect(32, 6, 3, 15, h); rect(14, 21, 3, 1, h); rect(31, 21, 3, 1, h);
      rect(16, 9, 16, 1, h); rect(19, 4, 7, 1, hl); rect(13, 9, 1, 9, hl); break;
    case 'quiff':
      cap(4, 8); rect(20, 1, 12, 3, h); rect(23, 0, 8, 1, h); rect(15, 7, 1, 4, h); rect(32, 7, 1, 4, h); rect(22, 2, 6, 1, hl); break;
    case 'braid':
      cap(3, 8); rect(15, 6, 1, 6, h); rect(32, 6, 1, 6, h); rect(17, 9, 4, 1, h);
      for (let y = 12; y < 38; y++) rect(10 + ((y >> 1) % 2), y, 4, 1, h);
      rect(10, 38, 4, 2, ch.accent); rect(11, 40, 3, 3, h); rect(19, 4, 6, 1, hl); break;
    case 'curlytop':
      cap(4, 8);
      for (let x = 16; x < 32; x += 4) disc(x + 2, 3 - ((x >> 2) % 2), 3, h);
      rect(19, 2, 2, 1, hl); rect(27, 1, 2, 1, hl); break;
    case 'wavyshoulder':
      cap(3, 8);
      for (let y = 6; y < 28; y++) { const o = (y >> 2) % 2; rect(13 + o, y, 3, 1, h); rect(32 - o, y, 3, 1, h); }
      rect(17, 9, 5, 1, h); rect(19, 4, 6, 1, hl); break;
  }
}

function drawHero(ch) {
  const f = ch.build === 'f';
  const { skin, suit, accent } = ch;
  const sk2 = ch.shade;
  const s2 = ch.suit2;
  const hand = ch.extra === 'gloves' ? accent : skin;
  // --- jambes, genouillères, bottes ---
  const lw = f ? 9 : 10;
  const lx = f ? 14 : 13;
  const rx = 25;
  sbox(lx, 50, lw, 21, suit);
  sbox(rx, 50, lw, 21, suit);
  rect(lx + lw, 50, rx - lx - lw, 5, shade(suit, -0.4));
  const kp = ch.extra === 'kneepads' ? accent : '#2a2333';
  sbox(lx, 59, lw, 5, kp);
  sbox(rx, 59, lw, 5, kp);
  sbox(lx - 2, 69, lw + 3, 9, '#2f2839');
  sbox(rx - 1, 69, lw + 3, 9, '#2f2839');
  rect(lx - 2, 77, lw + 3, 1, '#0a0612');
  rect(rx - 1, 77, lw + 3, 1, '#0a0612');
  rect(lx - 1, 71, lw + 1, 1, accent);
  rect(rx, 71, lw + 1, 1, accent);
  // --- bras, épaulettes, coudières, mains ---
  const tx = f ? 14 : 12;
  const tw = f ? 20 : 24;
  const aw = f ? 5 : 6;
  const ax = tx - aw - 1;
  const bx = tx + tw + 1;
  sbox(ax, 26, aw, 21, suit);
  sbox(bx, 26, aw, 21, suit);
  sbox(ax, 35, aw, 4, '#2a2333');
  sbox(bx, 35, aw, 4, '#2a2333');
  rect(ax, 44, aw, 2, accent);
  rect(bx, 44, aw, 2, accent);
  sbox(ax, 47, aw, 5, hand);
  sbox(bx, 47, aw, 5, hand);
  // --- torse ---
  sbox(tx, 24, tw, 24, suit);
  if (f) for (let y = 36; y < 47; y++) { G_clear(tx, y); G_clear(tx + tw - 1, y); }
  rect(tx + 2, 28, tw - 4, 1, shade(suit, 0.3));
  rect(tx + 3, 34, tw - 6, 1, shade(suit, -0.26));
  if (ch.extra === 'jacket') {
    // veste de moto : haut plus sombre, bande en travers, rayures sur les manches
    sbox(tx, 24, tw, 13, s2);
    rect(tx, 36, tw, 2, accent);
    rect(ax, 30, aw, 2, accent);
    rect(bx, 30, aw, 2, accent);
    rect(21, 24, 6, 6, shade(suit, -0.3));
  }
  rect(23, 25, 2, 23, shade(suit, -0.45));
  rect(23, 25, 1, 23, accent); // fermeture éclair
  sbox(ax - 1, 24, aw + 3, 6, s2);
  sbox(bx - 2, 24, aw + 3, 6, s2);
  if (ch.extra === 'harness') {
    line(tx + 3, 26, tx + tw - 4, 45, accent, 2);
    line(tx + tw - 4, 26, tx + 3, 45, accent, 2);
    rect(22, 34, 4, 4, '#e9e4f4');
    rect(23, 35, 2, 2, '#2a2333');
    rect(lx, 54, lw, 2, accent);
    rect(rx, 54, lw, 2, accent);
  }
  sbox(tx + (f ? 1 : 0), 47, tw - (f ? 2 : 0), 4, '#2a2333'); // ceinture
  rect(22, 47, 4, 4, accent);
  rect(23, 48, 2, 2, '#2a2333');
  // --- cou, col, tête ---
  rect(21, 20, 6, 4, sk2);
  rect(19, 23, 10, 2, s2);
  rect(22, 23, 4, 1, sk2);
  if (ch.extra === 'bandana') { rect(18, 22, 12, 3, accent); rect(20, 25, 8, 2, accent); rect(22, 27, 4, 2, accent); rect(19, 23, 10, 1, shade(accent, -0.3)); }
  rect(16, 5, 16, 17, skin);
  rect(29, 7, 3, 14, sk2);
  rect(17, 21, 14, 1, sk2);
  [[16, 5], [17, 5], [16, 6], [31, 5], [30, 5], [31, 6], [16, 21], [31, 21]].forEach(([x, y]) => G_clear(x, y));
  if (f) [[17, 21], [30, 21], [16, 20], [31, 20]].forEach(([x, y]) => G_clear(x, y));
  rect(15, 12, 1, 3, sk2);
  rect(32, 12, 1, 3, sk2);
  // visage : sourcils, yeux, nez, bouche
  const brow = shade(ch.hair, -0.1);
  rect(18, 10, 4, 1, brow);
  rect(26, 10, 4, 1, brow);
  rect(18, 12, 4, 2, '#ffffff');
  rect(26, 12, 4, 2, '#ffffff');
  rect(19, 12, 2, 2, '#1a1326');
  rect(27, 12, 2, 2, '#1a1326');
  if (f) { rect(17, 12, 1, 1, '#1a1326'); rect(30, 12, 1, 1, '#1a1326'); }
  rect(24, 14, 1, 3, sk2);
  if (ch.beard) { rect(17, 16, 14, 5, ch.hair); rect(18, 21, 12, 1, ch.hair); rect(21, 17, 6, 3, skin); }
  rect(21, 18, 6, 1, shade(skin, -0.5));
  rect(20, 17, 1, 1, shade(skin, -0.35));
  rect(27, 17, 1, 1, shade(skin, -0.35));
  hairHero(ch);
  if (ch.extra === 'goggles') {
    rect(15, 6, 18, 5, '#2a2333');
    sbox(17, 7, 6, 3, accent);
    sbox(25, 7, 6, 3, accent);
    rect(18, 7, 2, 1, '#ffffff');
    rect(26, 7, 2, 1, '#ffffff');
  }
  if (ch.extra === 'headband') { rect(15, 8, 18, 2, accent); rect(15, 9, 18, 1, shade(accent, -0.3)); rect(33, 8, 3, 2, accent); rect(34, 10, 2, 5, accent); }
}

// Grand sprite du personnage (pour les écrans où on le voit de près)
export function hero(id) {
  const ch = getChar(id);
  return cached('hero:' + ch.id, 48, 80, () => drawHero(ch));
}

// ---------- Cascadeur en chute libre, vu du dessus (32 x 32) ----------
// pose : 'back' (à plat ventre, on voit son dos), 'front' (sur le dos, bras écartés), 'dos' (position de réception)
function drawFaller(ch, pose) {
  const f = ch.build === 'f';
  const hand = ch.extra === 'gloves' ? ch.accent : ch.skin;
  const tw = f ? 9 : 11;
  const tx = 16 - Math.floor(tw / 2);
  // jambes
  if (pose === 'dos') {
    line(14, 21, 13, 28, ch.suit, 3); line(18, 21, 19, 28, ch.suit, 3);
    disc(13, 29, 1.6, DARK); disc(19, 29, 1.6, DARK);
  } else {
    line(13, 21, 9, 28, ch.suit, 3); line(19, 21, 23, 28, ch.suit, 3);
    disc(8, 29, 1.6, DARK); disc(24, 29, 1.6, DARK);
    if (ch.extra === 'kneepads') { rect(10, 24, 2, 2, ch.accent); rect(20, 24, 2, 2, ch.accent); }
  }
  // bras
  if (pose !== 'dos') {
    line(tx, 12, 6, 7, ch.suit, 3); line(tx + tw - 1, 12, 26, 7, ch.suit, 3);
    disc(5, 6, 1.5, hand); disc(27, 6, 1.5, hand);
  }
  // torse
  rect(tx, 10, tw, 12, ch.suit);
  rect(tx + tw - 2, 11, 2, 11, ch.suit2);
  rect(tx, 21, tw, 1, DARK);
  if (pose === 'back') {
    if (ch.extra === 'harness') { line(tx + 1, 11, tx + tw - 2, 20, ch.accent); line(tx + tw - 2, 11, tx + 1, 20, ch.accent); }
    else if (ch.extra === 'jacket') { rect(tx, 10, tw, 5, ch.suit2); rect(tx, 15, tw, 1, ch.accent); }
    else rect(tx + 2, 12, tw - 4, 2, ch.accent); // bande dorsale
  } else {
    rect(16, 11, 1, 10, ch.accent); // fermeture
    if (ch.extra === 'jacket') { rect(tx, 10, tw, 5, ch.suit2); rect(tx, 15, tw, 1, ch.accent); }
  }
  if (pose === 'dos') {
    // bras croisés sur la poitrine
    line(tx, 12, tx + tw - 3, 17, ch.suit, 3); line(tx + tw - 1, 12, tx + 2, 17, ch.suit, 3);
    disc(tx + tw - 3, 17, 1.4, hand); disc(tx + 2, 17, 1.4, hand);
  }
  // tête
  if (pose === 'back') {
    disc(16, 7, 4, ch.style === 'fade' ? ch.shade : ch.hair);
    if (ch.style === 'fade') disc(16, 7, 3, ch.hair);
    if (ch.style === 'ponytail' || ch.style === 'braid') { rect(15, 10, 2, 5, ch.hair); rect(15, 15, 2, 1, ch.accent); }
    if (ch.style === 'bun') disc(16, 7, 2, ch.shade === ch.hair ? DARK : '#3a261c');
    if (ch.style === 'longcurly' || ch.style === 'wavyshoulder' || ch.style === 'bob') { disc(16, 8, 5, ch.hair); }
    if (ch.extra === 'headband' || ch.extra === 'goggles') { rect(12, 5, 9, 1, ch.accent); }
  } else {
    disc(16, 7, 4, ch.skin);
    rect(12, 3, 9, 3, ch.hair);
    if (ch.style === 'longcurly' || ch.style === 'wavyshoulder' || ch.style === 'bob') { rect(11, 5, 2, 6, ch.hair); rect(20, 5, 2, 6, ch.hair); }
    rect(14, 7, 1, 1, DARK); rect(18, 7, 1, 1, DARK);
    rect(15, 9, 3, 1, ch.shade);
    if (ch.beard) rect(13, 9, 7, 2, ch.hair);
    if (ch.extra === 'goggles') { rect(12, 5, 9, 1, DARK); rect(13, 5, 2, 1, ch.accent); rect(18, 5, 2, 1, ch.accent); }
    if (ch.extra === 'headband') rect(12, 5, 9, 1, ch.accent);
  }
}

export function faller(id, pose) {
  const ch = getChar(id);
  return cached(`fall:${ch.id}:${pose}`, 32, 32, () => drawFaller(ch, pose));
}

// Le même, avec un second contour blanc : il ressort sur n'importe quel décor pendant la chute.
export function fallerHi(id, pose) {
  const key = 'fallhi:' + id + ':' + pose;
  if (!cache.has(key)) cache.set(key, outlined(faller(id, pose), '#ffffff'));
  return cache.get(key);
}

// ---------- Bottes vues par la caméra embarquée (phase de visée) ----------
export function boots(id) {
  const ch = getChar(id);
  return cached('boots:' + ch.id, 44, 26, () => {
    // deux jambes qui dépassent du bas de l'écran, bottes posées au bord de la plateforme
    rect(6, 10, 12, 16, ch.suit); rect(26, 10, 12, 16, ch.suit);
    rect(15, 10, 3, 16, ch.suit2); rect(35, 10, 3, 16, ch.suit2);
    if (ch.extra === 'kneepads') { rect(6, 20, 12, 4, ch.accent); rect(26, 20, 12, 4, ch.accent); }
    rect(5, 0, 14, 12, DARK); rect(25, 0, 14, 12, DARK);
    rect(5, 0, 14, 3, '#000'); rect(25, 0, 14, 3, '#000');
    rect(7, 5, 10, 1, ch.accent); rect(27, 5, 10, 1, ch.accent);
  });
}
