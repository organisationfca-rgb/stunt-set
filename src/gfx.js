// Affichage : un petit canvas en basse résolution, agrandi par un multiple entier (pixels nets).
import { glyph, normalize, measure, LINE_H } from './font.js';

export const G = {
  canvas: null,
  ctx: null, // contexte de dessin courant (peut être redirigé vers un tampon)
  main: null, // contexte du canvas visible
  W: 180,
  H: 320,
  scale: 2,
  safeTop: 0,
  safeBottom: 0,
  onResize: [],
};

// Palette synthwave commune
export const PAL = {
  night: '#150a2e',
  deep: '#24104a',
  purple: '#4a1d7a',
  magenta: '#ff2e97',
  pink: '#ff71ce',
  cyan: '#2de2e6',
  blue: '#3a6cf4',
  orange: '#ff8a3c',
  yellow: '#ffd23f',
  red: '#ff3b4e',
  green: '#3dfc9a',
  white: '#ffffff',
  grey: '#9d8fc0',
  dark: '#0b0518',
  black: '#000000',
};

const TARGET_W = 180;

export function initGfx(canvas) {
  G.canvas = canvas;
  G.main = canvas.getContext('2d', { alpha: false });
  G.ctx = G.main;
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
}

function safeInset(name) {
  const probe = document.getElementById('safe-probe');
  if (!probe) return 0;
  return parseFloat(getComputedStyle(probe)[name]) || 0;
}

export function resize() {
  const dpr = window.devicePixelRatio || 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Cadre portrait : sur un écran large (ordinateur, téléphone couché), on garde une colonne 9:16 centrée.
  let fw = vw;
  let fh = vh;
  if (fw / fh > 0.66) fw = Math.floor(fh * 0.5625);
  if (fh / fw > 2.3) fh = Math.floor(fw * 2.3);
  // On arrondit toujours vers le bas : l'écran du jeu fait ainsi au moins 180 pixels de large (et 320 de haut),
  // jamais moins. Tous les écrans sont dessinés pour tenir dans cette taille minimale.
  const scale = Math.max(1, Math.floor((fw * dpr) / TARGET_W));
  const W = Math.max(120, Math.floor((fw * dpr) / scale));
  const H = Math.max(200, Math.floor((fh * dpr) / scale));
  G.W = W;
  G.H = H;
  G.scale = scale;
  const c = G.canvas;
  c.width = W;
  c.height = H;
  c.style.width = (W * scale) / dpr + 'px';
  c.style.height = (H * scale) / dpr + 'px';
  G.main.imageSmoothingEnabled = false;
  const cssPerPx = scale / dpr;
  const full = fw === vw && fh === vh;
  G.safeTop = full ? Math.ceil(safeInset('paddingTop') / cssPerPx) : 0;
  G.safeBottom = full ? Math.ceil(safeInset('paddingBottom') / cssPerPx) : 0;
  G.onResize.forEach((fn) => fn());
}

// Crée une image hors écran (pour dessiner un sprite une seule fois).
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

// Renvoie une copie du sprite entourée d'un contour sombre d'un pixel (comme dans les jeux d'arcade).
export function outlined(src, color = '#140a22') {
  const [m, mctx] = makeCanvas(src.width, src.height);
  mctx.drawImage(src, 0, 0);
  mctx.globalCompositeOperation = 'source-in';
  mctx.fillStyle = color;
  mctx.fillRect(0, 0, m.width, m.height);
  const [c, ctx] = makeCanvas(src.width + 2, src.height + 2);
  [[0, 1], [2, 1], [1, 0], [1, 2]].forEach(([dx, dy]) => ctx.drawImage(m, dx, dy));
  ctx.drawImage(src, 1, 1);
  return c;
}

// Éclaircit (f > 0) ou assombrit (f < 0) une couleur « #rrggbb ».
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))));
  const r = ch(n >> 16);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// Dessine temporairement dans un autre contexte.
export function withCtx(ctx, fn) {
  const prev = G.ctx;
  G.ctx = ctx;
  try {
    fn();
  } finally {
    G.ctx = prev;
  }
}

export function rect(x, y, w, h, color) {
  const c = G.ctx;
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function frame(x, y, w, h, color, t = 1) {
  rect(x, y, w, t, color);
  rect(x, y + h - t, w, t, color);
  rect(x, y, t, h, color);
  rect(x + w - t, y, t, h, color);
}

// Disque plein aux bords nets
export function disc(cx, cy, r, color) {
  const c = G.ctx;
  c.fillStyle = color;
  cx = Math.round(cx);
  cy = Math.round(cy);
  if (r < 0.75) {
    c.fillRect(cx, cy, 1, 1);
    return;
  }
  const r2 = r * r;
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
    const span = r2 - dy * dy;
    if (span < 0) continue;
    const dx = Math.floor(Math.sqrt(span));
    c.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
  }
}

