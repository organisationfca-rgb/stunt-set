// Les écrans de l'application.
// Parcours pour jouer : écran titre → 1. choix de la cascade (mini-jeu) → 2. choix du cascadeur → 3. choix du stage et du niveau → jeu.
import { G, PAL, rect, frame, disc, line, text, paragraph, wrap, sprite, shade, alpha, clamp } from './gfx.js';
import { measure } from './font.js';
import { CONFIG } from './config.js';
import { t, num, setLanguage, getLanguage } from './i18n.js';
import { save } from './save.js';
import { audio } from './audio.js';
import { app, openLink } from './app.js';
import { synthBg, gameTitle, logoText, menuScene, backButton, header, drawLogo, panel, banner, bold, icon, clapSize } from './ui.js';
import { CHARS, standing, faller, hero } from './characters.js';
import { install } from './install.js';
import { board } from './leaderboard.js';
import { askPseudo } from './pseudoPrompt.js';
import { chuteGame } from './games/chute.js';
import { drawGround, drawHoop } from './games/chuteArt.js';

const INK = '#140a22';

// Les 4 cascades (mini-jeux). setup : l'écran où l'on choisit le stage et le niveau avant de jouer.
export const GAMES = [
  { id: 'chute', color: '#1fb6ff', ready: true, setup: () => chuteSetupScreen() },
  { id: 'choregraphie', color: '#ff2e97', ready: false },
  { id: 'esquive', color: '#ff8a3c', ready: false },
  { id: 'voiture', color: '#ffc21a', ready: false },
];

// Ellipse plate (ombre ou halo au sol)
function ellipse(cx, cy, rx, ry, color) {
  for (let dy = -ry; dy <= ry; dy++) {
    const hw = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry + 0.01)));
    rect(cx - hw, cy + dy, hw * 2 + 1, 1, color);
  }
}

// Hauteur d'un texte une fois coupé en lignes : sert à donner aux panneaux la taille de leur contenu
const textH = (str, maxW) => wrap(str, maxW).length * 10;

// ---------- choix de la langue (premier lancement) ----------
export function langScreen(next) {
  return menuScene({
    draw(sc) {
      synthBg(sc.t, { horizon: 0.62 });
      const y = 44 + G.safeTop;
      panel(14, y, G.W - 28, 24, PAL.yellow);
      bold('Langue / Language', G.W / 2, y + 8, { align: 'center', color: '#fff6cf', shadow: INK });
    },
    buttons() {
      const w = G.W - 44;
      return [
        { id: 'fr', x: 22, y: 92 + G.safeTop, w, h: 27, label: 'FRANÇAIS', big: true, color: '#1fb6ff', onClick: () => { setLanguage('fr'); next(); } },
        { id: 'en', x: 22, y: 134 + G.safeTop, w, h: 27, label: 'ENGLISH', big: true, color: '#ff2e97', onClick: () => { setLanguage('en'); next(); } },
      ];
    },
  });
}

// ---------- 1. choix du cascadeur ----------
// opts.step : true quand on vient de « Jouer » (le bouton devient « Suivant »)
export function charScreen(done, back, opts = {}) {
  let sel = Math.max(0, CHARS.findIndex((c) => c.id === save.data.character));
  let changed = 1;
  const layout = () => {
    const top = 30 + G.safeTop;
    const cols = 6;
    const cw = Math.floor((G.W - 8) / cols);
    const gridY = G.H - 36 - G.safeBottom - 100;
    return { top, cols, cw, gridY, stageH: gridY - top - 4 };
  };
  const cells = () => {
    const L = layout();
    return CHARS.map((c, i) => ({ c, i, x: 4 + (i % L.cols) * L.cw, y: L.gridY + Math.floor(i / L.cols) * 50, w: L.cw - 2, h: 48 }));
  };
  return menuScene({
    update(sc, dt) { changed += dt; },
    draw(sc) {
      synthBg(sc.t, { calm: true });
      header((opts.step ? '2. ' : '') + t('char.title'));
      const L = layout();
      const ch = CHARS[sel];
      const cx = Math.floor(G.W / 2);
      const stageY = L.top + L.stageH - 10; // on laisse de l'air entre le podium et la grille
      const c = G.ctx;
      // faisceau du projecteur
      c.fillStyle = 'rgba(255,246,190,0.16)';
      c.beginPath();
      c.moveTo(cx - 8, L.top); c.lineTo(cx + 8, L.top); c.lineTo(cx + 46, stageY - 6); c.lineTo(cx - 46, stageY - 6);
      c.fill();
      // podium
      ellipse(cx, stageY - 8, 50, 9, INK);
      ellipse(cx, stageY - 6, 48, 8, shade(ch.suit, -0.6));
      ellipse(cx, stageY - 9, 48, 8, shade(ch.suit, -0.25));
      ellipse(cx, stageY - 10, 40, 6, shade(ch.suit, 0.1));
      const big = L.stageH >= 214 ? 2 : 1;
      const hop = changed < 0.25 ? Math.round(Math.sin((changed / 0.25) * Math.PI) * 8) : Math.round(Math.sin(sc.t * 4) * 1);
      const img = hero(ch.id);
      sprite(img, cx, stageY - 11 - (img.height * big) / 2 - hop, big);
      const name = logoText(ch.name, 2);
      c.drawImage(name, Math.round(cx - name.width / 2), L.top + 2);
      // flèches discrètes de part et d'autre
      if (Math.floor(sc.t * 2) % 2) { icon('left', 10, stageY - 50, '#ffffff'); icon('right', G.W - 17, stageY - 50, '#ffffff'); }
      // la grille des 12
      for (const cell of cells()) {
        const on = cell.i === sel;
        rect(cell.x - 1, cell.y - 1, cell.w + 2, cell.h + 2, INK);
        rect(cell.x, cell.y, cell.w, cell.h, on ? shade(cell.c.suit, -0.35) : '#2a1250');
        rect(cell.x, cell.y, cell.w, 1, on ? '#fff6cf' : '#4a2a86');
        if (on) frame(cell.x, cell.y, cell.w, cell.h, '#fff6cf');
        const im = standing(cell.c.id);
        c.drawImage(im, Math.round(cell.x + cell.w / 2 - im.width / 2), cell.y + 3 - (on ? Math.round(Math.abs(Math.sin(sc.t * 6)) * 2) : 0));
      }
    },
    buttons() {
      const w = Math.min(G.W - 36, 140);
      const bs = [{
        id: 'ok', x: Math.round((G.W - w) / 2), y: G.H - 29 - G.safeBottom, w, h: 21, icon: 'next', color: '#ff2e97',
        label: opts.step ? t('common.next') : t('common.ok'),
        onClick: () => { save.set('character', CHARS[sel].id); done(); },
      }];
      if (back) bs.push(backButton(back));
      return bs;
    },
    pointer(sc, type, p) {
      if (type === 'down') {
        const cell = cells().find((c) => p.x >= c.x && p.x < c.x + c.w && p.y >= c.y && p.y < c.y + c.h);
        if (cell && cell.i !== sel) { sel = cell.i; changed = 0; audio.sfx('click'); }
      } else if (type === 'up' && p.sy > 30 && p.sy < layout().gridY && Math.abs(p.x - p.sx) > 24) {
        // glisser sur le grand personnage pour passer au suivant
        sel = (sel + (p.x < p.sx ? 1 : CHARS.length - 1)) % CHARS.length;
        changed = 0;
        audio.sfx('click');
      }
    },
    key(sc, code) {
      if (code === 'ArrowLeft' || code === 'ArrowRight') {
        sel = (sel + (code === 'ArrowRight' ? 1 : CHARS.length - 1)) % CHARS.length;
        changed = 0;
        audio.sfx('click');
        return true;
      }
      return false;
    },
    back,
  });
}

