// Les boutons du jeu. Plusieurs formes, pour éviter l'empilement de gros rectangles :
//  - 'plate' : plaque inclinée avec pictogramme (boutons de menu) ;
//  - 'clap'  : clap de cinéma (le bouton qui lance : Jouer, Action) ;
//  - 'round' : bouton rond avec pictogramme ;
//  - 'tab'   : onglet ;
//  - 'row'   : ligne de réglage (interrupteur ou valeur) dans un panneau ;
//  - 'none'  : zone cliquable sans dessin (l'écran dessine lui-même).
import { G, rect, frame, disc, text, shade, makeCanvas, withCtx } from './gfx.js';
import { measure } from './font.js';
import { icon, iconScaled, logoText } from './ui.js';

const INK = '#140a22';
const cache = new Map();

// ---------- plaque inclinée ----------
// Une plaque est un parallélogramme : chaque ligne est décalée un peu plus vers la droite en montant.
function rowX(j, h, slant) {
  return Math.round(((h - 1 - j) * slant) / Math.max(1, h - 1));
}
function plateBody(w, h, slant, base, pressed, capW) {
  const key = ['p', w, h, slant, base, pressed, capW].join('|');
  if (cache.has(key)) return cache.get(key);
  const iw = w - slant;
  const ext = pressed ? 1 : 3; // épaisseur de la plaque
  const [c, ctx] = makeCanvas(w + 6, h + 9);
  withCtx(ctx, () => {
    const sil = (ox, oy, col) => {
      for (let j = 0; j < h; j++) rect(ox + rowX(j, h, slant), oy + j, iw, 1, col);
      rect(ox, oy + h, iw, ext, col);
    };
    if (!pressed) sil(4, 4, 'rgba(8,3,20,0.5)'); // ombre portée
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) sil(2 + dx, 1 + dy, INK);
    rect(2, 1 + h, iw, ext, shade(base, -0.58));
    for (let j = 0; j < h; j++) {
      const x = 2 + rowX(j, h, slant);
      const col = j === 0 ? shade(base, 0.55) : j === h - 1 ? shade(base, -0.3) : j < h * 0.5 ? (pressed ? shade(base, -0.15) : base) : shade(base, pressed ? -0.28 : -0.14);
      rect(x, 1 + j, iw, 1, col);
      if (capW) {
        rect(x, 1 + j, capW, 1, j === 0 ? shade(base, -0.25) : shade(base, -0.55));
        rect(x + capW, 1 + j, 1, 1, shade(base, 0.45));
      }
    }
  });
  cache.set(key, c);
  return c;
}

function drawPlate(b, pressed, focused) {
  const base = b.disabled ? '#5a4f73' : b.color || '#1fb6ff';
  const h = b.h;
  const slant = b.slant === undefined ? Math.round(h * 0.34) : b.slant;
  const iw = b.w - slant;
  const capW = b.icon ? h + 1 : 0;
  const y = b.y + (pressed ? 2 : 0);
  G.ctx.drawImage(plateBody(b.w, h, slant, base, !!pressed, capW), b.x - 2, y - 1);
  const mid = Math.round(slant / 2);
  const tc = b.disabled ? '#c9bfdd' : '#ffffff';
  const oc = shade(base, -0.72);
  if (b.icon) icon(b.icon, b.x + mid + Math.floor((capW - 7) / 2), y + Math.floor((h - 7) / 2), b.disabled ? '#c9bfdd' : shade(base, 0.7));
  if (b.big) {
    // gros libellé doré
    const img = logoText(b.label, 2);
    G.ctx.drawImage(img, Math.round(b.x + mid + capW + (iw - capW - img.width) / 2), y + Math.floor((h - img.height) / 2) + 1);
  } else {
    const lw = measure(b.label);
    const vw = b.value !== undefined ? measure(b.value) + 8 : 0;
    const right = b.x + mid + iw; // bord droit utilisable
    // le libellé reste toujours dans la plaque : la marge se réduit s'il est long
    const lx = capW ? b.x + mid + capW + Math.max(2, Math.min(5, iw - capW - lw - 10)) : Math.round(b.x + mid + (iw - lw - vw) / 2);
    const ty = y + Math.floor((h - 7) / 2);
    text(b.label, lx, ty, { color: tc, outline: oc });
    if (b.value !== undefined) {
      rect(right - vw - 3, y + 3, vw, h - 6, shade(base, -0.6));
      text(b.value, right - 7, ty, { color: '#e9e4ff', align: 'right' });
    } else if (capW && lx + lw + 8 <= right) {
      // même petit chevron au bout de chaque plaque de menu
      text('>', right - 3, ty, { color: shade(base, 0.6), align: 'right' });
    }
  }
  if (focused) frame(b.x - 3, y - 3, b.w + 6, h + 8, '#ffffff');
}