// Anneau aux bords nets (rayon extérieur r, épaisseur th)
export function ring(cx, cy, r, th, color) {
  const c = G.ctx;
  c.fillStyle = color;
  cx = Math.round(cx);
  cy = Math.round(cy);
  const ro2 = r * r;
  const ri = Math.max(0, r - th);
  const ri2 = ri * ri;
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
    const so = ro2 - dy * dy;
    if (so < 0) continue;
    const xo = Math.floor(Math.sqrt(so));
    const si = ri2 - dy * dy;
    if (si <= 0) {
      c.fillRect(cx - xo, cy + dy, xo * 2 + 1, 1);
    } else {
      const xi = Math.ceil(Math.sqrt(si));
      if (xo >= xi) {
        c.fillRect(cx - xo, cy + dy, xo - xi + 1, 1);
        c.fillRect(cx + xi, cy + dy, xo - xi + 1, 1);
      }
    }
  }
}

// Trait net (épaisseur th)
export function line(x0, y0, x1, y1, color, th = 1) {
  const c = G.ctx;
  c.fillStyle = color;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  const o = Math.floor(th / 2);
  for (let n = 0; n < 2000; n++) {
    c.fillRect(x0 - o, y0 - o, th, th);
    if (x0 === x1 && y0 === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

function drawGlyphs(s, x, y, scale, color) {
  const c = G.ctx;
  c.fillStyle = color;
  for (const ch of s) {
    const g = glyph(ch);
    for (let i = 0; i < g.runs.length; i++) {
      const r = g.runs[i];
      c.fillRect(x + r[0] * scale, y + r[1] * scale, r[2] * scale, scale);
    }
    x += (g.w + 1) * scale;
  }
}

// Texte pixel. opts : color, scale, align ('left' | 'center' | 'right'), shadow (couleur), outline (couleur)
export function text(str, x, y, opts = {}) {
  const s = normalize(str);
  const scale = opts.scale || 1;
  const color = opts.color || PAL.white;
  x = Math.round(x);
  y = Math.round(y);
  if (opts.align === 'center') x -= Math.round(measure(s, scale) / 2);
  else if (opts.align === 'right') x -= measure(s, scale);
  // contrôle pendant les tests : on note tout texte qui dépasse de l'écran (G.overflow = new Set() pour l'activer)
  if (G.overflow && G.ctx === G.main && (x < 0 || x + measure(s, scale) > G.W)) G.overflow.add(s);
  if (opts.outline) {
    for (let ox = -1; ox <= 1; ox++)
      for (let oy = -1; oy <= 1; oy++) if (ox || oy) drawGlyphs(s, x + ox * scale, y + oy * scale, scale, opts.outline);
  }
  if (opts.shadow) drawGlyphs(s, x + scale, y + scale, scale, opts.shadow);
  drawGlyphs(s, x, y, scale, color);
}

// Coupe un texte en lignes qui tiennent dans maxW pixels.
export function wrap(str, maxW, scale = 1) {
  const out = [];
  for (const para of String(str).split('\n')) {
    let cur = '';
    for (const word of para.split(' ')) {
      const test = cur ? cur + ' ' + word : word;
      if (measure(test, scale) <= maxW || !cur) cur = test;
      else {
        out.push(cur);
        cur = word;
      }
    }
    out.push(cur);
  }
  return out;
}

// Texte sur plusieurs lignes ; renvoie la hauteur occupée.
export function paragraph(str, x, y, maxW, opts = {}) {
  const scale = opts.scale || 1;
  const lh = (opts.lineHeight || LINE_H) * scale;
  const lines = wrap(str, maxW, scale);
  lines.forEach((l, i) => text(l, x, y + i * lh, opts));
  return lines.length * lh;
}

// Dessine un sprite (canvas) centré, avec agrandissement, miroir et rotation éventuels.
export function sprite(img, cx, cy, sx = 1, sy = sx, rot = 0, alpha = 1) {
  const c = G.ctx;
  const w = img.width * Math.abs(sx);
  const h = img.height * Math.abs(sy);
  if (w < 0.5 || h < 0.5) return;
  c.save();
  if (alpha !== 1) c.globalAlpha = alpha;
  c.translate(Math.round(cx), Math.round(cy));
  if (rot) c.rotate(rot);
  c.scale(sx, sy);
  c.drawImage(img, -img.width / 2, -img.height / 2);
  c.restore();
}

export function alpha(a, fn) {
  const c = G.ctx;
  const prev = c.globalAlpha;
  c.globalAlpha = prev * Math.max(0, Math.min(1, a));
  fn();
  c.globalAlpha = prev;
}

// Dégradé vertical en aplats (bandes), façon 16 bits.
export function bands(x, y, w, h, colors) {
  const n = colors.length;
  const bh = h / n;
  for (let i = 0; i < n; i++) rect(x, Math.floor(y + i * bh), w, Math.ceil(bh) + 1, colors[i]);
}

export function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Petits outils
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