// ---------- écran titre ----------
export function titleScreen() {
  const toPlay = () => app.go(stageScreen());
  const toChar = () => app.go(charScreen(() => app.go(titleScreen()), () => app.go(titleScreen())));
  const lay = () => {
    const ts = G.H >= 352 ? 5 : 4; // taille du titre : plus petit sur les écrans courts
    const cs = clapSize(t('title.play').toUpperCase());
    const byMin = 6 + G.safeTop + 36 + 14 + (ts === 5 ? 90 : 74) + 4; // bas du titre
    const room = G.H - 8 - G.safeBottom;
    // les plaques grandissent et s'espacent avec la place disponible, pour ne pas laisser de grand vide en bas
    const slot = clamp(Math.floor((room - byMin - cs.h - 19) / 4), 26, 36); // une plaque et son écart
    const ph = clamp(slot - 12, 18, 23);
    const gap = slot - ph - 3;
    const need = 6 + cs.h + 3 + 4 * slot;
    const by = clamp(room - need - 6, byMin, byMin + 130); // le reste de la place va à la ville, derrière le titre
    const colW = Math.min(134, G.W - 54);
    return { ts, cs, by, ph, gap, ch: cs.h, colW };
  };
  return menuScene({
    enter() { audio.music('menu'); audio.intensity(1); },
    draw(sc) {
      const L = lay();
      // le toit du plateau arrive juste au-dessus du menu : la ville reste visible derrière le titre
      synthBg(sc.t, { horizon: (L.by - 42) / G.H });
      const top = 6 + G.safeTop;
      const lh = drawLogo(G.W / 2, top, false);
      const py = top + lh + 2;
      rect(G.W / 2 - 30, py - 1, 60, 11, INK);
      rect(G.W / 2 - 29, py, 58, 9, '#ff2e97');
      bold(t('title.presents'), G.W / 2, py + 1, { align: 'center', color: '#ffffff', shadow: '#7a1020' });
      gameTitle(G.W / 2, py + 12, sc.t, L.ts);
      // le cascadeur du joueur, sous un projecteur, à droite du menu
      const x0 = 8 + L.colW;
      const cx = Math.round(x0 + (G.W - x0) / 2);
      const img = hero(save.data.character);
      const feet = L.by + L.ch + 2 * (L.ph + L.gap + 3) + 14;
      const c = G.ctx;
      c.fillStyle = 'rgba(255,246,190,0.13)';
      c.beginPath();
      c.moveTo(cx - 5, L.by - 6); c.lineTo(cx + 5, L.by - 6); c.lineTo(cx + 27, feet); c.lineTo(cx - 27, feet);
      c.fill();
      ellipse(cx, feet, 25, 5, 'rgba(255,246,190,0.22)');
      ellipse(cx, feet, 15, 3, 'rgba(8,3,20,0.55)');
      sprite(img, cx, feet - img.height / 2 + Math.round(Math.sin(sc.t * 3) * 1), 1);
      const ch = CHARS.find((k) => k.id === save.data.character) || CHARS[0];
      text(ch.name, cx, feet + 9, { align: 'center', color: '#fff6cf', outline: INK });
      text('v' + CONFIG.version, G.W - 3, G.H - 9 - G.safeBottom, { align: 'right', color: '#6b5a99' });
    },
    buttons() {
      const L = lay();
      const x = 8;
      let y = L.by + 6;
      const bs = [{ id: 'play', kind: 'clap', x: x + Math.round((L.colW - L.cs.w) / 2), y, w: L.cs.w, h: L.ch, label: t('title.play').toUpperCase(), color: '#ff2e97', sfx: 'clap', onClick: toPlay }];
      y += L.ch + L.gap + 3;
      [
        { id: 'boards', label: t('title.boards'), color: '#1fb6ff', icon: 'trophy', onClick: () => app.go(boardScreen('chute', () => app.go(titleScreen()))) },
        { id: 'settings', label: t('title.settings'), color: '#7c5cff', icon: 'gear', onClick: () => app.go(settingsScreen()) },
        { id: 'fca', label: t('common.discover'), color: '#ffa81a', icon: 'star', onClick: () => openLink(CONFIG.links.fca) },
        { id: 'insta', label: 'Instagram', color: '#e0457b', icon: 'cam', onClick: () => openLink(CONFIG.links.instagram) },
      ].forEach((it) => {
        bs.push({ x, y, w: L.colW, h: L.ph, ...it });
        y += L.ph + L.gap + 3;
      });
      // toucher le cascadeur permet d'en changer
      bs.push({ id: 'hero', kind: 'none', x: x + L.colW + 2, y: L.by, w: G.W - x - L.colW - 2, h: L.ch + 3 * (L.ph + L.gap + 3), onClick: toChar });
      // bouton d'installation, tant que le jeu n'est pas installé sur l'appareil
      if (!install.isInstalled) bs.push({ id: 'install', kind: 'round', x: G.W - 27, y: 3 + G.safeTop, w: 24, h: 24, icon: 'down', color: '#22c58b', onClick: () => app.go(installScreen()) });
      return bs;
    },
  });
}

