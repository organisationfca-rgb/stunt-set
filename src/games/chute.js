// Mini-jeu 1 — La chute.
// Phase 1 : la visée (deux jauges + le vent décident du point d'atterrissage).
// Phase 2 : la chute (figures, obstacles, cerceaux de feu), puis la position dos avant l'impact.
import { G, PAL, rect, frame, disc, ring, line, text, paragraph, wrap, sprite, alpha, withCtx, clamp, lerp } from '../gfx.js';
import { CONFIG } from '../config.js';
import { t, num } from '../i18n.js';
import { save } from '../save.js';
import { audio } from '../audio.js';
import { input } from '../input.js';
import { app } from '../app.js';
import { banner, clapboard, drawButton, stack, dim, panel } from '../ui.js';
import { faller, fallerHi, boots } from '../characters.js';
import { measure } from '../font.js';
import { drawGround, drawPlatform, OBSTACLES, obstacleSprite, pickObstacle, drawHoop, fisheyeBuffer, fisheyeBlit } from './chuteArt.js';
import { gameOverScreen, selectScreen, settingsScreen } from '../screens.js';

const C = CONFIG.chute;
const FISH = 0.45; // force de l'effet « caméra embarquée »
const TRICKS = {
  saltoAvant: { key: 'chute.trick.front' },
  saltoArriere: { key: 'chute.trick.back' },
  vrilleGauche: { key: 'chute.trick.left' },
  vrilleDroite: { key: 'chute.trick.right' },
};
const isTouch = () => !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
const tri = (u) => { u = u % 1; return u < 0.5 ? u * 2 : 2 - u * 2; }; // 0 → 1 → 0
const ease = (u) => u * u * (3 - 2 * u);
// avancement de la chute (0 → 1) : elle accélère, comme une vraie chute
const prog = (f) => Math.pow(clamp(f.time / f.T, 0, 1), C.fall.accel);

function nextHeight(h) {
  for (const s of C.heightSteps) if (h < s.until) return h + s.step;
  return h + 100;
}
function multFor(count) {
  for (const m of C.tricks.multipliers) if (count >= m.from) return m.mult;
  return 1;
}

const INK = '#140a22';
const Z_EDGE = '#ff8a3c';
const Z_GOOD = '#2de2e6';
const Z_PERFECT = '#ff2e97';
const ZCOL = { perfect: Z_PERFECT, good: Z_GOOD, edge: Z_EDGE, miss: '#ff3b4e' };
const WIND = '#7fe3ff'; // tout ce qui concerne le vent est de cette couleur
const TUTO_PAGES = 5; // nombre de pages du tutoriel
const AIM_HOLD = 0.5; // petit temps d'arrêt avant que le curseur parte, pour se préparer

// Texte centré qui reste toujours dans l'écran : il rétrécit ou se décale s'il le faut.
function fitText(str, cx, y, opts = {}) {
  let scale = opts.scale || 1;
  while (scale > 1 && measure(str, scale) > G.W - 8) scale--;
  const w = measure(str, scale);
  const x = clamp(cx, w / 2 + 3, G.W - w / 2 - 3);
  text(str, x, Math.max(2 + G.safeTop, y), { ...opts, scale, align: 'center' });
}

// ---------- jauge à zones colorées ----------
// v : position du curseur de 0 à 1 (null = pas de curseur). zones : [{ a, b, color }] de 0 à 1.
// o.vertical : jauge verticale (0 = en bas). o.active === false : jauge en attente, grisée.
// o.notch : repère du vent (0..1), là où il faut arrêter le curseur pour que le vent pousse sur la cible.
function gauge(x, y, w, h, v, zones, o = {}) {
  const vert = !!o.vertical;
  const on = o.active !== false;
  rect(x - 2, y - 2, w + 4, h + 4, INK);
  rect(x - 1, y - 1, w + 2, h + 2, on ? '#ffffff' : '#5a4f73');
  rect(x, y, w, h, '#1b1033');
  const L = vert ? h : w;
  const pos = (u) => Math.round(clamp(u, 0, 1) * (L - 1));
  for (const z of zones) {
    const a = clamp(z.a, 0, 1);
    const b = clamp(z.b, 0, 1);
    if (b <= a) continue;
    const p0 = Math.round(a * L);
    const p1 = Math.max(p0 + 1, Math.round(b * L));
    if (vert) rect(x, y + h - p1, w, p1 - p0, z.color);
    else rect(x + p0, y, p1 - p0, h, z.color);
  }
  if (vert) rect(x, y, 2, h, 'rgba(255,255,255,0.22)');
  else rect(x, y, w, 2, 'rgba(255,255,255,0.22)');
  if (!on) rect(x, y, w, h, 'rgba(20,10,34,0.6)');
  // le repère du vent, et la flèche qui va du repère vers la cible
  if (on && o.notch !== undefined && o.notch !== null) {
    const pn = pos(o.notch);
    const pc = pos(0.5);
    const d = pc >= pn ? 1 : -1;
    if (vert) {
      const ny = y + h - 1 - pn;
      const zy = y + h - 1 - pc;
      const ax = x + w + 4;
      rect(x - 1, ny - 1, w + 2, 3, INK);
      rect(x, ny, w, 1, WIND);
      if (Math.abs(zy - ny) >= 4) {
        rect(ax - 1, Math.min(ny, zy), 3, Math.abs(zy - ny) + 1, WIND);
        for (let i = 0; i < 4; i++) rect(ax - 1 - i, zy + d * i, 3 + i * 2, 1, WIND);
      }
      rect(ax - 2, ny - 2, 5, 5, INK);
      rect(ax - 1, ny - 1, 3, 3, WIND);
    } else {
      const nx = x + pn;
      const zx = x + pc;
      const ay = y + h + 5;
      rect(nx - 1, y - 1, 3, h + 2, INK);
      rect(nx, y, 1, h, WIND);
      if (Math.abs(zx - nx) >= 4) {
        rect(Math.min(nx, zx), ay - 1, Math.abs(zx - nx) + 1, 3, WIND);
        for (let i = 0; i < 4; i++) rect(zx - d * i, ay - 1 - i, 1, 3 + i * 2, WIND);
      }
      rect(nx - 2, ay - 2, 5, 5, INK);
      rect(nx - 1, ay - 1, 3, 3, WIND);
    }
  }
  if (v === null || v === undefined) return;
  // le curseur : une barre blanche bien visible, avec une flèche
  const p = pos(v);
  const col = o.cursor || '#ffffff';
  if (vert) {
    const cy = y + h - 1 - p;
    rect(x - 4, cy - 2, w + 8, 5, INK);
    rect(x - 3, cy - 1, w + 6, 3, col);
    for (let i = 0; i < 6; i++) rect(x - 11 + i, cy - (5 - i) - 1, 1, (5 - i) * 2 + 3, INK);
    for (let i = 0; i < 5; i++) rect(x - 10 + i, cy - (4 - i), 1, (4 - i) * 2 + 1, col);
  } else {
    const cx = x + p;
    rect(cx - 2, y - 4, 5, h + 8, INK);
    rect(cx - 1, y - 3, 3, h + 6, col);
    for (let i = 0; i < 6; i++) rect(cx - (5 - i) - 1, y - 11 + i, (5 - i) * 2 + 3, 1, INK);
    for (let i = 0; i < 5; i++) rect(cx - (4 - i), y - 10 + i, (4 - i) * 2 + 1, 1, col);
  }
}

// Viseur : là où le cascadeur vise
function crosshair(x, y, color) {
  rect(x - 13, y - 1, 27, 3, INK);
  rect(x - 1, y - 13, 3, 27, INK);
  ring(x, y, 10, 4, INK);
  rect(x - 12, y, 25, 1, color);
  rect(x, y - 12, 1, 25, color);
  ring(x, y, 9, 2, color);
}

// Anneau avec contour sombre (rayon extérieur r, épaisseur th)
function ringOut(x, y, r, th, color) {
  ring(x, y, r + 1, th + 2, INK);
  ring(x, y, r, th, color);
}

// Flèche du vent dessinée sur le sol : du point à viser (rond) jusqu'à la cible (pointe)
function windArrow(x0, y0, x1, y1) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  if (L < 3) return;
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  line(x0, y0, x1, y1, INK, 5);
  line(x1, y1, x1 - ux * 6 - uy * 5, y1 - uy * 6 + ux * 5, INK, 5);
  line(x1, y1, x1 - ux * 6 + uy * 5, y1 - uy * 6 - ux * 5, INK, 5);
  line(x0, y0, x1, y1, WIND, 3);
  line(x1, y1, x1 - ux * 6 - uy * 5, y1 - uy * 6 + ux * 5, WIND, 3);
  line(x1, y1, x1 - ux * 6 + uy * 5, y1 - uy * 6 - ux * 5, WIND, 3);
  ringOut(x0, y0, 6, 2, '#ffffff');
}