// ---------- clap de cinéma ----------
// Forme classique, un peu carrée : la taille se calcule d'après le libellé.
export function clapSize(label) {
  const w = Math.max(80, logoText(label, 2).width + 14);
  return { w, h: Math.round(w * 0.74) };
}

function drawClap(b, pressed, focused, t) {
  const off = b.disabled;
  const x = b.x;
  const y = b.y + (pressed ? 2 : 0);
  const { w, h } = b;
  const ah = 12; // hauteur du bras
  const body = off ? '#3a334d' : '#241c33';
  const white = off ? '#9a90b3' : '#f4f0fb';
  const grey = off ? '#5a5070' : '#6b5a99';
  const c = G.ctx;
  if (!pressed) rect(x + 3, b.y + ah + 4, w, h - ah, 'rgba(8,3,20,0.5)');
  rect(x - 1, y + ah - 1, w + 2, h - ah + 2, INK);
  rect(x, y + ah, w, h - ah, body);
  rect(x, y + ah, 1, h - ah, off ? '#4a425f' : '#3a2f52'); // arête claire à gauche
  // barre rayée fixe en haut de l'ardoise
  c.save();
  c.beginPath();
  c.rect(x, y + ah, w, 7);
  c.clip();
  c.fillStyle = white;
  for (let i = -1; i < w / 10 + 1; i++) {
    c.beginPath();
    c.moveTo(x + i * 10, y + ah); c.lineTo(x + i * 10 + 5, y + ah); c.lineTo(x + i * 10 + 10, y + ah + 7); c.lineTo(x + i * 10 + 5, y + ah + 7);
    c.fill();
  }
  c.restore();
  rect(x, y + ah + 7, w, 1, INK);
  // les cases du bas de l'ardoise (scène, plan, prise), comme sur un vrai clap
  const fy = y + h - 14;
  rect(x + 2, fy, w - 4, 1, grey);
  const cw = Math.floor((w - 4) / 3);
  for (let k = 1; k < 3; k++) rect(x + 2 + k * cw, fy, 1, 11, grey);
  for (let k = 0; k < 3; k++) rect(x + 6 + k * cw, fy + 6, cw - 9, 1, off ? '#6a5f83' : '#b3a8c9');
  rect(x, y + h - 3, w, 3, off ? '#5a5070' : b.color || '#ff2e97');
  // le bras : il se lève puis claque, régulièrement
  let open = 0;
  if (!off && !pressed) {
    const p = (t % 2.4) / 2.4;
    open = p < 0.62 ? 0 : p < 0.86 ? (p - 0.62) / 0.24 : p < 0.95 ? 1 : 1 - (p - 0.95) / 0.05;
    open = open * open * (3 - 2 * open);
  }
  c.save();
  c.translate(x, y + ah);
  c.rotate(-open * 0.32);
  c.fillStyle = INK;
  c.fillRect(-1, -ah, w + 2, ah);
  c.fillStyle = body;
  c.fillRect(0, -ah + 1, w, ah - 2);
  c.beginPath();
  c.rect(0, -ah + 1, w, ah - 2);
  c.clip();
  c.fillStyle = white;
  for (let i = -1; i < w / 10 + 1; i++) {
    c.beginPath();
    c.moveTo(i * 10 + 5, -1); c.lineTo(i * 10 + 10, -1); c.lineTo(i * 10 + 5, -ah + 1); c.lineTo(i * 10, -ah + 1);
    c.fill();
  }
  c.restore();
  disc(x + 3, y + ah, 2, off ? '#9a90b3' : '#ffd23f'); // la charnière
  // le libellé, au milieu de l'ardoise
  const top = y + ah + 8;
  const room = fy - top;
  if (off) {
    icon('lock', x + 8, top + Math.floor((room - 7) / 2), '#c9bfdd');
    text(b.label, x + w / 2 + 5, top + Math.floor((room - 7) / 2), { align: 'center', color: '#c9bfdd' });
  } else {
    const img = logoText(b.label, 2);
    const pulse = pressed ? 0 : Math.round(Math.sin(t * 5) * 1);
    c.drawImage(img, Math.round(x + (w - img.width) / 2), top + Math.floor((room - img.height) / 2) + 1 + pulse);
  }
  if (focused) frame(x - 3, y - 3, w + 6, h + 6, '#ffffff');
}