// ---------- 1. choix de la cascade (mini-jeu) ----------
// Petites scènes illustrées (animées) de chaque cascade
function stageArt(id, x, y, w, h, time) {
  const c = G.ctx;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  const cx = Math.round(x + w / 2);
  const cy = Math.round(y + h / 2);
  if (id === 'chute') {
    const s = 0.5 + Math.sin(time * 0.8) * 0.08;
    drawGround(cx - 8, cy + 14, s, save.data.chuteStage || 'studio', time);
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4;
      const ph = (time * 1.4 + i * 0.37) % 1;
      const r0 = 18 + ph * 90;
      alpha(0.2 + ph * 0.3, () => line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * (r0 + 8), cy + Math.sin(a) * (r0 + 8), '#ffffff'));
    }
    drawHoop(cx + 34, cy - 20, 13, time, 1);
    sprite(faller(save.data.character, 'back'), cx - 6 + Math.sin(time * 1.7) * 10, cy - 4 + Math.sin(time * 2.3) * 5, 1, 1, Math.sin(time * 1.7) * 0.25);
  } else if (id === 'choregraphie') {
    rect(x, y, w, h, '#2a1250');
    for (let j = 0; j < h; j += 6) for (let i = (j / 6) % 2 ? -6 : 0; i < w; i += 12) rect(x + i, y + j, 11, 5, '#3a1d6e');
    rect(x, y + h - 22, w, 22, '#1b0f33');
    rect(x, y + h - 22, w, 1, '#6b34a3');
    const a = hero(save.data.character);
    const b = hero(save.data.character === 'volt' ? 'jet' : 'volt');
    const hit = Math.floor(time * 2) % 2;
    sprite(a, cx - 22 + hit * 4, y + h - 24 - a.height / 2, 1);
    sprite(b, cx + 22 - hit * 2, y + h - 24 - b.height / 2, -1, 1);
    if (hit) { disc(cx, y + h - 60, 7, '#fff6cf'); disc(cx, y + h - 60, 4, '#ffffff'); }
  } else if (id === 'esquive') {
    rect(x, y, w, h, '#ff9e5e');
    rect(x, y, w, h * 0.35, '#e8528f');
    disc(cx, y + h * 0.38, 16, '#fff6cf');
    c.fillStyle = '#241c33';
    c.beginPath();
    c.moveTo(cx - 8, y + h * 0.4); c.lineTo(cx + 8, y + h * 0.4); c.lineTo(x + w + 20, y + h); c.lineTo(x - 20, y + h);
    c.fill();
    for (let k = 0; k < 5; k++) {
      const z = ((k + time * 1.5) % 5) / 5;
      const yy = y + h * 0.4 + z * z * h * 0.6;
      rect(cx - 2 - z * 22, yy, 2 + z * 3, 2 + z * 5, '#fff6cf');
      rect(cx + 1 + z * 22, yy, 2 + z * 3, 2 + z * 5, '#fff6cf');
    }
    const im = hero(save.data.character);
    sprite(im, cx, y + h - im.height / 2 - 2 - Math.abs(Math.sin(time * 9)) * 3, 1);
  } else {
    rect(x, y, w, h, '#7b3fc4');
    rect(x, y + h * 0.3, w, h * 0.7, '#e8528f');
    rect(x, y + h * 0.55, w, h * 0.45, '#ffa85c');
    disc(cx + 30, y + h * 0.5, 14, '#fff6cf');
    rect(x, y + h - 14, w, 14, '#241c33');
    c.fillStyle = '#3a334d';
    c.beginPath();
    c.moveTo(x + 4, y + h - 14); c.lineTo(x + 46, y + h - 14); c.lineTo(x + 46, y + h - 40);
    c.fill();
    const ph = (time * 0.6) % 1;
    const carX = x + 40 + ph * (w - 50);
    const carY = y + h - 52 - Math.sin(ph * Math.PI) * 26;
    c.save();
    c.translate(carX, carY);
    c.rotate(-0.4 + ph * 0.8);
    c.fillStyle = INK; c.fillRect(-15, -7, 30, 13);
    c.fillStyle = '#ff3b4e'; c.fillRect(-14, -2, 28, 7);
    c.fillStyle = '#ff7a85'; c.fillRect(-14, -2, 28, 2);
    c.fillStyle = '#7fe3ff'; c.fillRect(-7, -6, 13, 4);
    c.fillStyle = INK; c.fillRect(-11, 4, 7, 5); c.fillRect(5, 4, 7, 5);
    c.restore();
  }
  c.restore();
}

