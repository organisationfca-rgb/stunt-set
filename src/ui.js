// Éléments d'interface communs : décor de film d'action, gros titres en relief, boutons, clap.
import { G, PAL, rect, frame, disc, text, makeCanvas, withCtx, mulberry, clamp, alpha, outlined, shade, sprite } from './gfx.js';
import { measure } from './font.js';
import { audio } from './audio.js';
import { app } from './app.js';
import { obstacleSprite } from './games/chuteArt.js';
import { drawButton, clapSize } from './widgets.js';

const INK = '#140a22'; // couleur des contours

// =====================================================================
//  Décor : coucher de soleil sur la ville, nuages, hélicoptère, toit de tournage
// =====================================================================
const SKY = ['#1b1464', '#2a2390', '#4a35b8', '#7b3fc4', '#b745b0', '#e8528f', '#ff7a6b', '#ffa85c', '#ffd56b'];
let skyImg = null;
let skyKey = '';
const strips = {};

function buildSky(W, h) {
  const [c, ctx] = makeCanvas(W, h);
  withCtx(ctx, () => {
    const n = SKY.length;
    const bh = h / n;
    for (let i = 0; i < n; i++) rect(0, Math.floor(i * bh), W, Math.ceil(bh) + 1, SKY[i]);
    // tramage entre deux bandes, comme sur les consoles 16 bits
    for (let i = 1; i < n; i++) {
      const y = Math.floor(i * bh);
      for (let x = 0; x < W; x++) {
        if ((x & 1) === 0) rect(x, y - 1, 1, 1, SKY[i]);
        if ((x & 3) === 1) rect(x, y - 3, 1, 1, SKY[i]);
        if ((x & 1) === 1) rect(x, y, 1, 1, SKY[i - 1]);
        if ((x & 3) === 2) rect(x, y + 2, 1, 1, SKY[i - 1]);
      }
    }
    const rnd = mulberry(1994);
    for (let i = 0; i < 46; i++) rect(Math.floor(rnd() * W), Math.floor(rnd() * h * 0.42), 1, 1, rnd() > 0.7 ? '#ffffff' : '#b9a6ff');
  });
  return c;
}

// Bande d'immeubles qui se répète (silhouettes + fenêtres éclairées)
function buildStrip(seed, w, h, body, edge, lit) {
  const [c, ctx] = makeCanvas(w, h);
  const rnd = mulberry(seed);
  withCtx(ctx, () => {
    let x = 0;
    while (x < w) {
      const bw = 9 + Math.floor(rnd() * 16);
      const bh = Math.floor(h * (0.3 + rnd() * 0.7));
      const y = h - bh;
      rect(x, y, bw, bh, body);
      rect(x, y, 1, bh, edge);
      rect(x, y, bw, 1, edge);
      if (rnd() > 0.6) rect(x + Math.floor(bw / 2), y - 5, 1, 5, body); // antenne
      if (rnd() > 0.75) rect(x + 2, y - 3, 4, 3, body); // château d'eau
      if (lit) {
        for (let wy = y + 3; wy < h - 2; wy += 4) {
          for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
            const r = rnd();
            if (r > 0.62) rect(wx, wy, 2, 2, r > 0.9 ? '#5ad7ff' : r > 0.8 ? '#ff9ad5' : '#ffd56b');
          }
        }
      }
      x += bw + (rnd() > 0.8 ? 2 : 0);
    }
  });
  return c;
}

let cloudImgs = null;
function clouds() {
  if (cloudImgs) return cloudImgs;
  cloudImgs = [0, 1, 2].map((v) => {
    const [c, ctx] = makeCanvas(56, 22);
    withCtx(ctx, () => {
      const pts = [[[12, 14, 7], [24, 10, 9], [36, 13, 8], [46, 16, 5]], [[10, 15, 6], [22, 12, 8], [34, 9, 9], [44, 14, 7]], [[14, 13, 8], [28, 12, 9], [40, 15, 6]]][v];
      pts.forEach(([x, y, r]) => disc(x, y + 2, r, '#ff9ec4'));
      rect(6, 17, 44, 4, '#ff9ec4');
      pts.forEach(([x, y, r]) => disc(x, y, r, '#fff1f6'));
      pts.forEach(([x, y, r]) => disc(x - 2, y - 2, r * 0.55, '#ffffff'));
    });
    return c;
  });
  return cloudImgs;
}