// ---------- bouton rond ----------
function drawRound(b, pressed, focused) {
  const base = b.disabled ? '#5a4f73' : b.color || '#1fb6ff';
  const cx = Math.round(b.x + b.w / 2);
  const cy = Math.round(b.y + b.h / 2) + (pressed ? 2 : 0);
  const r = Math.floor(Math.min(b.w, b.h) / 2) - 2;
  if (!pressed) disc(cx + 2, cy + 4, r + 1, 'rgba(8,3,20,0.5)');
  disc(cx, cy + (pressed ? 1 : 3), r + 1, INK);
  disc(cx, cy, r + 1, INK);
  disc(cx, cy + (pressed ? 0 : 2), r, shade(base, -0.55));
  disc(cx, cy, r, shade(base, -0.12));
  disc(cx, cy - 1, r - 1, base);
  disc(cx - Math.round(r * 0.35), cy - Math.round(r * 0.45), Math.max(1, r * 0.22), shade(base, 0.6));
  const big = r >= 11;
  if (big) G.ctx.drawImage(iconScaled(b.icon, '#ffffff', 2), cx - 7, cy - 7);
  else icon(b.icon, cx - 3, cy - 3, '#ffffff');
  if (b.label) text(b.label, cx, b.y + b.h + 3, { align: 'center', color: '#ffffff', outline: INK });
  if (focused) frame(b.x - 2, b.y - 2, b.w + 4, b.h + 6, '#ffffff');
}

// ---------- onglet ----------
function drawTab(b, pressed) {
  const on = b.active;
  const base = on ? b.color || '#ffa81a' : '#3a2a66';
  const y = b.y + (on ? 0 : 3);
  const h = b.h - (on ? 0 : 3);
  G.ctx.drawImage(plateBody(b.w, h, 4, base, !!pressed, 0), b.x - 2, y - 1);
  text(b.label, Math.round(b.x + b.w / 2), y + Math.floor((h - 7) / 2), { align: 'center', color: on ? '#ffffff' : '#b3a8c9', outline: shade(base, -0.7) });
}

// ---------- ligne de réglage ----------
function drawRow(b, pressed) {
  const y = b.y;
  if (pressed) rect(b.x, y, b.w, b.h, 'rgba(255,255,255,0.12)');
  rect(b.x + 4, y + b.h - 1, b.w - 8, 1, 'rgba(255,255,255,0.1)');
  const ty = y + Math.floor((b.h - 7) / 2);
  const off = b.disabled;
  if (b.icon) icon(b.icon, b.x + 6, ty, off ? '#7a6f93' : b.color || '#7fe3ff');
  text(b.label, b.x + (b.icon ? 18 : 8), ty, { color: off ? '#8a7ca8' : '#ffffff' });
  const rx = b.x + b.w - 8;
  if (b.toggle !== undefined) {
    // interrupteur
    const on = b.toggle;
    const sx = rx - 22;
    const sy = y + Math.floor((b.h - 11) / 2);
    rect(sx - 1, sy - 1, 24, 13, INK);
    rect(sx, sy, 22, 11, on ? '#22c58b' : '#4a3f66');
    rect(sx, sy, 22, 1, on ? '#7dffc9' : '#6a5f83');
    const kx = on ? sx + 12 : sx + 1;
    rect(kx, sy + 1, 9, 9, INK);
    rect(kx + 1, sy + 2, 7, 7, '#ffffff');
    rect(kx + 1, sy + 7, 7, 2, '#cfc6df');
  } else if (b.value !== undefined) {
    text(b.value, rx - (off ? 0 : 8), ty, { color: off ? '#8a7ca8' : '#ffd56b', align: 'right' });
    if (!off) text('>', rx, ty, { color: '#ffd56b', align: 'right' });
  } else {
    text('>', rx, ty, { color: b.color || '#ffd56b', align: 'right' });
  }
}

export function drawButton(b, pressed, focused, t = 0) {
  switch (b.kind) {
    case 'clap': return drawClap(b, pressed, focused, t);
    case 'round': return drawRound(b, pressed, focused);
    case 'tab': return drawTab(b, pressed);
    case 'row': return drawRow(b, pressed);
    case 'none': return undefined;
    default: return drawPlate(b, pressed, focused);
  }
}