export function stageScreen() {
  let idx = Math.max(0, GAMES.findIndex((g) => g.id === save.data.lastGame));
  let slide = 0;
  const ranks = {};
  const lay = () => {
    const top0 = 33 + G.safeTop;
    const clapH = 26;
    // sous la carte : le nom du jeu, sa description, le record et le rang. On réserve la place du jeu le plus bavard.
    const infoH = Math.max(...GAMES.map((g) => (measure(t('game.' + g.id).toUpperCase(), 2) > G.W - 20 ? 38 : 19) + 6 + textH(t('game.' + g.id + '.desc'), G.W - 24) + 4 + 22 + 12));
    const avail = G.H - top0 - clapH - infoH - 14 - G.safeBottom;
    const cardH = clamp(avail, 70, Math.round((G.W - 48) * 1.2));
    const top = top0 + Math.floor((avail - cardH) * 0.45); // s'il reste de la place, on la répartit au-dessus et au-dessous
    const cardX = 24;
    return { top, clapH, cardH, cardX, cardW: G.W - 48, infoY: top + cardH + 10 };
  };
  const go = (d) => {
    idx = (idx + d + GAMES.length) % GAMES.length;
    slide = d;
    audio.sfx('click');
  };
  const start = () => {
    const g = GAMES[idx];
    if (!g.ready) return;
    save.set('lastGame', g.id);
    // on choisit son cascadeur dès qu'on lance une cascade, puis le stage et le niveau
    app.go(charScreen(() => app.go(g.setup()), () => app.go(stageScreen()), { step: true }));
  };
  return menuScene({
    enter() {
      audio.music('menu');
      GAMES.filter((g) => g.ready).forEach((g) => board.fetch(g.id).then((r) => { ranks[g.id] = r.season.rank; }));
    },
    update(sc, dt) { slide *= Math.pow(0.0005, dt); if (Math.abs(slide) < 0.01) slide = 0; },
    draw(sc) {
      synthBg(sc.t, { calm: true });
      header('1. ' + t('select.title'));
      const L = lay();
      const g = GAMES[idx];
      const off = Math.round(slide * G.W);
      const x = L.cardX + off;
      const y = L.top;
      const { cardW: w, cardH: h } = L;
      // la carte : une image de pellicule
      rect(x + 3, y + 4, w, h, 'rgba(8,3,20,0.5)');
      rect(x - 1, y - 1, w + 2, h + 2, INK);
      rect(x, y, w, h, '#0e0820');
      for (let i = 3; i < w - 5; i += 9) { rect(x + i, y + 2, 5, 4, '#4a3f66'); rect(x + i, y + h - 6, 5, 4, '#4a3f66'); }
      stageArt(g.id, x + 3, y + 8, w - 6, h - 16, sc.t);
      frame(x + 3, y + 8, w - 6, h - 16, g.ready ? g.color : '#5a4f73');
      // numéro du stage
      disc(x + 14, y + 19, 9, INK);
      disc(x + 14, y + 19, 8, g.ready ? g.color : '#5a4f73');
      bold(String(idx + 1), x + 14, y + 16, { align: 'center', color: '#ffffff', shadow: INK });
      if (!g.ready) {
        rect(x + 3, y + 8, w - 6, h - 16, 'rgba(14,8,32,0.6)');
        const sw = measure(t('select.soon')) + 26;
        const sx = Math.round(G.W / 2 - sw / 2) + off;
        const sy = y + 14;
        rect(sx - 1, sy - 1, sw + 2, 19, INK);
        rect(sx, sy, sw, 17, '#3a2a66');
        icon('lock', sx + 6, sy + 5, '#ffd56b');
        text(t('select.soon'), sx + 18, sy + 5, { color: '#ffd56b' });
      }
      // nom du stage, sur une ou deux lignes
      const name = t('game.' + g.id).toUpperCase();
      let lines = [name];
      if (measure(name, 2) > G.W - 20) {
        let best = null;
        const words = name.split(' ');
        for (let i = 1; i < words.length; i++) {
          const a = words.slice(0, i).join(' ');
          const b = words.slice(i).join(' ');
          const m = Math.max(measure(a), measure(b));
          if (!best || m < best.m) best = { m, lines: [a, b] };
        }
        if (best) lines = best.lines;
      }
      let ty = L.infoY;
      lines.forEach((l) => {
        const img = logoText(l, 2, g.ready ? undefined : ['#e9e4ff', '#cfc6df', '#b3a8c9', '#9a90b3', '#8a7ca8', '#7a6f93', '#6a5f83']);
        // une ligne avec un accent sur une capitale est plus haute : on la remonte d'autant, pour garder le même interligne
        G.ctx.drawImage(img, Math.round(G.W / 2 - img.width / 2), ty - (img.height - 27));
        ty += 19;
      });
      ty += 6;
      ty += paragraph(t('game.' + g.id + '.desc'), G.W / 2, ty, G.W - 24, { align: 'center', color: g.ready ? '#e9e4ff' : '#b3a8c9', outline: INK }) + 4;
      if (g.ready) {
        const best = save.data.best[g.id] || 0;
        text(t('select.best', { score: num(best) }), G.W / 2, ty, { align: 'center', color: '#fff6cf', outline: INK });
        text(ranks[g.id] ? t('select.rank', { rank: num(ranks[g.id]) }) : t('select.norank'), G.W / 2, ty + 11, { align: 'center', color: '#e9e4ff', outline: INK });
      }
      // points de navigation
      const dy = Math.min(G.H - L.clapH - 14 - G.safeBottom, ty + (g.ready ? 28 : 6)); // juste sous les informations
      GAMES.forEach((_, i) => {
        const dx = Math.round(G.W / 2 + (i - (GAMES.length - 1) / 2) * 10);
        disc(dx, dy, i === idx ? 3 : 2, i === idx ? '#ffd56b' : '#5a4f73');
      });
    },
    buttons() {
      const L = lay();
      const g = GAMES[idx];
      const my = L.top + Math.round(L.cardH / 2) - 11;
      const cw = Math.min(G.W - 44, 136);
      return [
        { id: 'prev', kind: 'round', x: 0, y: my, w: 22, h: 22, icon: 'left', color: '#7c5cff', onClick: () => go(-1) },
        { id: 'nextStage', kind: 'round', x: G.W - 22, y: my, w: 22, h: 22, icon: 'right', color: '#7c5cff', onClick: () => go(1) },
        { id: 'go', x: Math.round((G.W - cw) / 2), y: G.H - L.clapH - 4 - G.safeBottom, w: cw, h: 21, icon: g.ready ? 'next' : 'lock', label: g.ready ? t('common.next') : t('common.soon'), color: '#ff2e97', disabled: !g.ready, onClick: start },
        backButton(() => app.go(titleScreen())),
      ];
    },
    pointer(sc, type, p) {
      const L = lay();
      if (type === 'up' && p.sy > L.top && p.sy < L.top + L.cardH + 40 && Math.abs(p.x - p.sx) > 24) go(p.x < p.sx ? 1 : -1);
    },
    key(sc, code) {
      if (code === 'ArrowLeft') { go(-1); return true; }
      if (code === 'ArrowRight') { go(1); return true; }
      if (code === 'Enter' || code === 'Space') { if (GAMES[idx].ready) audio.sfx('click'); start(); return true; }
      return false;
    },
    back: () => app.go(titleScreen()),
  });
}
// ancien nom, encore utilisé par les mini-jeux
export const selectScreen = stageScreen;