function tile(img, y, offset) {
  const w = img.width;
  let x = -(((offset % w) + w) % w);
  for (; x < G.W; x += w) G.ctx.drawImage(img, Math.round(x), Math.round(y));
}

// opts : horizon (0..1), calm (true = décor assombri pour les écrans chargés en texte)
export function synthBg(t, opts = {}) {
  const { W, H } = G;
  const hz = Math.floor(H * (opts.horizon || 0.6));
  const key = W + 'x' + hz;
  if (key !== skyKey) {
    skyKey = key;
    skyImg = buildSky(W, hz);
    strips.far = buildStrip(7, 240, 56, '#8a3fb0', '#a658c8', false);
    strips.mid = buildStrip(21, 260, 74, '#4f237f', '#6b34a3', true);
    strips.near = buildStrip(42, 280, 92, '#231047', '#3a1d6e', true);
  }
  const c = G.ctx;
  c.drawImage(skyImg, 0, 0);
  // soleil et rayons tournants
  const sx = Math.floor(W / 2);
  const sy = hz - 20;
  c.save();
  c.translate(sx, sy);
  c.rotate(t * 0.12);
  c.fillStyle = 'rgba(255,240,170,0.13)';
  for (let i = 0; i < 12; i++) {
    c.rotate(Math.PI / 6);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-18, -H);
    c.lineTo(18, -H);
    c.fill();
  }
  c.restore();
  disc(sx, sy, 34, '#ffe9a0');
  disc(sx, sy, 29, '#fff6cf');
  // nuages (deux vitesses)
  const cl = clouds();
  for (let i = 0; i < 5; i++) {
    const sp = 4 + (i % 2) * 5;
    const x = ((i * 67 + t * sp) % (W + 70)) - 60;
    c.drawImage(cl[i % 3], Math.round(x), Math.round(hz * (0.12 + ((i * 37) % 50) / 100)));
  }
  // la ville, en trois plans
  tile(strips.far, hz - 56, t * 3);
  tile(strips.mid, hz - 60, t * 7 + 40);
  // hélicoptère de tournage
  const hx = W + 30 - ((t * 22) % (W + 160));
  const hy = hz * 0.34 + Math.sin(t * 2) * 3;
  const heli = obstacleSprite('helicopter');
  sprite(heli, hx, hy, -1, 1);
  rect(hx - 16, hy - 2 + (Math.floor(t * 20) % 2), 34, 1, '#f4f4fa');
  tile(strips.near, hz - 62, t * 14 + 90);
  // le toit du plateau de tournage
  rect(0, hz + 28, W, H - hz - 28, '#150a2e');
  rect(0, hz + 28, W, 2, '#4a2a86');
  for (let x = -12 + (Math.floor(t * 10) % 12); x < W; x += 12) {
    c.fillStyle = '#ffd23f';
    c.beginPath();
    c.moveTo(x, hz + 35); c.lineTo(x + 6, hz + 35); c.lineTo(x + 10, hz + 31); c.lineTo(x + 4, hz + 31);
    c.fill();
  }
  rect(0, hz + 36, W, 1, '#2a1250');
  // projecteurs qui balaient le ciel
  for (const [px, ph] of [[14, 0], [W - 14, 2.1]]) {
    const a = Math.sin(t * 0.9 + ph) * 0.5;
    c.save();
    c.translate(px, hz + 26);
    c.rotate(a);
    c.fillStyle = 'rgba(255,246,190,0.16)';
    c.beginPath();
    c.moveTo(-2, 0); c.lineTo(-22, -H * 0.7); c.lineTo(22, -H * 0.7); c.lineTo(2, 0);
    c.fill();
    c.restore();
    rect(px - 1, hz + 20, 2, 9, INK);
    rect(px - 4, hz + 16, 8, 6, '#3a2a55');
    rect(px - 3, hz + 17, 6, 4, '#fff6cf');
  }
  if (opts.calm) dim(0.62);
}