// Cadre de caméra : quatre coins et le voyant d'enregistrement, pour rappeler qu'on tourne un film
function viewfinder(time, x, y) {
  const { W, H } = G;
  const m = 3;
  const l = 9;
  const col = 'rgba(255,255,255,0.75)';
  const b = H - m - G.safeBottom;
  const tp = m + G.safeTop;
  rect(m, tp, l, 1, col); rect(m, tp, 1, l, col);
  rect(W - m - l, tp, l, 1, col); rect(W - m - 1, tp, 1, l, col);
  rect(m, b - 1, l, 1, col); rect(m, b - l, 1, l, col);
  rect(W - m - l, b - 1, l, 1, col); rect(W - m - 1, b - l, 1, l, col);
  if (Math.floor(time * 2) % 2) disc(x, y + 3, 2.5, '#ff3b4e');
  text('REC', x + 5, y, { color: '#ffffff', outline: INK });
}

export function chuteGame(opts = {}) {
  const charId = save.data.character;
  // le stage (décor) et le niveau (force du vent) choisis avant de jouer
  const stage = C.stages.includes(opts.stage) ? opts.stage : C.stages.includes(save.data.chuteStage) ? save.data.chuteStage : 'studio';
  const level = C.levels.find((l) => l.id === (opts.level || save.data.chuteLevel)) || C.levels[0];
  const gain = (pts) => Math.round(pts * level.scoreMult); // tous les points sont multipliés selon le niveau
  const st = {
    phase: 'intro', t: 0, time: 0, paused: false, pausePressed: null,
    jump: 0, h: C.startHeight, score: 0, streak: 0, playTime: 0,
    dir: 0, pow: 0, wind: { level: 0, ang: 0, dx: 0, dy: 0 }, sA: 1, speed: 1,
    gx: 0, gy: 0, // décalage dû aux jauges (pixels de l'écran de visée)
    ex: 0, ey: 0, // écart final à la cible (pixels de l'écran de visée)
    fall: null, popups: [], shake: 0, flash: 0, result: null, tutoPage: 0, clapped: false,
  };
  // tutoriel : avant chaque partie lancée depuis le menu (opts.tutorial), ou depuis les réglages (opts.tutorialOnly).
  // Pas quand on rejoue ou qu'on recommence : le joueur vient de le voir.
  const needTuto = !!(opts.tutorialOnly || opts.tutorial);
  if (needTuto) st.phase = 'tutorial';

  const aimPos = () => ({ x: Math.floor(G.W / 2), y: Math.floor(G.H * 0.4) });
  const fallPos = () => ({ x: Math.floor(G.W / 2), y: Math.floor(G.H * 0.45) });
  const pauseRect = () => ({ x: G.W - 22, y: 4 + G.safeTop, w: 18, h: 16 });

  function popup(str, x, y, color = PAL.yellow, scale = 1) {
    st.popups.push({ str, x, y, color, scale, age: 0 });
  }
  function setPhase(p) {
    st.phase = p;
    st.t = 0;
  }

  // ---------- début d'un saut ----------
  function startJump() {
    st.sA = Math.max(C.aim.viewMin, C.aim.viewNear / (1 + st.h / C.aim.viewFalloff));
    st.speed = Math.min(C.aim.maxSpeedUp, 1 + st.jump * C.aim.speedUpPerJump);
    st.s0 = Math.max(C.fall.viewMin, C.fall.viewNear / (1 + st.h / C.fall.viewFalloff)); // taille du sol au début de la chute
    const w = st.wind;
    w.level = Math.round(level.windMin + Math.random() * (level.windMax - level.windMin)); // force du vent selon le niveau choisi
    w.ang = Math.floor(Math.random() * 8) * (Math.PI / 4);
    w.dx = Math.cos(w.ang) * w.level * C.wind.driftPerLevel;
    w.dy = Math.sin(w.ang) * w.level * C.wind.driftPerLevel;
    st.dir = -1;
    st.pow = 0;
    st.fall = null;
    st.clapped = false;
    st.result = null;
    audio.intensity(0.3);
    audio.wind(0);
    setPhase('intro');
  }

  // ---------- début de la chute ----------
  function startFall() {
    const T = Math.min(C.fall.timeMax, C.fall.timeBase + C.fall.timeFactor * Math.sqrt(st.h));
    const items = [];
    const rnd = Math.random;
    if (st.h >= C.obstacles.minHeight) {
      const k = clamp((st.h - C.obstacles.minHeight) / (C.obstacles.intervalHeightRef - C.obstacles.minHeight), 0, 1);
      const interval = lerp(C.obstacles.intervalStart, C.obstacles.intervalMin, Math.sqrt(k));
      for (let tt = 1.5 + rnd() * 0.5; tt < T - 1.2; tt += interval * (0.7 + rnd() * 0.6)) items.push({ kind: 'obs', tHit: tt, lead: 2.4 });
    }
    if (st.h >= C.hoops.minHeight) {
      for (let tt = 2.6 + rnd() * 0.6; tt < T - 1.6; tt += C.hoops.interval * (0.85 + rnd() * 0.3)) items.push({ kind: 'hoop', tHit: tt, lead: 3.0 });
    }
    st.fall = {
      T, time: 0, px: 0, py: 0, trick: null, queued: null, lastTrick: '', trickAge: 9,
      combo: { count: 0, pts: 0, bonus: 0, idle: 0 }, dos: false, stun: 0, items, warnT: 0, multShown: 1,
      K: 1 / st.s0 - 1, errX: st.ex / st.sA, errY: st.ey / st.sA, dosBonus: 1, dosPerfect: false,
    };
    audio.intensity(1);
    setPhase('fall');
  }

  function activate(it) {
    const f = st.fall;
    const rnd = Math.random;
    const bx = G.W / 2 - 16;
    const by = G.H * 0.28;
    it.active = true;
    if (it.kind === 'hoop') {
      // un cerceau jamais pile sur le cascadeur : il faut aller le chercher
      let x = 0;
      let y = 0;
      for (let i = 0; i < 8; i++) {
        x = (rnd() * 2 - 1) * (bx - 16);
        y = (rnd() * 2 - 1) * by * 0.7;
        if (Math.hypot(x - f.px, y - f.py) > 28) break;
      }
      it.x = x; it.y = y; it.vx = 0; it.vy = 0;
      return;
    }
    const alt = st.h * (1 - Math.pow(it.tHit / f.T, C.fall.accel));
    it.type = it.kind === 'cloud' ? 'cloud' : pickObstacle(alt, rnd);
    const def = OBSTACLES[it.type];
    it.decor = it.kind === 'cloud' || rnd() < C.obstacles.decorChance;
    const dirSign = rnd() < 0.5 ? -1 : 1;
    const sp = def.speed[0] + rnd() * (def.speed[1] - def.speed[0]);
    it.vx = dirSign * sp;
    it.vy = (rnd() - 0.5) * sp * 0.3;
    it.flip = dirSign < 0 ? -1 : 1;
    if (it.decor) {
      // simple décor, loin en dessous : dessiné petit et pâle, sans danger
      it.x = (rnd() * 2 - 1) * bx;
      it.y = (rnd() * 2 - 1) * G.H * 0.4;
    } else if (rnd() < 0.55) {
      it.x = clamp(f.px + (rnd() * 2 - 1) * 14, -bx, bx);
      it.y = clamp(f.py + (rnd() * 2 - 1) * 14, -by, by);
    } else {
      it.x = (rnd() * 2 - 1) * bx;
      it.y = (rnd() * 2 - 1) * by;
    }
  }

  // ---------- figures et combos ----------
  function validateCombo() {
    const cb = st.fall.combo;
    if (cb.count > 0) {
      const m = multFor(cb.count) + cb.bonus;
      const pts = gain(cb.pts * m);
      st.score += pts;
      const c = fallPos();
      popup('+' + num(pts), c.x + st.fall.px, c.y + st.fall.py - 26, PAL.yellow, 2);
      audio.sfx('combo', { mult: m });
    }
    cb.count = 0; cb.pts = 0; cb.bonus = 0; cb.idle = 0;
    st.fall.multShown = 1;
  }
  function doTrick(type) {
    const f = st.fall;
    if (!f || st.phase !== 'fall' || f.dos || f.stun > 0) return;
    if (f.trick) { f.queued = type; return; }
    f.trick = { type, t: 0 };
    f.lastTrick = type;
    f.trickAge = 0;
    const cb = f.combo;
    cb.count++;
    cb.pts += C.tricks.points[type];
    cb.idle = 0;
    audio.sfx('trick', { step: Math.min(cb.count, 24) });
    const m = multFor(cb.count);
    if (m > f.multShown) {
      f.multShown = m;
      const c = fallPos();
      popup('× ' + String(m).replace('.', ',') + ' !', c.x, c.y - 60, PAL.pink, 3);
      audio.buzz(30);
    }
  }
  function doDos() {
    const f = st.fall;
    if (!f || st.phase !== 'fall' || f.dos) return;
    validateCombo();
    // timing : plus on attend, plus le bonus monte
    const left = f.T - f.time;
    const c = fallPos();
    if (left <= C.dos.perfect) { f.dosBonus = 1 + C.dos.maxBonus; f.dosPerfect = true; }
    else if (left < C.dos.window) f.dosBonus = 1 + C.dos.maxBonus * 0.8 * (1 - (left - C.dos.perfect) / (C.dos.window - C.dos.perfect));
    else f.dosBonus = 1;
    f.dosBonus = Math.round(f.dosBonus * 10) / 10;
    popup(f.dosPerfect ? t('chute.dosPerfect') : left >= C.dos.window ? t('chute.dosEarly') : '× ' + String(f.dosBonus).replace('.', ','), c.x + f.px, c.y + f.py - 24, f.dosPerfect ? PAL.pink : left >= C.dos.window ? PAL.grey : PAL.green, f.dosPerfect ? 2 : 1);
    if (f.dosPerfect) audio.buzz(40);
    f.dos = true;
    f.trick = null;
    f.queued = null;
    audio.sfx('dos');
  }

  // ---------- atterrissage ----------
  function land() {
    const f = st.fall;
    const d = Math.max(Math.abs(f.errX), Math.abs(f.errY)); // la pile de cartons est carrée : on compte le plus grand des deux écarts
    audio.wind(0);
    st.shake = 0.5;
    if (!f.dos) return fail('late');
    if (d > C.target.edge) return fail('miss');
    const zone = d <= C.target.perfect ? 'perfect' : d <= C.target.good ? 'good' : 'edge';
    const bonus = zone === 'perfect' ? Math.min(C.landing.streakMax, st.streak * C.landing.streakBonus) : 0;
    const pts = gain(C.landing[zone] * (st.h / 10) * (1 + bonus) * f.dosBonus);
    st.score += pts;
    st.streak = zone === 'perfect' ? st.streak + 1 : 0;
    st.result = { zone, pts, bonus, timing: f.dosBonus, parts: makeParts('#c9a36b', 26) };
    audio.sfx('land');
    audio.sfx(zone === 'perfect' ? 'perfect' : 'good');
    audio.buzz(zone === 'perfect' ? [40, 40, 80] : 60);
    setPhase('result');
  }
  function fail(reason) {
    st.result = { fail: reason, parts: makeParts('#9d8fc0', 14) };
    st.flash = 0.4;
    audio.sfx('hit');
    audio.sfx('fail');
    audio.buzz([120, 60, 200]);
    audio.intensity(0.3);
    setPhase('fail');
  }
  function makeParts(color, n) {
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + Math.random();
      const v = 30 + Math.random() * 70;
      return { x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 2 + Math.floor(Math.random() * 4), c: i % 3 ? color : '#e6cfa0' };
    });
  }
  function endGame() {
    const isBest = save.recordScore('chute', st.score);
    const reason = st.result && st.result.fail === 'late' ? t('chute.fail.late') : t('chute.fail.miss');
    app.go(gameOverScreen({
      game: 'chute', score: st.score, isBest, duration: st.playTime, steps: st.jump,
      lines: [reason, t('chute.over.height', { h: st.h }), t('stage.' + stage) + ' - ' + t('level.' + level.id)],
      replay: () => chuteGame({ stage, level: level.id }),
    }));
  }

  // ---------- pause ----------
  function pauseButtons() {
    return stack([
      { id: 'resume', label: t('pause.resume'), color: PAL.magenta, onClick: () => setPaused(false) },
      { id: 'restart', label: t('pause.restart'), color: PAL.cyan, onClick: () => app.go(chuteGame({ stage, level: level.id })) },
      { id: 'quit', label: t('pause.quit'), color: '#9d8fc0', onClick: () => app.go(selectScreen()) },
    ], Math.floor(G.H * 0.42), { h: 22, gap: 7 });
  }
  function setPaused(v) {
    if (st.phase === 'tutorial') return;
    st.paused = v;
    if (v) audio.wind(0);
    input.pointers.clear();
  }

  // ---------- commandes ----------
  function tap() {
    if (st.t < 0.25) return; // évite un double appui involontaire
    const zoneOf = (d) => (d <= C.target.perfect ? 'perfect' : d <= C.target.good ? 'good' : d <= C.target.edge ? 'edge' : 'miss');
    if (st.phase === 'aimDir') {
      st.gx = st.dir * C.aim.sweep;
      const z = zoneOf(Math.abs(st.gx + st.wind.dx) / st.sA);
      const dg = dirGauge();
      popup(t('chute.lock.' + z), clamp(dg.x + ((st.dir + 1) / 2) * dg.w, 30, G.W - 30), dg.y - 58, ZCOL[z], 2);
      audio.sfx('lock');
      st.pow = 0;
      setPhase('aimPow');
    } else if (st.phase === 'aimPow') {
      st.gy = (0.5 - st.pow) * 2 * C.aim.sweep;
      st.ex = st.gx + st.wind.dx;
      st.ey = st.gy + st.wind.dy;
      const z = zoneOf(Math.max(Math.abs(st.ex), Math.abs(st.ey)) / st.sA);
      popup(t('chute.aim.' + z), G.W / 2, G.H * 0.2, ZCOL[z], 2);
      audio.sfx(z === 'miss' ? 'back' : 'lock');
      setPhase('jump');
    }
  }
  function tutoEnd() {
    // fin du tutoriel (dernière page ou bouton « Passer »)
    if (opts.tutorialOnly) app.go(settingsScreen());
    else startJump();
  }
  function tutoNext() {
    audio.sfx('click');
    st.tutoPage++;
    if (st.tutoPage >= TUTO_PAGES) { st.tutoPage = TUTO_PAGES - 1; tutoEnd(); }
  }
  function tutoPrev() {
    if (st.tutoPage === 0) return;
    audio.sfx('click');
    st.tutoPage--;
  }

  const scene = {
    state: () => st, // pour les tests sur l'ordinateur (lecture seule)
    enter() {
      audio.music('chute');
      audio.intensity(0.3);
      if (st.phase !== 'tutorial') startJump();
    },
    leave() {
      audio.wind(0);
    },
    hide() {
      if (!st.paused && st.phase !== 'tutorial') setPaused(true);
    },

    pointer(type, p) {
      if (st.paused) {
        const b = pauseButtons().find((x) => p.x >= x.x && p.x < x.x + x.w && p.y >= x.y && p.y < x.y + x.h);
        if (type === 'down') st.pausePressed = b ? b.id : null;
        if (type === 'up') {
          const ok = b && b.id === st.pausePressed;
          st.pausePressed = null;
          if (ok) { audio.sfx('click'); b.onClick(); }
        }
        return;
      }
      if (st.phase === 'tutorial') {
        // « Passer » en haut à droite ; flèche « précédent » en bas à gauche ; partout ailleurs : page suivante
        const sb = skipBtn();
        const pb = tutoArrows().prev;
        const onSkip = p.x >= sb.x - 4 && p.y < sb.y + sb.h + 8;
        const onPrev = st.tutoPage > 0 && p.x >= pb.x - 6 && p.x < pb.x + pb.w + 6 && p.y >= pb.y - 6 && p.y < pb.y + pb.h + 6;
        if (type === 'down') st.pausePressed = onSkip ? 'skip' : onPrev ? 'prev' : 'next';
        if (type === 'up' && !p.cancelled) {
          const was = st.pausePressed;
          st.pausePressed = null;
          if (was === 'skip' && onSkip) { audio.sfx('click'); tutoEnd(); }
          else if (was === 'prev' && onPrev) tutoPrev();
          else if (was === 'next') tutoNext();
        }
        return;
      }
      const pr = pauseRect();
      if (type === 'down' && p.x >= pr.x - 4 && p.y < pr.y + pr.h + 6) {
        p.data.ui = true;
        audio.sfx('click');
        setPaused(true);
        return;
      }
      if (p.data.ui) return;
      if (st.phase === 'aimDir' || st.phase === 'aimPow') {
        if (type === 'down') tap();
        return;
      }
      if (st.phase !== 'fall') return;
      const f = st.fall;
      if (type === 'down') {
        p.data.side = p.x < G.W / 2 ? 'L' : 'R';
        p.data.ox = p.x;
        p.data.oy = p.y;
        p.data.swiped = false;
        p.data.dist = 0;
      } else if (type === 'move') {
        p.data.dist += Math.abs(p.dx) + Math.abs(p.dy);
        if (p.data.side === 'L') {
          // pouce gauche : déplacer le cascadeur
          f.px += p.dx * C.fall.touchGain;
          f.py += p.dy * C.fall.touchGain;
        } else if (p.data.side === 'R') {
          // pouce droit : un glissé = une figure
          const dx = p.x - p.data.ox;
          const dy = p.y - p.data.oy;
          if (Math.hypot(dx, dy) >= C.fall.swipeMin) {
            if (Math.abs(dx) > Math.abs(dy)) doTrick(dx < 0 ? 'vrilleGauche' : 'vrilleDroite');
            else doTrick(dy < 0 ? 'saltoAvant' : 'saltoArriere');
            p.data.ox = p.x;
            p.data.oy = p.y;
            p.data.swiped = true;
          }
        }
      } else if (type === 'up') {
        // simple tape, à gauche comme à droite : position dos.
        // À gauche, le doigt sert aussi à se déplacer : on ne compte qu'un appui bref, presque sans bouger.
        const quick = !p.cancelled && performance.now() - p.t0 < 400;
        if (p.data.side === 'R' && !p.data.swiped && quick) doDos();
        else if (p.data.side === 'L' && quick && p.data.dist < 5) doDos();
      }
    },

    key(code, down) {
      if (!down) return;
      if (st.phase === 'tutorial') {
        if (code === 'Space' || code === 'Enter' || code === 'ArrowRight') tutoNext();
        else if (code === 'ArrowLeft') tutoPrev();
        else if (code === 'Escape') { audio.sfx('click'); tutoEnd(); }
        return;
      }
      if (code === 'Escape' || code === 'KeyP') { audio.sfx('click'); setPaused(!st.paused); return; }
      if (st.paused) return;
      if ((code === 'Space' || code === 'Enter') && (st.phase === 'aimDir' || st.phase === 'aimPow')) return tap();
      if (st.phase !== 'fall') return;
      if (code === 'KeyW') doTrick('saltoAvant');
      else if (code === 'KeyS') doTrick('saltoArriere');
      else if (code === 'KeyA') doTrick('vrilleGauche');
      else if (code === 'KeyD') doTrick('vrilleDroite');
      else if (code === 'Space') doDos();
    },

    update(dt) {
      if (st.paused) return;
      st.time += dt;
      st.t += dt;
      st.shake = Math.max(0, st.shake - dt);
      st.flash = Math.max(0, st.flash - dt);
      st.popups.forEach((p) => { p.age += dt; p.y -= dt * 22; });
      st.popups = st.popups.filter((p) => p.age < 1.1);
      if (st.phase !== 'tutorial') st.playTime += dt;

      if (st.phase === 'intro') {
        if (!st.clapped && st.t > 0.55) { st.clapped = true; audio.sfx('clap'); audio.buzz(30); }
        if (st.t > 1.45) setPhase('aimDir');
      } else if (st.phase === 'aimDir') {
        // le curseur part de la gauche après un court temps d'arrêt ; un « tic » sonne au passage du centre de la zone
        const before = st.dir;
        st.dir = tri((Math.max(0, st.t - AIM_HOLD) * st.speed) / C.aim.directionPeriod) * 2 - 1;
        const c0 = clamp(-st.wind.dx / C.aim.sweep, -1, 1);
        if ((before - c0) * (st.dir - c0) < 0) audio.sfx('tick');
      } else if (st.phase === 'aimPow') {
        const before = st.pow;
        st.pow = tri((Math.max(0, st.t - AIM_HOLD) * st.speed) / C.aim.powerPeriod);
        const c0 = clamp(0.5 + st.wind.dy / (2 * C.aim.sweep), 0, 1);
        if ((before - c0) * (st.pow - c0) < 0) audio.sfx('tick');
      } else if (st.phase === 'jump') {
        if (st.t > 0.45 && st.t - dt <= 0.45) audio.sfx('whoosh');
        if (st.t > 0.95) startFall();
      } else if (st.phase === 'fall') {
        updateFall(dt);
      } else if (st.phase === 'result' || st.phase === 'fail') {
        st.result.parts.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; });
        if (st.phase === 'result' && st.t > 2.3) {
          st.jump++;
          st.h = nextHeight(st.h);
          startJump();
        }
        if (st.phase === 'fail' && st.t > 2.1) endGame();
      }
    },

    draw() {
      if (st.phase === 'tutorial') return drawTutorial();
      const c = G.ctx;
      const sh = st.shake > 0 ? Math.round((Math.random() - 0.5) * st.shake * 10) : 0;
      if (st.phase === 'intro' || st.phase === 'aimDir' || st.phase === 'aimPow' || st.phase === 'jump') drawAim();
      else drawFallView(sh);
      if (st.flash > 0) alpha(st.flash * 1.5, () => rect(0, 0, G.W, G.H, '#ff3b4e'));
      drawHud();
      for (const p of st.popups) {
        const a = p.age > 0.8 ? (1.1 - p.age) / 0.3 : 1;
        alpha(a, () => fitText(p.str, p.x, p.y, { color: p.color, scale: p.scale, outline: INK }));
      }
      if (st.paused) drawPause();
      void c;
    },
  };

  // ---------- logique de la chute ----------
  function updateFall(dt) {
    const f = st.fall;
    const prev = f.time;
    f.time += dt;
    const p = prog(f);
    audio.wind(0.35 + 0.65 * p);

    // déplacement au clavier
    const k = input.keys;
    const mv = C.fall.moveSpeed * dt;
    if (k.has('ArrowLeft')) f.px -= mv;
    if (k.has('ArrowRight')) f.px += mv;
    if (k.has('ArrowUp')) f.py -= mv;
    if (k.has('ArrowDown')) f.py += mv;
    const bx = G.W / 2 - 10;
    const by = G.H * 0.3;
    f.px = clamp(f.px, -bx, bx);
    f.py = clamp(f.py, -by, by);
    // à la toute fin, le cascadeur revient sur sa trajectoire : esquiver ne change pas le point d'atterrissage
    const left = f.T - f.time;
    if (left < C.fall.recenterTime) {
      const u = clamp(dt / Math.max(0.02, left), 0, 1);
      f.px = lerp(f.px, 0, u);
      f.py = lerp(f.py, 0, u);
    }

    // figure en cours
    f.stun = Math.max(0, f.stun - dt);
    f.trickAge += dt;
    if (f.trick) {
      f.trick.t += dt;
      if (f.trick.t >= C.tricks.duration) {
        f.trick = null;
        if (f.queued) { const q = f.queued; f.queued = null; doTrick(q); }
      }
    } else if (f.combo.count > 0) {
      f.combo.idle += dt;
      if (f.combo.idle >= C.tricks.comboTimeout) validateCombo();
    }

    // obstacles et cerceaux
    for (const it of f.items) {
      if (!it.active && f.time >= it.tHit - it.lead) activate(it);
      if (!it.active || it.done) continue;
      if (prev < it.tHit && f.time >= it.tHit) {
        it.done = true;
        const ox = it.x;
        const oy = it.y;
        const c = fallPos();
        if (it.kind === 'hoop') {
          const d = Math.hypot(f.px - ox, f.py - oy);
          if (d < C.hoops.passRadius) {
            st.score += gain(C.hoops.bonus);
            f.combo.bonus += C.hoops.multBonus;
            it.result = 'pass';
            popup('+' + gain(C.hoops.bonus), c.x + ox, c.y + oy - 12, PAL.green, 2);
            audio.sfx('hoop');
            audio.buzz(40);
          } else if (d < C.hoops.burnRadius) {
            st.score = Math.max(0, st.score - C.hoops.penalty);
            it.result = 'burn';
            popup('-' + C.hoops.penalty, c.x + f.px, c.y + f.py - 20, PAL.red, 2);
            st.flash = 0.25;
            audio.sfx('burn');
            audio.buzz(90);
          }
        } else if (!it.decor && !f.dos) {
          const def = OBSTACLES[it.type];
          const r = C.fall.playerRadius;
          const hit = def.boxes.some((b) => Math.abs(f.px - (ox + b[0] * it.flip)) < b[2] + r && Math.abs(f.py - (oy + b[1])) < b[3] + r);
          if (hit) {
            const had = f.combo.count > 0;
            f.combo = { count: 0, pts: 0, bonus: 0, idle: 0 };
            f.multShown = 1;
            f.trick = null;
            f.queued = null;
            f.stun = C.obstacles.stun;
            it.result = 'hit';
            popup(t(had ? 'chute.comboLost' : 'chute.ouch'), c.x + f.px, c.y + f.py - 22, PAL.red);
            st.shake = 0.3;
            st.flash = 0.2;
            audio.sfx('hit');
            audio.buzz(80);
          }
        }
      }
    }

    // compte à rebours de la position dos : les bips s'accélèrent
    const leftDos = f.T - f.time;
    if (!f.dos && leftDos < C.dos.window) {
      f.warnT -= dt;
      if (f.warnT <= 0) { f.warnT = 0.1 + 0.3 * (leftDos / C.dos.window); audio.sfx('warn'); }
    }
    if (f.time >= f.T) land();
  }

  // ---------- zones des jauges de visée ----------
  // Les zones colorées montrent la cible. Avec du vent, il ne faut pas viser la cible :
  // un repère bleu (notch) indique où arrêter le curseur pour que le vent pousse le cascadeur dessus.
  function dirZones() {
    const sw = C.aim.sweep;
    const mk = (r, color) => {
      const rr = (r * st.sA) / sw;
      return { a: (1 - rr) / 2, b: (1 + rr) / 2, color };
    };
    return [mk(C.target.edge, Z_EDGE), mk(C.target.good, Z_GOOD), mk(C.target.perfect, Z_PERFECT)];
  }
  // La jauge de puissance montre les mêmes zones : les deux jauges sont indépendantes et ne sont jamais vides.
  // Le résultat du saut est la moins bonne des deux (un « Parfait » demande deux « Parfait »).
  const powZones = dirZones;
  const dirNotch = () => (st.wind.level > 0 ? (1 - st.wind.dx / C.aim.sweep) / 2 : null);
  const powNotch = () => (st.wind.level > 0 ? 0.5 + st.wind.dy / (2 * C.aim.sweep) : null);
  const dirGauge = () => ({ x: 12, y: G.H - 26 - G.safeBottom - 26, w: G.W - 24, h: 11 });
  const powGauge = () => {
    const h = Math.round(Math.min(120, G.H * 0.34));
    return { x: G.W - 22, y: Math.round(G.H * 0.42 - h / 2), w: 11, h };
  };

  // ---------- dessin : la visée ----------
  function drawAim() {
    const T = aimPos();
    const Cc = fallPos();
    const sw = C.aim.sweep;
    let ox = T.x;
    let oy = T.y;
    let k = FISH;
    let slide = 0;
    let viewS = st.sA;
    let k2 = 1;
    let push = 0; // 0 → 1 : le vent pousse le cascadeur après le saut
    if (st.phase === 'jump') {
      push = clamp(st.t / 0.45, 0, 1);
      const u2 = ease(clamp((st.t - 0.45) / 0.5, 0, 1));
      // la caméra recule : le sol rapetisse jusqu'à sa taille de début de chute
      viewS = lerp(st.sA, st.s0, u2);
      k2 = viewS / st.sA;
      ox = lerp(T.x, Cc.x - st.ex * k2, u2);
      oy = lerp(T.y, Cc.y - st.ey * k2, u2);
      k = FISH * (1 - u2);
      slide = u2;
    }
    // le point visé (sans le vent) ; après le saut, on le voit se faire pousser par le vent
    const aimX = (st.phase === 'aimDir' ? st.dir * sw : st.gx) + st.wind.dx * push;
    const aimY = st.phase === 'aimPow' ? (0.5 - st.pow) * 2 * sw : st.phase === 'jump' ? st.gy + st.wind.dy * push : null;
    const ctx = fisheyeBuffer();
    withCtx(ctx, () => {
      drawGround(ox, oy, viewS, stage, st.time);
      // de haut, quelques nuages passent dans les coins (jamais sur la cible)
      const dens = clamp((st.h - C.clouds.from) / (C.clouds.full - C.clouds.from), 0, 1) * (1 - slide);
      if (dens > 0) {
        const img = obstacleSprite('cloud');
        [[0.12, 0.13], [0.9, 0.26], [0.1, 0.7], [0.92, 0.66]].forEach(([fx, fy], i) => {
          sprite(img, fx * G.W + Math.sin(st.time * 0.35 + i * 2) * 10, fy * G.H, 1.6, 1.6, 0, dens * 0.8);
        });
      }
      if (st.phase === 'intro') return;
      // la flèche du vent : elle part de l'endroit à viser et arrive sur la cible
      if (st.wind.level > 0) windArrow(ox - st.wind.dx * k2, oy - st.wind.dy * k2, ox, oy);
      const x = Math.round(ox + aimX * k2);
      if (st.phase !== 'jump') {
        // ligne de visée, épaisse et contrastée
        rect(x - 2, 0, 5, G.H, 'rgba(20,10,34,0.85)');
        rect(x - 1, 0, 3, G.H, st.phase === 'aimDir' ? '#ffffff' : '#ffd23f');
      }
      if (aimY !== null) crosshair(x, Math.round(oy + aimY * k2), st.phase === 'jump' ? '#ffd23f' : '#ffffff');
    });
    fisheyeBlit(k, lerp(T.x, Cc.x, slide), lerp(T.y, Cc.y, slide));

    // le bord d'où il saute, et ses bottes (caméra embarquée)
    const py = G.H - 26 - G.safeBottom + Math.round(slide * 60);
    drawPlatform(stage, py, st.time);
    const bt = boots(charId);
    G.ctx.drawImage(bt, Math.round(G.W / 2 - bt.width / 2), py - 8 - Math.round(slide * 30));

    // le cascadeur qui s'élance : il passe devant la caméra puis rapetisse
    if (st.phase === 'jump' && st.t > 0.45) {
      const u = clamp((st.t - 0.45) / 0.5, 0, 1);
      sprite(fallerHi(charId, 'back'), Cc.x, lerp(G.H + 20, Cc.y, ease(u)), lerp(3, 1, u));
    }

    // les deux jauges : une seule est active à la fois
    if (st.phase === 'aimDir' || st.phase === 'aimPow') {
      const isDir = st.phase === 'aimDir';
      const dg = dirGauge();
      const pg = powGauge();
      rect(0, dg.y - 30, G.W, 50, 'rgba(12,5,30,0.6)');
      gauge(dg.x, dg.y, dg.w, dg.h, ((isDir ? st.dir : st.gx / sw) + 1) / 2, dirZones(), { active: isDir, notch: dirNotch() });
      gauge(pg.x, pg.y, pg.w, pg.h, isDir ? null : st.pow, isDir ? [] : powZones(), { vertical: true, active: !isDir, notch: powNotch() });
      // étapes : 1 Direction, 2 Puissance
      const blink = Math.floor(st.time * 4) % 2 === 0;
      const chip = (n, label, x, on) => {
        const w = measure(label) + 20;
        rect(x - 1, dg.y - 28, w + 2, 13, INK);
        rect(x, dg.y - 27, w, 11, on ? '#ffd23f' : '#3a2a66');
        rect(x, dg.y - 27, 11, 11, on ? (blink ? '#ff2e97' : '#ff8a3c') : '#5a4f73');
        text(String(n), x + 3, dg.y - 25, { color: '#ffffff' });
        text(label, x + 15, dg.y - 25, { color: on ? INK : '#9a90b3' });
        return w;
      };
      const w1 = chip(1, t('chute.step.dir'), dg.x, isDir);
      chip(2, t('chute.step.pow'), dg.x + w1 + 6, !isDir);
      if (st.jump < 3) fitText(t(st.wind.level > 0 ? 'chute.hint.wind' : 'chute.hint.zone'), G.W / 2, dg.y - 42, { color: st.wind.level > 0 ? WIND : '#ffffff', outline: INK });
    }

    if (st.phase === 'intro') {
      const open = st.t < 0.4 ? 1 : st.t < 0.55 ? 1 - (st.t - 0.4) / 0.15 : 0;
      clapboard(G.W / 2, G.H * 0.3, open, t('chute.scene', { n: st.jump + 1 }));
      text(st.h + ' m', G.W / 2, G.H * 0.3 + 24, { align: 'center', color: PAL.yellow, scale: 2, outline: '#150a2e' });
      if (st.t > 0.55) banner(t('arcade.action'), G.H * 0.55, st.t - 0.55, PAL.yellow);
    }
  }

  // ---------- dessin : la chute vue du dessus ----------
  // Peu d'éléments, pour que tout se lise d'un coup d'œil : le décor, le cascadeur,
  // le rouge à éviter, le vert à viser, et l'anneau de la réception à la fin.
  function drawFallView(sh) {
    const f = st.fall;
    const Cc = fallPos();
    const c = { x: Cc.x + sh, y: Cc.y + sh };
    const landed = st.phase !== 'fall';
    const p = landed ? 1 : prog(f);
    const s = 1 / (1 + (1 - p) * f.K);
    drawGround(c.x - f.errX * s, c.y - f.errY * s, s, stage, st.time);

    if (!landed) {
      // pendant le compte à rebours de la réception, le décor s'assombrit pour faire ressortir l'anneau
      const left = f.T - f.time;
      if (!f.dos && left < C.dos.window) rect(0, 0, G.W, G.H, 'rgba(12,5,30,0.4)');
      // ombre : là où il va tomber
      alpha(0.4, () => disc(c.x, c.y, 2 + 7 * s, '#000'));
      // quelques traits de vitesse, sur les bords seulement
      const R = Math.hypot(G.W, G.H) / 2;
      const u = clamp(f.time / f.T, 0, 1);
      const spd = C.fall.accel * Math.pow(Math.max(0.05, u), C.fall.accel - 1);
      const n = Math.round(5 + spd * 6);
      for (let i = 0; i < n; i++) {
        const a = i * 2.39996;
        const ph = (f.time * (1.2 + spd * 1.2) + i * 0.37) % 1;
        const r0 = 62 + ph * R;
        const len = (4 + ph * 10) * (0.6 + spd);
        alpha(0.12 + ph * 0.3, () => line(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0, c.x + Math.cos(a) * (r0 + len), c.y + Math.sin(a) * (r0 + len), PAL.white));
      }
      // en altitude, on traverse des nuages : ils arrivent du centre et filent vers les bords
      const dens = clamp((st.h * (1 - p) - C.clouds.from) / (C.clouds.full - C.clouds.from), 0, 1);
      if (dens > 0) {
        const img = obstacleSprite('cloud');
        for (let i = 0; i < C.clouds.count; i++) {
          const a = i * 2.39996 + 0.6;
          const ph = (f.time * (0.22 + spd * 0.22) + i / C.clouds.count) % 1;
          const r0 = 34 + ph * ph * R * 1.15;
          const sc = 0.8 + ph * 2.4;
          sprite(img, c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0 * 1.15, sc, sc, 0, dens * Math.sin(Math.PI * ph) * 0.85);
        }
      }
    }

    const drawItem = (it, near) => {
      const dt = it.tHit - f.time;
      if (near !== dt < 0) return;
      if (dt < -0.25) return;
      const k = dt >= 0 ? clamp(1 - dt / it.lead, 0, 1) : 1; // 0 = vient d'apparaître, 1 = à hauteur du cascadeur
      const hx = c.x + it.x; // là où il croisera le cascadeur
      const hy = c.y + it.y;
      const x = hx + it.vx * -dt;
      const y = hy + it.vy * -dt;
      const sc = dt >= 0 ? 0.3 + 0.7 * k * k : 1 + (-dt / 0.25) * 0.8;
      const a = dt >= 0 ? clamp(k * 6, 0, 1) : 1 + dt / 0.25;
      if (it.kind === 'hoop') {
        if (dt >= 0) {
          // le vert : c'est là qu'il faut passer
          alpha(0.35 + 0.3 * k, () => disc(hx, hy, C.hoops.passRadius, '#3dfc9a'));
          ring(hx, hy, C.hoops.passRadius + 1, 1, '#eafff5');
        }
        if (it.result === 'pass' && dt < 0) return;
        drawHoop(hx, hy, C.hoops.radius * sc, st.time, a);
        return;
      }
      const img = obstacleSprite(it.type);
      const def = OBSTACLES[it.type];
      if (it.decor) {
        // simple décor, loin en dessous : petit et pâle, sans danger
        const far = it.kind === 'cloud';
        sprite(img, x, y, (far ? 1 : 0.5) * it.flip, far ? 1 : 0.5, 0, a * (far ? 0.3 : 0.4));
        return;
      }
      if (dt >= 0) {
        // le rouge : c'est là que l'obstacle va passer. La zone rougit en approchant.
        const blink = dt < 0.6 && Math.floor(st.time * 10) % 2 === 0;
        for (const b of def.boxes) {
          const bx = Math.round(hx + b[0] * it.flip - b[2]);
          const by = Math.round(hy + b[1] - b[3]);
          alpha(0.18 + 0.42 * k, () => rect(bx, by, b[2] * 2, b[3] * 2, '#ff3b4e'));
          frame(bx - 1, by - 1, b[2] * 2 + 2, b[3] * 2 + 2, blink ? '#ffffff' : '#ff3b4e');
        }
      }
      sprite(img, x, y, sc * it.flip, sc, 0, a);
      if (def.rotor) {
        const ra = st.time * 30;
        const rr = 13 * sc;
        alpha(a, () => {
          line(x - Math.cos(ra) * rr + 2 * sc * it.flip, y - Math.sin(ra) * rr, x + Math.cos(ra) * rr + 2 * sc * it.flip, y + Math.sin(ra) * rr, '#e8e4f0');
          line(x + Math.sin(ra) * rr + 2 * sc * it.flip, y - Math.cos(ra) * rr, x - Math.sin(ra) * rr + 2 * sc * it.flip, y + Math.cos(ra) * rr, '#e8e4f0');
        });
      }
    };
    if (!landed) {
      const sorted = f.items.filter((it) => it.active).sort((a, b) => b.tHit - a.tHit);
      sorted.forEach((it) => drawItem(it, false));
      drawPlayer(c.x + f.px, c.y + f.py, f);
      sorted.forEach((it) => drawItem(it, true));
    } else {
      // après l'impact
      const r = st.result;
      const ok = !r.fail;
      if (ok) sprite(fallerHi(charId, 'dos'), c.x, c.y, 0.9);
      else sprite(fallerHi(charId, f.dos ? 'dos' : 'back'), c.x, c.y + 2, 1, 1, 0.5);
      for (const pt of r.parts) rect(c.x + pt.x, c.y + pt.y, pt.s, pt.s, pt.c);
      if (!ok && Math.floor(st.t * 6) % 2 === 0) text('★ ★ ★', c.x, c.y - 26, { align: 'center', color: PAL.yellow, outline: INK });
      if (ok) {
        banner(t('chute.zone.' + r.zone), G.H * 0.22, st.t, ZCOL[r.zone]);
        text('+' + num(r.pts), G.W / 2, G.H * 0.22 + 20, { align: 'center', color: PAL.yellow, scale: 2, outline: '#150a2e' });
        if (r.timing > 1) fitText(t('chute.timing') + ' × ' + String(r.timing).replace('.', ','), G.W / 2, G.H * 0.22 + 40, { color: PAL.green, outline: '#150a2e' });
        if (r.bonus > 0) fitText(t('chute.streak', { n: st.streak }), G.W / 2, G.H * 0.22 + 51, { color: PAL.pink, outline: '#150a2e' });
        if (st.t > 1.1) banner(t('arcade.next'), G.H * 0.72, st.t - 1.1, PAL.green, 2);
      } else {
        banner(t('arcade.cut'), G.H * 0.22, st.t, PAL.red);
        fitText(t(r.fail === 'late' ? 'chute.fail.late' : 'chute.fail.miss'), G.W / 2, G.H * 0.22 + 22, { color: PAL.white, outline: '#150a2e' });
      }
    }
  }

  function drawPlayer(x, y, f) {
    if (f.stun > 0 && Math.floor(st.time * 20) % 2 === 0) return;
    if (f.dos) {
      sprite(fallerHi(charId, 'dos'), x, y, 1);
      return;
    }
    let sx = 1;
    let sy = 1;
    let rot = 0;
    let pose = 'back';
    let ox = 0;
    let oy = 0;
    if (f.trick) {
      const u = f.trick.t / C.tricks.duration;
      const cs = Math.cos(u * Math.PI * 2);
      const bump = Math.sin(u * Math.PI) * 5;
      const type = f.trick.type;
      if (type === 'saltoAvant' || type === 'saltoArriere') {
        sy = Math.abs(cs) < 0.2 ? 0.2 : Math.abs(cs);
        if (cs < 0) { pose = 'front'; }
        oy = type === 'saltoAvant' ? -bump : bump;
      } else {
        sx = Math.abs(cs) < 0.2 ? 0.2 : Math.abs(cs);
        if (cs < 0) pose = 'front';
        const dir = type === 'vrilleGauche' ? -1 : 1;
        ox = dir * bump;
        rot = dir * Math.sin(u * Math.PI * 2) * 0.3;
      }
    } else {
      // petite respiration en chute libre
      oy = Math.round(Math.sin(st.time * 9) * 1);
    }
    sprite(fallerHi(charId, pose), x + ox, y + oy, sx, sy, rot);
    if (f.trickAge < 0.6 && f.lastTrick) {
      fitText(t(TRICKS[f.lastTrick].key), x, y + 22, { color: '#ffffff', outline: INK });
    }
  }

  // ---------- affichage tête haute ----------
  function drawHud() {
    const top = 4 + G.safeTop;
    text(num(st.score), 7, top + 1, { color: PAL.yellow, scale: 2, outline: '#150a2e' });
    const pr = pauseRect();
    rect(pr.x - 1, pr.y - 1, pr.w + 2, pr.h + 2, INK);
    rect(pr.x, pr.y, pr.w, pr.h, '#3a2a66');
    rect(pr.x, pr.y, pr.w, 1, '#7c5cff');
    rect(pr.x + 6, pr.y + 4, 2, 8, PAL.white);
    rect(pr.x + 10, pr.y + 4, 2, 8, PAL.white);
    const aiming = st.phase === 'aimDir' || st.phase === 'aimPow' || st.phase === 'jump';
    if (aiming || st.phase === 'fall') viewfinder(st.time, G.W - 30, top + 24);

    if (aiming) {
      text(t('chute.scene', { n: st.jump + 1 }) + ' - ' + st.h + ' m', 7, top + 22, { color: PAL.white, outline: '#150a2e' });
      // le vent : sa force en clair et sa direction (rien à afficher quand il n'y en a pas)
      if (st.wind.level > 0) {
        const lv = st.wind.level;
        const word = t(lv <= 2 ? 'chute.wind.low' : lv <= 5 ? 'chute.wind.mid' : 'chute.wind.high');
        const col = lv <= 2 ? '#3dfc9a' : lv <= 5 ? '#ffd23f' : '#ff7a85';
        const wx = 6;
        const wy = top + 36;
        const pw = Math.max(measure(t('chute.wind')), measure(word)) + 34;
        panel(wx, wy, pw, 22, WIND);
        text(t('chute.wind'), wx + 4, wy + 3, { color: WIND });
        text(word, wx + 4, wy + 12, { color: col });
        const cx = wx + pw - 13;
        const cy = wy + 11;
        const vx = Math.cos(st.wind.ang);
        const vy = Math.sin(st.wind.ang);
        const len = 4 + Math.min(4, lv * 0.5); // plus le vent est fort, plus la flèche est longue
        line(cx - vx * len, cy - vy * len, cx + vx * len, cy + vy * len, WIND, 2);
        const hx = cx + vx * len;
        const hy = cy + vy * len;
        line(hx, hy, hx - vx * 4 - vy * 4, hy - vy * 4 + vx * 4, WIND, 2);
        line(hx, hy, hx - vx * 4 + vy * 4, hy - vy * 4 - vx * 4, WIND, 2);
      }
    }

    if (st.phase === 'fall') {
      const f = st.fall;
      const alt = Math.max(0, st.h * (1 - prog(f)));
      text((alt >= 10 ? Math.round(alt) : alt.toFixed(1).replace('.', ',')) + ' m', G.W / 2 + 6, top + 1, { align: 'center', color: PAL.white, scale: 2, outline: '#150a2e' });
      // combo en cours : le multiplicateur, le nombre de figures, et le temps avant validation
      const cb = f.combo;
      if (cb.count > 0) {
        const m = multFor(cb.count) + cb.bonus;
        const ms = '× ' + String(m).replace('.', ',');
        text(ms, 7, top + 22, { color: PAL.pink, scale: 2, outline: INK });
        text(cb.count + ' ' + t(cb.count > 1 ? 'chute.tricks' : 'chute.trickOne'), 7, top + 40, { color: '#ffffff', outline: INK });
        rect(6, top + 51, 42, 4, INK);
        rect(7, top + 52, Math.round(40 * (1 - cb.idle / C.tricks.comboTimeout)), 2, PAL.yellow);
      }

      // ----- position dos : un anneau se referme sur le cascadeur ; plus on attend, plus le bonus monte -----
      const left = f.T - f.time;
      const Cc = fallPos();
      const px = Cc.x + f.px;
      const py = Cc.y + f.py;
      const R0 = 20;
      const span = 58;
      const by = Math.round(G.H * 0.83);
      if (f.dos) {
        ringOut(px, py, R0, 2, f.dosPerfect ? Z_PERFECT : '#3dfc9a');
        const label = (f.dosPerfect ? t('chute.dosPerfect') : t('chute.dosOk')) + '  × ' + String(f.dosBonus).replace('.', ',');
        banner(label, by, 1, f.dosPerfect ? Z_PERFECT : '#3dfc9a', 2);
      } else if (left < C.dos.window) {
        const k = clamp(left / C.dos.window, 0, 1);
        const perfect = left <= C.dos.perfect;
        const band = (span * C.dos.perfect) / C.dos.window;
        const fast = Math.floor(st.time * (perfect ? 18 : 8)) % 2 === 0;
        // la bande rose : c'est là qu'il faut taper
        alpha(0.5, () => ring(px, py, R0 + band, band, Z_PERFECT));
        ringOut(px, py, R0, 2, '#ffffff');
        // l'anneau qui se referme
        const col = perfect ? (fast ? '#ffffff' : Z_PERFECT) : k < 0.45 ? '#ffd23f' : '#2de2e6';
        ringOut(px, py, R0 + k * span + 1, 4, col);
        const bonus = perfect ? 1 + C.dos.maxBonus : 1 + C.dos.maxBonus * 0.8 * (1 - (left - C.dos.perfect) / (C.dos.window - C.dos.perfect));
        const word = perfect ? t('tuto.tapNow') : t('chute.dosNow');
        banner(word + '  × ' + bonus.toFixed(1).replace('.', ','), by, 1, perfect && fast ? '#ffffff' : col, 2);
        if (st.jump < 2) fitText(t(isTouch() ? 'chute.dosHint' : 'chute.dosHintKey'), G.W / 2, by + 18, { color: PAL.white, outline: INK });
      }

      // repères des deux pouces, au début des deux premières chutes
      if (st.jump < 2 && f.time < 2.2) {
        const a = clamp(2.2 - f.time, 0, 1) * 0.9;
        alpha(a, () => {
          rect(G.W / 2, G.H * 0.66, 1, G.H * 0.22, PAL.white);
          fitText(t(isTouch() ? 'chute.left' : 'chute.leftKeys'), G.W / 4, G.H * 0.76, { color: PAL.white, outline: '#150a2e' });
          fitText(t(isTouch() ? 'chute.right' : 'chute.rightKeys'), (G.W * 3) / 4, G.H * 0.76, { color: PAL.white, outline: '#150a2e' });
        });
      }
    }
  }

  function drawPause() {
    dim(0.7);
    banner(t('pause.title'), G.H * 0.26, 1, PAL.yellow, 2);
    pauseButtons().forEach((b) => drawButton(b, st.pausePressed === b.id, false));
  }

  // ---------- tutoriel ----------
  // Il s'affiche avant chaque partie lancée depuis le menu (pour qu'un nouveau joueur ne soit jamais perdu),
  // avec un bandeau « Tutoriel » et un bouton « Passer » pour ceux qui connaissent déjà.
  // 5 pages : 1 viser, 2 le vent, 3 esquiver (pouce gauche), 4 les figures (pouce droit), 5 la position dos.
  const skipBtn = () => ({ id: 'skip', x: G.W - 74, y: 5 + G.safeTop, w: 68, h: 17, icon: 'next', label: t('tuto.skip'), color: '#7c5cff' });

  // Le panneau du bas prend juste la hauteur de son texte ; l'illustration occupe tout le reste.
  function tutoLayout() {
    const page = st.tutoPage;
    const body = t('tuto.chute.' + (page + 1) + (page >= 2 && !isTouch() ? '.keys' : '.body'));
    const panelH = 22 + wrap(body, G.W - 28).length * 10 + 26;
    return { body, panelH, py: G.H - panelH - 6 - G.safeBottom };
  }
  // Flèches en bas du panneau : revenir à l'explication précédente, passer à la suivante.
  function tutoArrows() {
    const { panelH, py } = tutoLayout();
    const y = py + panelH - 24;
    return {
      prev: { id: 'prev', kind: 'round', x: 10, y, w: 22, h: 22, icon: 'left', color: '#7c5cff' },
      next: { id: 'next', kind: 'round', x: G.W - 32, y, w: 22, h: 22, icon: 'right', color: '#ff2e97' },
    };
  }

  function drawTutorial() {
    const { W, H } = G;
    const tt = st.time;
    rect(0, 0, W, H, PAL.night);
    const page = st.tutoPage;
    const touch = isTouch();
    const title = t('tuto.chute.' + (page + 1) + '.title');
    const { body, panelH, py } = tutoLayout();
    const cx = Math.floor(W / 2);
    const cy = Math.max(64 + G.safeTop, Math.floor(py * 0.46));
    const gy = py - 26;
    const tapNow = (x, y) => {
      const w = measure(t('tuto.tapNow'), 2) + 10;
      rect(Math.round(x - w / 2) - 1, y - 1, w + 2, 20, INK);
      rect(Math.round(x - w / 2), y, w, 18, '#ffd23f');
      text(t('tuto.tapNow'), x, y + 2, { align: 'center', color: INK, scale: 2 });
    };
    // un pouce : un rond coloré avec son contour
    const thumb = (x, y, col) => { ringOut(x, y, 8, 8, col); rect(x - 2, y - 3, 2, 2, '#ffffff'); };
    if (page === 0 || page === 1) {
      // une jauge, des zones colorées, un curseur : on tape quand le curseur est dans la couleur
      const zones = [{ a: 0.33, b: 0.67, color: Z_EDGE }, { a: 0.41, b: 0.59, color: Z_GOOD }, { a: 0.46, b: 0.54, color: Z_PERFECT }];
      const v = tri(tt / 2.4);
      const gw = W - 40;
      const notch = page === 1 ? 0.28 : null; // avec du vent : le repère bleu
      drawGround(cx, cy, 0.6, stage, tt);
      if (page === 1) windArrow(cx - 0.22 * gw, cy, cx, cy);
      const lx = Math.round(20 + v * gw);
      rect(lx - 2, 0, 5, gy - 14, 'rgba(20,10,34,0.85)');
      rect(lx - 1, 0, 3, gy - 14, '#ffffff');
      gauge(20, gy, gw, 11, v, zones, { notch });
      const goal = page === 1 ? notch : 0.5;
      if (Math.abs(v - goal) < 0.07) tapNow(cx, Math.min(cy + 46, gy - 36));
    } else if (page === 2) {
      // pouce gauche : on déplace le cascadeur pour éviter le rouge et passer dans le vert
      drawGround(cx, cy, 0.3, stage, tt);
      const u = (tt % 3.2) / 3.2;
      // trajet : il contourne la zone rouge par la droite, puis passe dans le cerceau
      const fx = u < 0.5 ? lerp(-34, 30, ease(u / 0.5)) : lerp(30, -34, ease((u - 0.5) / 0.5));
      const fy = Math.sin(u * Math.PI * 2) * 14;
      alpha(0.55, () => rect(cx - 12, cy - 30, 22, 16, '#ff3b4e'));
      frame(cx - 13, cy - 31, 24, 18, '#ff3b4e');
      sprite(obstacleSprite('pigeon'), cx - 1, cy - 22, 1);
      alpha(0.55, () => disc(cx + 34, cy + 20, 12, '#3dfc9a'));
      ring(cx + 34, cy + 20, 13, 1, '#eafff5');
      drawHoop(cx + 34, cy + 20, 18, tt, 1);
      sprite(fallerHi(charId, 'back'), cx + fx, cy + 10 + fy, 1);
      thumb(cx - 44 + fx * 0.5, gy - 2 + fy * 0.5, PAL.cyan);
      text('←  →', cx - 44, gy - 22, { align: 'center', color: PAL.cyan, outline: INK });
    } else if (page === 3) {
      // pouce droit : un glissé = une figure ; on les enchaîne pour faire un combo
      drawGround(cx, cy, 0.3, stage, tt);
      const order = ['saltoAvant', 'vrilleDroite', 'saltoArriere', 'vrilleGauche'];
      const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      const n = Math.floor(tt / 1.1);
      const k = n % 4;
      const u = (tt % 1.1) / 1.1;
      const tu = clamp((u - 0.2) / 0.5, 0, 1);
      const cs = tu > 0 && tu < 1 ? Math.cos(tu * Math.PI * 2) : 1;
      const salto = k % 2 === 0;
      sprite(fallerHi(charId, cs < 0 ? 'front' : 'back'), cx, cy + 6, salto ? 1 : Math.max(0.2, Math.abs(cs)), salto ? Math.max(0.2, Math.abs(cs)) : 1);
      if (u > 0.2) fitText(t(TRICKS[order[k]].key), cx, cy + 28, { color: '#ffffff', outline: INK });
      // le combo qui monte
      const count = (n % 8) + 1;
      text('× ' + String(multFor(count)).replace('.', ','), 8, 28 + G.safeTop, { color: PAL.pink, scale: 2, outline: INK });
      text(count + ' ' + t(count > 1 ? 'chute.tricks' : 'chute.trickOne'), 8, 46 + G.safeTop, { color: '#ffffff', outline: INK });
      // le pouce glisse dans la direction de la figure
      const sw = clamp(u / 0.25, 0, 1) * 14;
      const tx = cx + 44;
      const ty = gy - 14;
      text('↑', tx, ty - 26, { align: 'center', color: k === 0 ? '#ffffff' : PAL.pink, outline: INK });
      text('↓', tx, ty + 20, { align: 'center', color: k === 2 ? '#ffffff' : PAL.pink, outline: INK });
      text('←', tx - 24, ty - 3, { align: 'center', color: k === 3 ? '#ffffff' : PAL.pink, outline: INK });
      text('→', tx + 24, ty - 3, { align: 'center', color: k === 1 ? '#ffffff' : PAL.pink, outline: INK });
      thumb(tx + dirs[k][0] * sw, ty + dirs[k][1] * sw, PAL.pink);
    } else {
      // l'anneau se referme : on tape dans le rose, juste avant l'impact
      const u = (tt % 2.6) / 2.6;
      const k = clamp(1 - u * 1.25, 0, 1);
      drawGround(cx, cy + 10, 1 / (1 + k * 2.5), stage, tt);
      rect(0, 0, W, H, 'rgba(12,5,30,0.4)');
      const done = k < 0.12;
      sprite(fallerHi(charId, done ? 'dos' : 'back'), cx, cy + 10, 1);
      alpha(0.5, () => ring(cx, cy + 10, 30, 10, Z_PERFECT));
      ringOut(cx, cy + 10, 20, 2, '#ffffff');
      if (!done) ringOut(cx, cy + 10, 21 + k * 58, 4, k < 0.18 ? Z_PERFECT : k < 0.5 ? '#ffd23f' : '#2de2e6');
      if (k < 0.18 && !done) tapNow(cx, gy - 10);
      if (done) fitText(t('chute.dosPerfect'), cx, gy - 4, { color: Z_PERFECT, outline: INK });
    }
    panel(6, py, W - 12, panelH, PAL.magenta);
    fitText(title, cx, py + 8, { color: PAL.yellow });
    paragraph(body, cx, py + 22, W - 28, { align: 'center', color: PAL.white });
    // en bas : flèche précédent, points de progression, flèche suivant
    const ar = tutoArrows();
    if (page > 0) drawButton(ar.prev, st.pausePressed === 'prev', false);
    drawButton(ar.next, st.pausePressed === 'next', false);
    const dy = ar.next.y + 11;
    for (let i = 0; i < TUTO_PAGES; i++) disc(cx - (TUTO_PAGES - 1) * 4 + i * 8, dy - 6, i === page ? 3 : 2, i === page ? '#ffd23f' : '#5a4f73');
    if (Math.floor(tt * 2.5) % 2 === 0) text(t(touch ? 'tuto.tap' : 'tuto.key'), cx, dy, { color: PAL.cyan, align: 'center' });
    // bandeau : on sait tout de suite qu'on est dans le tutoriel, et où on en est
    const head = t('tuto.title') + '  ' + (page + 1) + '/' + TUTO_PAGES;
    const hw = measure(head) + 12;
    rect(5, 4 + G.safeTop, hw + 2, 17, INK);
    rect(6, 5 + G.safeTop, hw, 15, '#ffd23f');
    rect(6, 5 + G.safeTop, hw, 1, '#fff6cf');
    text(head, 12, 9 + G.safeTop, { color: INK });
    drawButton(skipBtn(), st.pausePressed === 'skip', false);
  }

  return scene;
}