// ---------- 3. La chute : choix du stage (le décor) et du niveau (la force du vent) ----------
const LEVEL_COL = { facile: '#22c58b', moyen: '#ffa81a', difficile: '#ff3b4e' };
export function chuteSetupScreen() {
  const stages = CONFIG.chute.stages;
  const levels = CONFIG.chute.levels;
  let si = Math.max(0, stages.indexOf(save.data.chuteStage));
  let li = Math.max(0, levels.findIndex((l) => l.id === save.data.chuteLevel));
  let slide = 0;
  const lay = () => {
    const top0 = 33 + G.safeTop;
    const cs = clapSize(t('arcade.action'));
    const clapH = cs.h;
    const avail = G.H - top0 - clapH - 100 - G.safeBottom;
    const cardH = clamp(avail, 80, Math.round((G.W - 48) * 1.3));
    const top = top0 + Math.floor((avail - cardH) * 0.45);
    const nameY = top + cardH + 7;
    return { top, cs, clapH, cardH, cardX: 24, cardW: G.W - 48, nameY, tabY: nameY + 24 };
  };
  const go = (d) => { si = (si + d + stages.length) % stages.length; slide = d; audio.sfx('click'); };
  const start = () => {
    save.set('chuteStage', stages[si]);
    save.set('chuteLevel', levels[li].id);
    app.go(chuteGame({ stage: stages[si], level: levels[li].id, tutorial: true }));
  };
  return menuScene({
    enter() { audio.music('menu'); },
    update(sc, dt) { slide *= Math.pow(0.0005, dt); if (Math.abs(slide) < 0.01) slide = 0; },
    draw(sc) {
      synthBg(sc.t, { calm: true });
      header('3. ' + t('setup.title'));
      const L = lay();
      const x = L.cardX + Math.round(slide * G.W);
      const y = L.top;
      const { cardW: w, cardH: h } = L;
      // l'aperçu du décor, dans une image de pellicule
      rect(x + 3, y + 4, w, h, 'rgba(8,3,20,0.5)');
      rect(x - 1, y - 1, w + 2, h + 2, INK);
      rect(x, y, w, h, '#0e0820');
      for (let i = 3; i < w - 5; i += 9) { rect(x + i, y + 2, 5, 4, '#4a3f66'); rect(x + i, y + h - 6, 5, 4, '#4a3f66'); }
      const c = G.ctx;
      c.save();
      c.beginPath();
      c.rect(x + 3, y + 8, w - 6, h - 16);
      c.clip();
      drawGround(Math.round(x + w / 2), Math.round(y + h / 2), 0.36 + Math.sin(sc.t * 0.7) * 0.03, stages[si], sc.t);
      c.restore();
      frame(x + 3, y + 8, w - 6, h - 16, '#1fb6ff');
      // points de navigation, dans le bas de la carte
      stages.forEach((_, i) => {
        const dx = Math.round(x + w / 2 + (i - (stages.length - 1) / 2) * 10);
        disc(dx, y + h - 13, i === si ? 3 : 2, INK);
        disc(dx, y + h - 13, i === si ? 2 : 1, i === si ? '#ffd56b' : '#b3a8c9');
      });
      const img = logoText(t('stage.' + stages[si]).toUpperCase(), 2);
      c.drawImage(img, Math.round(G.W / 2 - img.width / 2), L.nameY);
      // ce que change le niveau choisi
      const lv = levels[li];
      text(t('level.' + lv.id + '.desc'), G.W / 2, L.tabY + 28, { align: 'center', color: '#ffffff', outline: INK });
      text(t('level.points', { m: String(lv.scoreMult).replace('.', ',') }), G.W / 2, L.tabY + 39, { align: 'center', color: '#ffd56b', outline: INK });
    },
    buttons() {
      const L = lay();
      const my = L.top + Math.round(L.cardH / 2) - 11;
      const cw = Math.min(G.W - 44, 136);
      const tw = Math.floor((G.W - 20 - 8) / 3);
      const bs = [
        { id: 'prev', kind: 'round', x: 0, y: my, w: 22, h: 22, icon: 'left', color: '#7c5cff', onClick: () => go(-1) },
        { id: 'nextStage', kind: 'round', x: G.W - 22, y: my, w: 22, h: 22, icon: 'right', color: '#7c5cff', onClick: () => go(1) },
      ];
      levels.forEach((lv, i) => bs.push({
        id: 'lv' + i, kind: 'tab', x: 10 + i * (tw + 4), y: L.tabY, w: tw, h: 20, label: t('level.' + lv.id), active: i === li, color: LEVEL_COL[lv.id] || '#ffa81a',
        onClick: () => { li = i; },
      }));
      bs.push({ id: 'go', kind: 'clap', x: Math.round((G.W - L.cs.w) / 2), y: G.H - L.clapH - 8 - G.safeBottom, w: L.cs.w, h: L.clapH, label: t('arcade.action'), color: LEVEL_COL[levels[li].id], sfx: 'clap', onClick: start });
      bs.push(backButton(() => app.go(stageScreen())));
      return bs;
    },
    pointer(sc, type, p) {
      const L = lay();
      if (type === 'up' && p.sy > L.top && p.sy < L.top + L.cardH && Math.abs(p.x - p.sx) > 24) go(p.x < p.sx ? 1 : -1);
    },
    key(sc, code) {
      if (code === 'ArrowLeft') { go(-1); return true; }
      if (code === 'ArrowRight') { go(1); return true; }
      if (code === 'ArrowUp' || code === 'ArrowDown') { li = (li + (code === 'ArrowDown' ? 1 : levels.length - 1)) % levels.length; audio.sfx('click'); return true; }
      if (code === 'Enter' || code === 'Space') { audio.sfx('clap'); start(); return true; }
      return false;
    },
    back: () => app.go(stageScreen()),
  });
}