// =====================================================================
//  Gros titre en relief : contour épais, dégradé doré, lettres penchées
// =====================================================================
const GOLD = ['#fffbd0', '#fff08a', '#ffd84a', '#ffb52e', '#ff8a2a', '#f4552a', '#c92a2a'];
const logoCache = new Map();

function tint(src, color) {
  const [c, ctx] = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

export function logoText(str, scale, colors = GOLD) {
  const key = str + '|' + scale + '|' + colors[0];
  if (logoCache.has(key)) return logoCache.get(key);
  const w = measure(str, scale);
  const h = 7 * scale;
  const lean = Math.round(h * 0.22);
  const pad = scale + 3;
  // 1. les lettres, penchées
  const up = /[ÀÂÉÈÊËÎÏÔÙÛÇ]/.test(str) ? 3 * scale : 0; // accents au-dessus des capitales
  const [flat, fctx] = makeCanvas(w, h + up);
  withCtx(fctx, () => text(str, 0, up, { scale, color: '#fff' }));
  const [mask, mctx] = makeCanvas(w + lean + pad * 2, h + up + pad * 2 + 3);
  for (let y = 0; y < h + up; y++) mctx.drawImage(flat, 0, y, w, 1, pad + Math.round(((h + up - y) / (h + up)) * lean), pad + y, w, 1);
  // 2. ombre portée, contour noir épais, liseré rouge
  const [out, octx] = makeCanvas(mask.width, mask.height);
  const ink = tint(mask, INK);
  const red = tint(mask, '#7a1020');
  const r = Math.max(2, Math.round(scale * 0.6));
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (dx * dx + dy * dy <= r * r + 1) octx.drawImage(ink, dx + 2, dy + 3);
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (dx * dx + dy * dy <= r * r + 1) octx.drawImage(ink, dx, dy);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) octx.drawImage(red, dx, dy);
  // 3. remplissage en dégradé + reflet
  const [fill, gctx] = makeCanvas(mask.width, mask.height);
  gctx.drawImage(mask, 0, 0);
  gctx.globalCompositeOperation = 'source-atop';
  const bh = h / colors.length;
  gctx.fillStyle = colors[0];
  gctx.fillRect(0, 0, fill.width, pad + up + 1);
  colors.forEach((col, i) => { gctx.fillStyle = col; gctx.fillRect(0, pad + up + Math.floor(i * bh), fill.width, Math.ceil(bh) + 1); });
  gctx.fillStyle = 'rgba(255,255,255,0.75)';
  gctx.fillRect(0, pad + up + Math.floor(h * 0.42), fill.width, Math.max(1, Math.floor(scale / 3)));
  octx.drawImage(fill, 0, 0);
  logoCache.set(key, out);
  return out;
}

// Titre du jeu, avec rebond et étincelles
export function gameTitle(cx, y, t, scale = 5) {
  const a = logoText('STUNT', scale);
  const b = logoText('SET !', scale);
  const pitch = scale * 7 + 1; // écart entre les deux lignes
  const bounce = Math.round(Math.sin(t * 3) * 1.5);
  const pop = t < 0.35 ? 1 - t / 0.35 : 0;
  G.ctx.drawImage(a, Math.round(cx - a.width / 2 - 6 - pop * G.W), y + bounce);
  G.ctx.drawImage(b, Math.round(cx - b.width / 2 + 8 + pop * G.W), y + pitch - bounce);
  // étincelles
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.9 + i * 0.37) % 1;
    if (ph > 0.35) continue;
    const sx = cx + Math.round(Math.sin(i * 12.9) * 66);
    const sy = y + 8 + ((i * 29) % (pitch + 24));
    const s = ph < 0.17 ? 2 : 1;
    rect(sx - s, sy, s * 2 + 1, 1, '#ffffff');
    rect(sx, sy - s, 1, s * 2 + 1, '#ffffff');
  }
  return pitch + b.height;
}

// Ancien nom, gardé pour compatibilité
export function chromeText(str, cx, y, scale) {
  const img = logoText(str, scale);
  G.ctx.drawImage(img, Math.round(cx - img.width / 2), y);
}