// ---------- installer le jeu sur le téléphone ----------
export function installScreen(back = () => app.go(titleScreen())) {
  let done = false;
  return menuScene({
    draw(sc) {
      synthBg(sc.t, { calm: true });
      header(t('install.title'));
      const key = done || install.isInstalled ? 'install.ok' : install.canPrompt ? 'install.auto' : 'install.' + install.platform;
      const pw = G.W - 34;
      // le panneau prend la hauteur de son contenu, et se place au milieu de l'écran
      const content = 10 + 56 + textH(t('install.why'), pw) + 8 + textH(t(key), pw) + 10;
      const top = 32 + G.safeTop;
      const bottom = G.H - (install.canPrompt && !done ? 46 : 10) - G.safeBottom;
      const y0 = top + Math.max(4, Math.floor((bottom - top - content) / 2));
      panel(8, y0, G.W - 16, content, '#22c58b');
      let y = y0 + 10;
      if (app.icon) {
        // l'icône du jeu, telle qu'elle apparaîtra sur l'écran d'accueil
        rect(G.W / 2 - 25, y - 1, 50, 50, INK);
        G.ctx.drawImage(app.icon, Math.round(G.W / 2 - 24), y, 48, 48);
      }
      y += 56;
      y += paragraph(t('install.why'), G.W / 2, y, pw, { align: 'center', color: '#fff6cf' }) + 8;
      paragraph(t(key), 16, y, pw, { color: '#ffffff' });
    },
    buttons() {
      const bs = [backButton(back)];
      const w = Math.min(G.W - 36, 148);
      if (install.canPrompt && !done) {
        bs.unshift({ id: 'go', x: Math.round((G.W - w) / 2), y: G.H - 36 - G.safeBottom, w, h: 24, big: true, icon: 'down', label: t('install.button').toUpperCase(), color: '#22c58b', onClick: () => { install.prompt().then((ok) => { done = ok; }); } });
      }
      return bs;
    },
    back,
  });
}

// ---------- réglages ----------
export function settingsScreen() {
  const self = () => app.go(settingsScreen());
  const toggle = (key) => () => { save.set(key, !save.data[key]); audio.applySettings(); if (key === 'vibration') audio.buzz(40); };
  const lay = () => {
    // les lignes grandissent avec l'écran ; s'il reste de la place, le panneau se centre
    const avail = G.H - 34 - G.safeTop - 10 - G.safeBottom;
    const h = clamp(Math.floor(avail / 10), 18, 28);
    return { top: 34 + G.safeTop + Math.floor((avail - h * 10) / 2), h };
  };
  return menuScene({
    draw(sc) {
      synthBg(sc.t, { calm: true });
      header(t('settings.title'));
      const { top, h } = lay();
      panel(6, top - 3, G.W - 12, h * 10 + 6, '#7c5cff');
    },
    buttons() {
      const { top, h } = lay();
      const rows = [
        { id: 'music', icon: 'music', label: t('settings.music'), toggle: !!save.data.music, onClick: toggle('music') },
        { id: 'sfx', icon: 'sound', label: t('settings.sfx'), toggle: !!save.data.sfx, onClick: toggle('sfx') },
        { id: 'vib', icon: 'phone', label: t('settings.vibration'), toggle: !!save.data.vibration, onClick: toggle('vibration') },
        { id: 'lang', icon: 'globe', label: t('settings.language'), value: getLanguage() === 'fr' ? 'Français' : 'English', onClick: () => setLanguage(getLanguage() === 'fr' ? 'en' : 'fr') },
        { id: 'char', icon: 'user', label: t('settings.character'), value: (CHARS.find((c) => c.id === save.data.character) || CHARS[0]).name, onClick: () => app.go(charScreen(self, self)) },
        { id: 'pseudo', icon: 'tag', label: t('settings.pseudo'), value: save.data.pseudo || '-', onClick: () => askPseudo() },
        { id: 'tuto', icon: 'book', label: t('settings.tutorials'), color: '#ff9ad5', onClick: () => app.go(chuteGame({ tutorialOnly: true })) },
        install.isInstalled
          ? { id: 'install', icon: 'down', label: t('install.title'), value: t('install.done'), disabled: true, onClick: () => {} }
          : { id: 'install', icon: 'down', label: t('install.title'), color: '#7dffc9', onClick: () => app.go(installScreen(() => app.go(settingsScreen()))) },
        { id: 'legal', icon: 'book', label: t('settings.legal'), value: t('common.soon'), disabled: true, onClick: () => {} },
        { id: 'credits', icon: 'star', label: t('settings.credits'), color: '#ffd56b', onClick: () => app.go(creditsScreen()) },
      ];
      const bs = rows.map((r, i) => ({ kind: 'row', x: 7, y: top + i * h, w: G.W - 14, h, ...r }));
      bs.push(backButton(() => app.go(titleScreen())));
      return bs;
    },
    back: () => app.go(titleScreen()),
  });
}

// ---------- crédits ----------
export function creditsScreen() {
  return menuScene({
    draw(sc) {
      synthBg(sc.t, { calm: true });
      header(t('settings.credits'));
      const pw = G.W - 40;
      const img = hero(save.data.character);
      // logo, texte et cascadeur forment un bloc, centré dans l'écran
      const panelH = 10 + textH(t('credits.line1'), pw) + 8 + textH(t('credits.line2'), pw) + 6 + 10 + 8;
      const total = 36 + 10 + panelH + 8 + img.height;
      const top = 32 + G.safeTop;
      let y = top + Math.max(4, Math.floor((G.H - top - 8 - G.safeBottom - total) / 2));
      y += drawLogo(G.W / 2, y, false) + 10;
      panel(10, y, G.W - 20, panelH, PAL.yellow);
      let ty = y + 10;
      ty += paragraph(t('credits.line1'), G.W / 2, ty, pw, { align: 'center', color: PAL.white }) + 8;
      ty += paragraph(t('credits.line2'), G.W / 2, ty, pw, { align: 'center', color: '#cfc6df' }) + 6;
      text('v' + CONFIG.version, G.W / 2, ty, { align: 'center', color: '#8a7ca8' });
      y += panelH + 8;
      if (y + img.height <= G.H - 4 - G.safeBottom) {
        ellipse(Math.round(G.W / 2), y + img.height - 3, 26, 5, 'rgba(255,246,190,0.2)');
        sprite(img, G.W / 2, y + img.height / 2 + Math.round(Math.sin(sc.t * 3)), 1);
      }
    },
    buttons() {
      return [backButton(() => app.go(settingsScreen()))];
    },
    back: () => app.go(settingsScreen()),
  });
}

// ---------- classements ----------
export function boardScreen(game, back) {
  let tab = 'week';
  let data = null;
  let tabT = 0;
  const load = () => { data = null; board.fetch(game).then((r) => { data = r; }); };
  const MEDAL = ['#ffd23f', '#d9d4e8', '#e08a4a'];
  return menuScene({
    enter: load,
    update(sc, dt) { tabT += dt; },
    draw(sc) {
      synthBg(sc.t, { calm: true });
      const full = t('board.title') + ' - ' + t('game.' + game);
      header(measure(full) > G.W - 42 ? t('game.' + game) : full); // titre raccourci s'il ne tient pas
      const top = 58 + G.safeTop;
      const limit = G.H - 56 - G.safeBottom; // le panneau ne descend jamais plus bas
      const list = !data ? [] : tab === 'hall' ? data.hall : data[tab].top;
      // l'écart entre les lignes grandit avec l'écran, et le panneau prend juste la hauteur de la liste
      const pitch = clamp(Math.floor((limit - top) / Math.max(1, list.length)), 11, 15);
      const shown = Math.min(list.length, Math.floor((limit - top) / pitch));
      const panelH = (shown ? shown * pitch : 46) + 8;
      const off = Math.floor((pitch - 11) / 2);
      panel(6, top - 5, G.W - 12, panelH, '#ffa81a');
      if (!data) {
        text(t('board.loading') + '.'.repeat(1 + (Math.floor(sc.t * 3) % 3)), G.W / 2, top + 16, { align: 'center', color: '#cfc6df' });
      } else if (tab === 'hall') {
        if (!shown) paragraph(t('board.hallEmpty'), G.W / 2, top + 8, G.W - 34, { align: 'center', color: '#cfc6df' });
        list.slice(0, shown).forEach((hRow, i) => {
          const y = top + i * pitch + off;
          icon('trophy', 11, y, PAL.yellow);
          text(String(hRow.season), 22, y, { color: PAL.yellow });
          text(String(hRow.pseudo), 70, y, { color: PAL.white });
          text(num(hRow.score), G.W - 12, y, { color: PAL.cyan, align: 'right' });
        });
      } else {
        const p = data[tab];
        if (data.offline) paragraph(t('board.offline'), G.W / 2, top + 4, G.W - 34, { align: 'center', color: PAL.orange });
        else if (!shown) paragraph(t('board.empty'), G.W / 2, top + 8, G.W - 34, { align: 'center', color: '#cfc6df' });
        list.slice(0, shown).forEach((r, i) => {
          const y = top + i * pitch + off;
          const appear = clamp((tabT - i * 0.03) * 6, 0, 1);
          const dx = Math.round((1 - appear) * 40);
          if (r.me) rect(8, y - 2 - off, G.W - 16, pitch, '#ff2e97');
          else if (i % 2 === 0) rect(8, y - 2 - off, G.W - 16, pitch, 'rgba(255,255,255,0.05)');
          const col = r.me ? '#ffffff' : i < 3 ? MEDAL[i] : '#e9e4ff';
          if (i < 3) { rect(10 + dx, y - 1, 15, 9, MEDAL[i]); bold(String(i + 1), 17 + dx, y, { color: INK, align: 'center' }); } else text(String(i + 1), 24 + dx, y, { color: '#b3a8c9', align: 'right' });
          (i < 3 || r.me ? bold : text)(r.pseudo, 30 + dx, y, { color: col });
          text(num(r.score), G.W - 12 + dx, y, { color: col, align: 'right' });
        });
        // le rang du joueur, juste sous la liste
        const my = p.rank ? t('board.myRank', { rank: num(p.rank), total: num(p.total) }) : p.best ? t('board.myBest', { score: num(p.best) }) : t('board.noScore');
        const fy = top - 5 + panelH + 6;
        rect(6, fy - 1, G.W - 12, 15, INK);
        rect(7, fy, G.W - 14, 13, '#ffa81a');
        bold(my, G.W / 2, fy + 3, { align: 'center', color: INK });
      }
      const ly = G.H - 20 - G.safeBottom;
      if (data && data.demo) paragraph(t('board.demo'), 6, ly - 3, G.W - 84, { color: '#ffb86b' });
      drawLogo(G.W - 38, ly - 4, true);
    },
    buttons() {
      const w = Math.floor((G.W - 16) / 3);
      const y = 32 + G.safeTop;
      const mk = (id, i) => ({ id, kind: 'tab', x: 8 + i * w, y, w: w - 2, h: 18, label: t('board.' + id), active: tab === id, color: '#ffa81a', onClick: () => { tab = id; tabT = 0; } });
      return [mk('week', 0), mk('season', 1), mk('hall', 2), backButton(back)];
    },
    back,
  });
}