// =====================================================================
//  Texte gras et pictogrammes
// =====================================================================
export function bold(str, x, y, opts = {}) {
  const w = measure(str, opts.scale || 1) + 1;
  if (opts.align === 'center') x = Math.round(x - w / 2);
  else if (opts.align === 'right') x -= w;
  const o = { ...opts, align: 'left' };
  if (opts.shadow) { text(str, x + 1, y + 1, { ...o, color: opts.shadow, shadow: null }); text(str, x + 2, y + 1, { ...o, color: opts.shadow, shadow: null }); }
  text(str, x, y, { ...o, shadow: null });
  text(str, x + 1, y, { ...o, shadow: null });
}

const ICONS = {
  play: ['X......', 'XXX....', 'XXXXX..', 'XXXXXXX', 'XXXXX..', 'XXX....', 'X......'],
  trophy: ['XXXXXXX', 'X.XXX.X', 'X.XXX.X', '.XXXXX.', '..XXX..', '...X...', '.XXXXX.'],
  gear: ['..X.X..', '.XXXXX.', 'XX...XX', '.X...X.', 'XX...XX', '.XXXXX.', '..X.X..'],
  star: ['...X...', '...X...', 'XXXXXXX', '.XXXXX.', '.XXXXX.', 'XX...XX', 'X.....X'],
  cam: ['.XXXXX.', 'X.....X', 'X.XXX.X', 'X.X.X.X', 'X.XXX.X', 'X.....X', '.XXXXX.'],
  lock: ['..XXX..', '.X...X.', '.X...X.', 'XXXXXXX', 'XXX.XXX', 'XXX.XXX', 'XXXXXXX'],
  back: ['...X...', '..XX...', '.XXXXXX', 'XXXXXXX', '.XXXXXX', '..XX...', '...X...'],
  share: ['....X..', '....XX.', 'XXXXXXX', 'X...XX.', 'X...X..', 'X......', 'XXXXXX.'],
  home: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.X...X.', '.X.X.X.', '.XXXXX.'],
  next: ['.X.....', '.XX....', '.XXXXX.', '.XXXXXX', '.XXXXX.', '.XX....', '.X.....'],
  left: ['....X..', '...XX..', '..XXX..', '.XXXX..', '..XXX..', '...XX..', '....X..'],
  right: ['..X....', '..XX...', '..XXX..', '..XXXX.', '..XXX..', '..XX...', '..X....'],
  music: ['..XXXXX', '..X...X', '..X...X', '..X...X', 'XXX.XXX', 'XXX.XXX', '.X...X.'],
  sound: ['...X..X', '..XX.X.', 'XXXX..X', 'XXXX.X.', 'XXXX..X', '..XX.X.', '...X..X'],
  phone: ['.XXXXX.', '.X...X.', '.X...X.', '.X...X.', '.X...X.', '.XX.XX.', '.XXXXX.'],
  globe: ['.XXXXX.', 'X.X.X.X', 'XXXXXXX', 'X.X.X.X', 'XXXXXXX', 'X.X.X.X', '.XXXXX.'],
  user: ['..XXX..', '..XXX..', '..XXX..', '.......', '.XXXXX.', 'XXXXXXX', 'XXXXXXX'],
  tag: ['XXXXXX.', 'X.XXXXX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', 'XXXXXX.', '.......'],
  book: ['XXX.XXX', 'X.XXX.X', 'X.XXX.X', 'X.XXX.X', 'X.XXX.X', 'XXX.XXX', '.......'],
  down: ['...X...', '...X...', '.X.X.X.', '..XXX..', '...X...', 'X.....X', 'XXXXXXX'],
  replay: ['.XXXX.X', 'X....XX', 'X..XXXX', 'X......', 'X.....X', 'X.....X', '.XXXXX.'],
};
export function icon(name, x, y, color) {
  const rows = ICONS[name];
  if (!rows) return;
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === 'X') rect(x + i, y + j, 1, 1, color); });
}