// ---------- fin de partie ----------
// result : { game, score, isBest, duration, steps, lines: [texte...], replay() }
export function gameOverScreen(result) {
  let ranks = null;
  const submit = async () => {
    // on n'envoie le score qu'une seule fois, même si on revient sur cet écran
    if (!result.sent) {
      result.sent = true;
      await board.submit(result.game, result.score, { duration: result.duration, steps: result.steps });
    }
    ranks = await board.fetch(result.game);
  };
  const btnTop = () => G.H - 120 - G.safeBottom;
  return menuScene({
    enter() {
      audio.music('menu');
      if (result.isBest && result.score > 0) audio.sfx('best');
      if (result.score > 0 && !save.data.pseudo) askPseudo().then(submit);
      else submit();
    },
    draw(sc) {
      synthBg(sc.t, { calm: true });
      const top = 6 + G.safeTop;
      drawLogo(G.W / 2, top, true);
      banner(t('over.cut'), top + 46, sc.t, '#ff2e97', 2);
      const lines = result.lines || [];
      // le panneau du score prend juste la hauteur de son contenu
      const panelH = 7 + 13 + 30 + 12 + lines.length * 10 + 2 + 22 + 5;
      const yStart = top + 66;
      const free = btnTop() - 10 - yStart - panelH;
      // s'il reste de la place, le cascadeur vient se poser sur le panneau
      const img = hero(save.data.character);
      const showHero = free >= img.height + 6;
      const py = yStart + (showHero ? img.height - 3 + Math.floor((free - img.height) / 2) : Math.max(0, Math.floor(free / 2)));
      if (showHero) sprite(img, G.W / 2, py - img.height / 2 + 4 + Math.round(Math.sin(sc.t * 3)), 1);
      panel(10, py, G.W - 20, panelH, PAL.yellow);
      let y = py + 7;
      bold(t('game.' + result.game), G.W / 2, y, { align: 'center', color: '#7fe3ff', shadow: INK });
      y += 13;
      // le score défile jusqu'à sa valeur
      const shown = Math.round(result.score * Math.min(1, sc.t / 0.9));
      const sImg = logoText(num(shown), 3);
      G.ctx.drawImage(sImg, Math.round(G.W / 2 - sImg.width / 2), y - 4);
      y += 30;
      if (result.isBest && result.score > 0) {
        if (Math.floor(sc.t * 4) % 2 === 0) bold(t('over.newBest'), G.W / 2, y, { align: 'center', color: '#3dfc9a', shadow: INK });
      } else text(t('over.best', { score: num(save.data.best[result.game] || 0) }), G.W / 2, y, { align: 'center', color: PAL.white });
      y += 12;
      lines.forEach((l) => { text(l, G.W / 2, y, { align: 'center', color: '#cfc6df' }); y += 10; });
      y += 2;
      if (ranks) {
        const line2 = (key, p) => (p.rank ? t(key, { rank: num(p.rank), total: num(p.total) }) : t(key + 'None'));
        text(ranks.offline ? t('over.queued') : line2('over.week', ranks.week), G.W / 2, y, { align: 'center', color: ranks.offline ? PAL.orange : '#ff9ad5' });
        if (!ranks.offline) text(line2('over.season', ranks.season), G.W / 2, y + 10, { align: 'center', color: '#ff9ad5' });
      } else {
        text('.'.repeat(1 + (Math.floor(sc.t * 3) % 3)), G.W / 2, y + 4, { align: 'center', color: '#ff9ad5' });
      }
    },
    buttons() {
      const y = btnTop();
      const x = 10;
      const w = G.W - 20;
      const half = Math.floor((w - 6) / 2);
      return [
        { id: 'replay', x, y, w, h: 27, big: true, icon: 'replay', label: t('over.replay').toUpperCase(), color: '#ff2e97', onClick: () => app.go(result.replay()) },
        { id: 'board', x, y: y + 37, w: half, h: 18, label: t('over.board'), color: '#1fb6ff', onClick: () => app.go(boardScreen(result.game, () => app.go(gameOverScreen({ ...result, isBest: false })))) },
        { id: 'share', x: x + half + 6, y: y + 37, w: half, h: 18, label: t('over.share'), disabled: true, onClick: () => {} },
        { id: 'fca', x, y: y + 64, w, h: 18, icon: 'star', label: t('common.discover'), color: '#ffa81a', onClick: () => openLink(CONFIG.links.fca) },
        { id: 'menu', x, y: y + 91, w, h: 18, icon: 'home', label: t('over.menu'), color: '#7c5cff', onClick: () => app.go(stageScreen()) },
      ];
    },
    back: () => app.go(stageScreen()),
  });
}