// =====================================================================
//  Boutons : leurs formes sont dans widgets.js
// =====================================================================
const bigIcons = new Map();
export function iconScaled(name, color, scale) {
  const key = name + color + scale;
  if (!bigIcons.has(key)) {
    const [c, ctx] = makeCanvas(7 * scale, 7 * scale);
    const [s, sctx] = makeCanvas(7, 7);
    withCtx(sctx, () => icon(name, 0, 0, color));
    ctx.drawImage(s, 0, 0, 7 * scale, 7 * scale);
    bigIcons.set(key, c);
  }
  return bigIcons.get(key);
}
export { drawButton, clapSize };

const hit = (b, p) => p.x >= b.x - 1 && p.x < b.x + b.w + 1 && p.y >= b.y - 2 && p.y < b.y + b.h + 3;
const easeOut = (u) => 1 - (1 - u) * (1 - u) * (1 - u);

// Écran à boutons. def : { enter, leave, update, draw, buttons(sc) → [...], over, back(), pointer, key }
export function menuScene(def) {
  const sc = {
    t: 0,
    pressed: null,
    focus: -1,
    enter() { sc.t = 0; if (def.enter) def.enter(sc); },
    leave() { if (def.leave) def.leave(sc); },
    update(dt) { sc.t += dt; if (def.update) def.update(sc, dt); },
    draw() {
      def.draw(sc);
      const bs = def.buttons(sc);
      bs.forEach((b, i) => {
        // les boutons arrivent en glissant, l'un après l'autre
        const moves = !b.kind || b.kind === 'plate' || b.kind === 'clap';
        const u = !moves || b.id === 'back' ? 1 : easeOut(clamp((sc.t - 0.05 - i * 0.06) / 0.3, 0, 1));
        const slide = Math.round((1 - u) * -(G.W + 20));
        drawButton({ ...b, x: b.x + slide }, sc.pressed === b.id, sc.focus === i, sc.t);
      });
      if (def.over) def.over(sc);
    },
    pointer(type, p) {
      const bs = def.buttons(sc);
      const b = bs.find((x) => hit(x, p));
      if (type === 'down') {
        sc.pressed = b ? b.id : null;
        sc.focus = -1;
      } else if (type === 'up') {
        const ok = b && b.id === sc.pressed && !b.disabled && !p.cancelled;
        sc.pressed = null;
        if (ok) { audio.sfx(b.sfx || 'click'); b.onClick(); return; }
      }
      if (def.pointer) def.pointer(sc, type, p);
    },
    key(code, down) {
      if (!down) return;
      if (def.key && def.key(sc, code) === true) return; // l'écran a traité la touche
      const bs = def.buttons(sc);
      if (code === 'ArrowDown' || code === 'ArrowRight') sc.focus = (sc.focus + 1) % bs.length;
      else if (code === 'ArrowUp' || code === 'ArrowLeft') sc.focus = (sc.focus - 1 + bs.length) % bs.length;
      else if (code === 'Enter' || code === 'Space') {
        const b = bs[sc.focus < 0 ? 0 : sc.focus];
        if (b && !b.disabled) { audio.sfx(b.sfx || 'click'); b.onClick(); }
      } else if (code === 'Escape' && def.back) { audio.sfx('back'); def.back(); }
    },
  };
  return sc;
}

// Empile des boutons centrés à partir de y. items : [{ id, label, onClick, color, value, disabled, h, icon, big }]
export function stack(items, y, opts = {}) {
  const w = opts.w || Math.min(G.W - 24, 156);
  const x = Math.floor((G.W - w) / 2);
  const h = opts.h || 21;
  const gap = opts.gap === undefined ? 6 : opts.gap;
  return items.map((it) => {
    const b = { x, y, w, h: it.h || h, ...it };
    y += b.h + gap;
    return b;
  });
}

// Bouton retour en haut à gauche
export function backButton(onClick) {
  return { id: 'back', kind: 'round', x: 3, y: 2 + G.safeTop, w: 24, h: 24, icon: 'back', color: '#ff2e97', sfx: 'back', onClick };
}

// Bandeau de titre d'écran, avec les rayures d'un clap de cinéma
export function header(title) {
  const y = 3 + G.safeTop;
  rect(0, y, G.W, 23, INK);
  rect(0, y + 1, G.W, 21, '#2a1250');
  const c = G.ctx;
  c.fillStyle = '#ffd23f';
  // les rayures laissent toujours la place au titre
  for (let x = Math.max(G.W - 46, 34 + measure(title) + 10); x < G.W + 10; x += 10) {
    c.beginPath();
    c.moveTo(x, y + 22); c.lineTo(x + 5, y + 22); c.lineTo(x + 12, y + 1); c.lineTo(x + 7, y + 1);
    c.fill();
  }
  rect(0, y + 22, G.W, 1, '#ff2e97');
  bold(title, 34, y + 8, { color: '#fff6cf', shadow: INK });
}

export function dim(a = 0.6) {
  const c = G.ctx;
  c.fillStyle = `rgba(12,5,30,${a})`;
  c.fillRect(0, 0, G.W, G.H);
}

// Grand texte arcade animé : arrive en grand, rebondit, clignote
export function banner(str, cy, age, color = PAL.yellow, maxScale = 3) {
  let scale = maxScale;
  while (scale > 1 && measure(str, scale) > G.W - 10) scale--;
  const pop = age < 0.12 ? 1 - age / 0.12 : 0;
  const shake = age < 0.3 ? Math.round(Math.sin(age * 90) * (0.3 - age) * 12) : 0;
  const y = Math.round(cy - 3.5 * scale - pop * 14) + shake;
  const top = y - 3 * scale;
  const hh = 13 * scale;
  rect(0, top - 1, G.W, hh + 2, INK);
  rect(0, top, G.W, hh, shade(color, -0.72));
  rect(0, top, G.W, 1, color);
  rect(0, top + hh - 1, G.W, 1, color);
  const c = Math.floor(age * 12) % 2 === 0 || age > 0.6 ? color : '#ffffff';
  bold(str, G.W / 2, y, { scale, color: c, shadow: INK, align: 'center' });
}

// Clap de cinéma. open : 1 = bras levé, 0 = fermé
export function clapboard(cx, cy, open, label) {
  const w = 58;
  const h = 32;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - h / 2);
  rect(x + 2, y + 3, w, h, 'rgba(8,3,20,0.6)');
  rect(x - 1, y - 1, w + 2, h + 2, INK);
  rect(x, y, w, h, '#221b2e');
  frame(x, y, w, h, '#f0ecf7');
  rect(x + 3, y + 10, w - 6, 1, '#f0ecf7');
  if (label) bold(label, cx, y + 16, { align: 'center', color: '#f0ecf7' });
  const c = G.ctx;
  c.save();
  c.translate(x, y - 1);
  c.rotate(-open * 0.55);
  c.fillStyle = INK;
  c.fillRect(-1, -10, w + 2, 10);
  c.fillStyle = '#221b2e';
  c.fillRect(0, -9, w, 8);
  c.fillStyle = '#f0ecf7';
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.moveTo(i * 10 + 2, -1);
    c.lineTo(i * 10 + 7, -1);
    c.lineTo(i * 10 + 11, -9);
    c.lineTo(i * 10 + 6, -9);
    c.fill();
  }
  c.restore();
}

// Logo du FCA (avec une ombre pour rester lisible sur le décor)
export function drawLogo(cx, y, small) {
  const img = small ? app.logoSmall : app.logo;
  if (!img) return 0;
  const key = small ? 'ls' : 'lb';
  if (!logoCache.has(key)) logoCache.set(key, outlined(img, INK));
  const o = logoCache.get(key);
  G.ctx.drawImage(o, Math.round(cx - o.width / 2), Math.round(y));
  return o.height;
}

// Panneau : fond sombre, double bordure
export function panel(x, y, w, h, color = PAL.cyan) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  rect(x + 2, y + 2, w, h, 'rgba(8,3,20,0.55)');
  rect(x - 1, y - 1, w + 2, h + 2, INK);
  rect(x, y, w, h, 'rgba(28,14,62,0.94)');
  frame(x, y, w, h, color);
  rect(x + 1, y + 1, w - 2, 1, 'rgba(255,255,255,0.18)');
}

export { clamp, alpha };
