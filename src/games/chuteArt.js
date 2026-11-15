// La chute — dessins : plateau de tournage vu du ciel, obstacles, effet « caméra embarquée ».
import { G, PAL, rect, frame, disc, ring, line, makeCanvas, withCtx, hash2, outlined } from '../gfx.js';
import { CONFIG } from '../config.js';

const C = CONFIG.chute;

// ---------- les décors : 4 stages, toujours avec un plateau de tournage autour des cartons ----------
// (cx, cy) : position à l'écran du centre de la cible ; s : agrandissement (1 = taille réelle)
const CARTON = ['#c9a36b', '#b98f58', '#d6b47c', '#c39a60'];
const CREW_COL = ['#ff71ce', '#ffd23f', '#2de2e6', '#ff8a3c', '#3dfc9a', '#ffffff', '#ff3b4e', '#b9a6ff'];
const DARK = '#1a1326';
// le matériel de tournage, toujours aux mêmes places (coordonnées du monde, la cible est en 0,0)
const SET_LIGHTS = [[-128, -96], [128, -92], [-124, 98], [126, 104]];
const SET_CAMS = [[-104, -8], [98, -42], [14, 112]];
const SET_CREW = [[-116, 6, 0], [110, -30, 1], [28, 122, 2], [-70, -112, 3], [72, 96, 4], [-150, 60, 5], [168, 20, 6], [-40, 124, 7], [176, -70, 1], [-170, -60, 2]];
const ROCKS = [[-210, -90, 26], [-160, 150, 16], [215, -60, 22], [250, 120, 30], [-260, 40, 18], [190, 170, 14], [-90, -130, 10]];

export function drawGround(cx, cy, s, stage = 'studio', time = 0) {
  const { W, H } = G;
  const c = G.ctx;
  const X = (x) => cx + x * s;
  const Y = (y) => cy + y * s;
  const wr = (x, y, w, h, col) => rect(X(x), Y(y), Math.max(1, w * s), Math.max(1, h * s), col);
  const wd = (x, y, r, col) => disc(X(x), Y(y), Math.max(0.6, r * s), col);
  const shadow = (x, y, w, h) => wr(x + 6, y + 7, w, h, 'rgba(10,6,24,0.3)'); // ombre portée, pour le relief
  // parcourt les grandes cases visibles à l'écran (pour ce qui entoure le plateau, vu de haut)
  const cells = (size, fn) => {
    const i0 = Math.floor(-cx / s / size) - 1;
    const i1 = Math.ceil((W - cx) / s / size) + 1;
    const j0 = Math.floor(-cy / s / size) - 1;
    const j1 = Math.ceil((H - cy) / s / size) + 1;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) fn(i, j, hash2(i, j), i * size - size / 2, j * size - size / 2);
  };
  // bande horizontale du monde (de y0 à y1), sur toute la largeur de l'écran
  const band = (y0, y1, col) => {
    const a = Math.max(0, Math.round(Y(y0)));
    const b = Math.min(H, Math.round(Y(y1)));
    if (b > a) rect(0, a, W, b - a, col);
  };

  if (stage === 'falaise') {
    // la mer, la plage, puis la falaise d'où l'on saute
    rect(0, 0, W, H, '#2f86bd');
    if (s > 0.08) cells(96, (i, j, h, x, y) => { if (y < -170) wr(x + h * 50 + Math.sin(time * 1.4 + h * 9) * 5, y + h * 60, 28, 3, '#86c9ec'); });
    band(-150, 215, '#e3c98f');
    band(-150, -134, '#cdb078');
    band(-158 + Math.sin(time * 1.6) * 3, -150, '#f4f8ff');
    if (s > 0.1) for (const r of ROCKS) { wd(r[0], r[1], r[2], '#5d534c'); wd(r[0] - r[2] * 0.25, r[1] - r[2] * 0.25, r[2] * 0.6, '#84776d'); }
    band(215, 300, '#7a6a58');
    band(215, 221, '#5d5044');
    band(300, 6000, '#4f9a52');
    if (s > 0.1) cells(70, (i, j, h, x, y) => { if (y > 300) wr(x + h * 40, y + h * 40, 12, 6, '#69b85c'); });
  } else if (stage === 'feu') {
    // la rue, de nuit, au pied de l'immeuble en feu
    rect(0, 0, W, H, '#2a2d3f');
    cells(200, (i, j, h, x, y) => {
      if (Math.abs(i) <= 1 && Math.abs(j) <= 1) return;
      wr(x + 14, y + 14, 172, 172, ['#3d4468', '#4b3f6e', '#35506a', '#553a5e'][Math.floor(h * 4)]);
      wr(x + 14, y + 14, 172, 8, 'rgba(255,255,255,0.08)');
      if (s > 0.1) for (let k = 0; k < 4; k++) wr(x + 34 + ((k * 53 + Math.floor(h * 90)) % 120), y + 40 + ((k * 71) % 110), 12, 12, ['#ffd56b', '#ff9a5c', '#5ad7ff', '#ff71ce'][(k + Math.floor(h * 9)) % 4]);
    });
    wr(-300, -300, 600, 600, '#4b4f63');
    wr(-300, -300, 600, 26, '#63677d');
    if (s > 0.14) for (let k = -5; k <= 5; k++) wr(k * 56 - 14, -206, 28, 5, '#d9d4e8');
    // l'immeuble en feu, en bas : son toit sombre et les flammes sur son bord
    wr(-230, 182, 460, 400, '#1f1a26');
    wr(-220, 194, 440, 380, '#2c2534');
    for (let k = 0; k < 16; k++) {
      const fx = -220 + k * 29;
      const r = 11 + Math.sin(time * 9 + k * 1.7) * 5;
      wd(fx, 186, r, '#ff5a1f');
      wd(fx + 2, 190, r * 0.55, '#ffc23c');
    }
    for (let k = 0; k < 6; k++) wd(-160 + k * 64 + Math.sin(time + k) * 10, 160 - ((time * 22 + k * 37) % 80), 15, 'rgba(40,36,48,0.4)');
    c.fillStyle = 'rgba(255,120,40,0.09)';
    c.fillRect(0, Math.max(0, Math.round(Y(40))), W, H);
    // camions de pompiers, avec leur échelle et leur gyrophare
    [[-270, -110], [176, 36]].forEach(([tx, ty], n) => {
      wr(tx, ty, 96, 36, '#c92a2a'); wr(tx, ty, 24, 36, '#e94a4a'); wr(tx + 28, ty + 15, 64, 6, '#cfd3e0');
      wr(tx + 6, ty + 14, 8, 8, Math.floor(time * 6 + n) % 2 ? '#5ad7ff' : '#ff3b4e');
    });
  } else if (stage === 'helico') {
    // la campagne vue du ciel, avec une aire d'atterrissage
    rect(0, 0, W, H, '#4f8a45');
    cells(200, (i, j, h, x, y) => {
      wr(x + 5, y + 5, 190, 190, ['#79b85c', '#8cc566', '#c7bf66', '#68a552', '#b3ab58'][Math.floor(h * 5)]);
      if (s > 0.16 && h > 0.5) for (let k = 0; k < 4; k++) wr(x + 20, y + 30 + k * 40, 150, 3, 'rgba(0,0,0,0.08)');
    });
    wr(-36, 190, 72, 4000, '#7d8092');
    wd(0, 0, 222, '#6f7286');
    wd(0, 0, 214, '#8a8ea2');
    ring(X(0), Y(0), 178 * s, Math.max(1, 5 * s), '#ffd23f');
  } else {
    // le studio : autour du plateau, d'autres plateaux aux toits colorés, des jardins, des parkings, un bassin
    rect(0, 0, W, H, '#4b4e66');
    cells(240, (i, j, h, x, y) => {
      if (Math.abs(i) <= 1 && Math.abs(j) <= 1) return;
      if (h < 0.48) {
        wr(x + 24, y + 26, 204, 204, 'rgba(10,6,24,0.25)');
        wr(x + 18, y + 18, 204, 204, ['#d2bd9c', '#8fbcb6', '#d89e8c', '#b9abd2'][Math.floor(h * 17) % 4]);
        wr(x + 18, y + 116, 204, 6, 'rgba(10,6,24,0.2)');
        if (s > 0.12) for (let k = 0; k < 4; k++) wr(x + 36 + k * 46, y + 52, 26, 12, 'rgba(255,255,255,0.45)');
      } else if (h < 0.7) {
        wr(x + 14, y + 14, 212, 212, '#62a55c');
        wr(x + 14, y + 112, 212, 14, '#dccda4');
        if (s > 0.1) for (let k = 0; k < 6; k++) wd(x + 40 + ((k * 67) % 170), y + 40 + ((k * 101) % 160), 15, k % 2 ? '#3f7f45' : '#4c9150');
      } else if (h < 0.88) {
        wr(x + 14, y + 14, 212, 212, '#6d7189');
        if (s > 0.12) for (let k = 0; k < 12; k++) wr(x + 30 + (k % 4) * 48, y + 34 + Math.floor(k / 4) * 62, 30, 16, ['#ff3b4e', '#ffd23f', '#f4f0fb', '#3a6cf4', '#22c58b'][(k * 3 + Math.floor(h * 40)) % 5]);
      } else {
        wr(x + 14, y + 14, 212, 212, '#d2bd9c');
        wr(x + 36, y + 36, 168, 168, '#3f9bd0');
        wr(x + 36, y + 36, 168, 8, '#8fd4f2');
      }
    });
    wr(-300, -300, 600, 600, '#6c7192');
    if (100 * s >= 7) for (let k = -2; k <= 2; k++) { rect(X(k * 100), Y(-300), 1, 600 * s, '#787d9d'); rect(X(-300), Y(k * 100), 600 * s, 1, '#787d9d'); }
    frame(Math.round(X(-300)), Math.round(Y(-300)), Math.round(600 * s), Math.round(600 * s), '#ffd23f');
  }
  // ----- le plateau de tournage : rails, projecteurs, caméras, régie, camions, équipe -----
  if (s > 0.1) {
    // rails de travelling et chariot caméra
    wr(-196, 138, 256, 3, '#2a2733'); wr(-196, 151, 256, 3, '#2a2733');
    if (s > 0.3) for (let k = 0; k < 15; k++) wr(-192 + k * 18, 136, 4, 20, '#4a4552');
    const dolly = -176 + (Math.sin(time * 0.6) * 0.5 + 0.5) * 190;
    shadow(dolly, 132, 32, 28);
    wr(dolly, 132, 32, 28, DARK); wr(dolly + 4, 136, 24, 20, '#3a3550'); wr(dolly + 10, 124, 12, 12, '#6b6f8a');
    // la régie : barnum rayé, chaises de réalisateur
    shadow(150, 36, 84, 70);
    wr(150, 36, 84, 70, '#f0ecf7');
    for (let k = 0; k < 6; k++) wr(150 + k * 14, 36, 7, 70, '#ff5fae');
    wr(150, 36, 84, 3, DARK); wr(150, 103, 84, 3, DARK);
    if (s > 0.25) [[128, 60], [128, 82]].forEach(([x, y]) => { wr(x, y, 12, 12, DARK); wr(x + 2, y + 2, 8, 8, '#ffd23f'); });
    // camions de production
    shadow(-276, -112, 110, 42);
    shadow(166, -124, 110, 42);
    wr(-276, -112, 110, 42, '#f0ecf7'); wr(-276, -112, 26, 42, '#ff2e97'); wr(-244, -104, 70, 4, '#cfc8dd');
    wr(166, -124, 110, 42, '#f0ecf7'); wr(250, -124, 26, 42, '#2de2e6'); wr(176, -116, 64, 4, '#cfc8dd');
  }
  if (s > 0.16) {
    // projecteurs : leur faisceau éclaire les cartons
    for (const l of SET_LIGHTS) {
      const lx = X(l[0]);
      const ly = Y(l[1]);
      const L = Math.hypot(l[0], l[1]);
      const nx = (-l[1] / L) * 40 * s;
      const ny = (l[0] / L) * 40 * s;
      c.fillStyle = 'rgba(255,246,190,0.12)';
      c.beginPath();
      c.moveTo(lx, ly); c.lineTo(X(0) + nx, Y(0) + ny); c.lineTo(X(0) - nx, Y(0) - ny);
      c.fill();
    }
    for (const l of SET_LIGHTS) { wd(l[0], l[1], 8, DARK); wr(l[0] - 7, l[1] - 5, 14, 10, '#3a3550'); wr(l[0] - 5, l[1] - 3, 10, 6, '#fff6cf'); }
    // caméras sur pied, tournées vers les cartons
    for (const k of SET_CAMS) {
      const L = Math.hypot(k[0], k[1]);
      const ux = -k[0] / L;
      const uy = -k[1] / L;
      wd(k[0], k[1], 9, 'rgba(26,19,38,0.55)');
      wr(k[0] - 7, k[1] - 6, 14, 12, DARK);
      wr(k[0] - 5, k[1] - 4, 10, 8, '#4a4660');
      wr(k[0] + ux * 9 - 3, k[1] + uy * 9 - 3, 6, 6, '#8a8ea2');
      if (Math.floor(time * 2) % 2) wr(k[0] - 4, k[1] - 3, 3, 3, '#ff3b4e');
    }
  }
  if (s > 0.28) {
    // l'équipe, vue du dessus : épaules et tête
    for (const p of SET_CREW) { wd(p[0] + 2, p[1] + 4, 5, 'rgba(10,6,24,0.3)'); wr(p[0] - 5, p[1] - 3, 10, 7, DARK); wr(p[0] - 4, p[1] - 2, 8, 5, CREW_COL[p[2]]); wd(p[0], p[1], 3, '#2a1c18'); }
    // cônes de sécurité autour de la zone de chute
    for (let a = 0; a < 8; a++) wd(Math.cos(a * 0.785 + 0.39) * 84, Math.sin(a * 0.785 + 0.39) * 84, 3, '#ff8a3c');
  }

  // ----- la zone de chute : tapis, pile de cartons, cible peinte -----
  shadow(-56, -54, 124, 124);
  wr(-60, -60, 120, 120, DARK);
  wr(-58, -58, 116, 116, '#2a4cc0');
  wr(-54, -54, 108, 108, '#3a6cf4');
  const T = 23;
  for (let i = -2; i < 2; i++) {
    for (let j = -2; j < 2; j++) {
      const x = cx + i * T * s;
      const y = cy + j * T * s;
      const w = Math.max(1, T * s);
      rect(x, y, w, w, '#7d5c33');
      const inset = w >= 6 ? 1 : 0;
      rect(x + inset, y + inset, w - inset, w - inset, CARTON[Math.floor(hash2(i + 9, j + 4) * CARTON.length)]);
      if (w >= 10) rect(x + w / 2, y + inset, 1, w - inset, '#a37c48'); // ruban adhésif
    }
  }
  const t = C.target;
  ring(cx, cy, t.edge * s, Math.max(1, 4 * s), PAL.orange);
  ring(cx, cy, t.good * s, Math.max(1, 3 * s), PAL.cyan);
  disc(cx, cy, Math.max(1, t.perfect * s), PAL.magenta);
  if (t.perfect * s > 3) disc(cx, cy, Math.max(1, 3 * s), PAL.yellow);
}

// Le bord d'où saute le cascadeur, en bas de l'écran pendant la visée (différent selon le stage)
export function drawPlatform(stage, py, time) {
  const { W, H } = G;
  const c = G.ctx;
  if (stage === 'falaise') {
    rect(0, py, W, H - py, '#6b5c4c');
    for (let x = 3; x < W; x += 17) rect(x, py + 7 + ((x * 7) % 9), 6, 1, '#55483b');
    rect(0, py, W, 3, '#4f9a52');
    for (let x = 2; x < W; x += 7) rect(x, py - 2 - ((x * 5) % 2), 2, 3, '#69b85c');
  } else if (stage === 'feu') {
    rect(0, py, W, H - py, '#1f1a26');
    rect(0, py, W, 2, '#4a3f55');
    for (let x = 0; x < W; x += 8) {
      const h = 3 + Math.abs(Math.sin(time * 10 + x * 0.7)) * 5;
      rect(x, py - h, 5, h, '#ff5a1f');
      rect(x + 1, py - h * 0.5, 3, h * 0.5, '#ffc23c');
    }
  } else if (stage === 'helico') {
    rect(0, py, W, H - py, '#2a2f3d');
    rect(0, py, W, 2, '#8d90a0');
    rect(8, py + 11, W - 16, 4, '#c9cede');
    rect(8, py + 15, W - 16, 1, '#6a6f80');
    rect(22, py + 2, 3, 10, '#8d90a0'); rect(W - 25, py + 2, 3, 10, '#8d90a0');
  } else {
    rect(0, py, W, H - py, '#17131f');
    c.fillStyle = PAL.yellow;
    for (let x = -8; x < W; x += 12) {
      c.beginPath();
      c.moveTo(x, py + 4); c.lineTo(x + 6, py + 4); c.lineTo(x + 10, py); c.lineTo(x + 4, py);
      c.fill();
    }
  }
}

// ---------- obstacles vus du dessus ----------
// boxes : zones de collision [dx, dy, demi-largeur, demi-hauteur] ; les sprites regardent vers la droite.
export const OBSTACLES = {
  insect: { size: [9, 9], boxes: [[0, 0, 3, 3]], speed: [10, 30], draw() { rect(3, 4, 3, 2, '#1a1326'); rect(2, 2, 2, 2, '#bfe9ff'); rect(5, 2, 2, 2, '#bfe9ff'); rect(2, 6, 2, 1, '#bfe9ff'); rect(6, 4, 1, 1, '#ffd23f'); } },
  leaf: { size: [11, 9], boxes: [[0, 0, 4, 3]], speed: [8, 25], draw() { disc(5, 4, 3, '#3dbb5a'); rect(1, 4, 9, 1, '#2a8a40'); rect(8, 3, 2, 3, '#8ad64a'); rect(0, 4, 2, 1, '#6b4a1e'); } },
  balloon: { size: [13, 13], boxes: [[0, 0, 5, 5]], speed: [0, 8], draw() { disc(6, 6, 5, '#ff3b4e'); disc(4, 4, 1.5, '#ff9aa5'); rect(6, 6, 1, 1, '#96202d'); } },
  pigeon: { size: [12, 15], boxes: [[0, 0, 4, 6]], speed: [25, 45], draw() { rect(5, 1, 3, 13, '#8f93a8'); rect(4, 3, 5, 9, '#a9adc2'); rect(3, 6, 8, 3, '#70748a'); rect(10, 7, 2, 1, '#ff8a3c'); rect(0, 7, 3, 1, '#5d6176'); rect(5, 0, 3, 2, '#5d6176'); rect(5, 13, 3, 2, '#5d6176'); } },
  seagull: { size: [13, 21], boxes: [[0, 0, 4, 9]], speed: [30, 55], draw() { rect(5, 2, 3, 17, '#f4f4fa'); rect(6, 0, 2, 3, '#1a1326'); rect(6, 18, 2, 3, '#1a1326'); rect(3, 8, 8, 5, '#ffffff'); rect(11, 10, 2, 1, '#ffd23f'); rect(0, 10, 3, 1, '#cfd2e0'); } },
  raptor: { size: [16, 27], boxes: [[0, 0, 5, 12]], speed: [35, 60], draw() { rect(6, 1, 5, 25, '#6b4226'); rect(5, 4, 6, 19, '#8a5a34'); rect(7, 0, 3, 3, '#3d2514'); rect(7, 24, 3, 3, '#3d2514'); rect(3, 10, 11, 7, '#7a4c2c'); rect(13, 12, 3, 2, '#ffd23f'); rect(0, 12, 4, 3, '#4d2e19'); } },
  paraglider: { size: [16, 33], boxes: [[0, 0, 5, 15]], speed: [12, 25], draw() { rect(6, 0, 7, 33, '#ff2e97'); rect(6, 0, 7, 6, '#ffd23f'); rect(6, 27, 7, 6, '#ffd23f'); rect(6, 13, 7, 7, '#2de2e6'); rect(12, 1, 1, 31, '#c61f9a'); rect(2, 15, 3, 3, '#1a1326'); rect(4, 8, 2, 1, '#9d8fc0'); rect(4, 24, 2, 1, '#9d8fc0'); } },
  helicopter: { size: [34, 26], boxes: [[2, 0, 11, 11]], speed: [15, 30], rotor: true, draw() { rect(0, 12, 14, 2, '#6b5a99'); rect(0, 9, 2, 8, '#ff3b4e'); rect(12, 8, 16, 10, '#ffd23f'); rect(26, 9, 5, 8, '#2de2e6'); rect(14, 10, 10, 6, '#e0b020'); } },
  plane: { size: [31, 33], boxes: [[0, 0, 14, 3], [3, 0, 4, 15]], speed: [70, 110], draw() { rect(1, 14, 28, 5, '#f4f4fa'); rect(28, 15, 3, 3, '#3a6cf4'); rect(14, 1, 8, 31, '#d9d4e8'); rect(16, 1, 2, 31, '#ff3b4e'); rect(0, 10, 4, 13, '#d9d4e8'); rect(24, 15, 4, 3, '#1a1326'); } },
  airliner: { size: [68, 64], boxes: [[0, 0, 32, 5], [4, 0, 7, 30]], speed: [40, 60], draw() { rect(2, 27, 62, 10, '#f4f4fa'); rect(62, 29, 5, 6, '#d9d4e8'); rect(30, 2, 14, 60, '#d9d4e8'); rect(36, 2, 3, 60, '#3a6cf4'); rect(0, 20, 8, 24, '#d9d4e8'); rect(0, 30, 6, 4, '#ff2e97'); rect(32, 12, 8, 6, '#9d8fc0'); rect(32, 46, 8, 6, '#9d8fc0'); for (let x = 12; x < 58; x += 4) rect(x, 31, 2, 1, '#3a6cf4'); } },
  rocket: { size: [15, 15], boxes: [[0, 0, 6, 6]], speed: [0, 5], draw() { disc(7, 7, 6, '#f4f4fa'); disc(7, 7, 3, '#ff3b4e'); rect(0, 6, 3, 3, '#ff3b4e'); rect(12, 6, 3, 3, '#ff3b4e'); rect(6, 0, 3, 3, '#ff3b4e'); rect(6, 12, 3, 3, '#ff3b4e'); disc(7, 7, 1, '#ffd23f'); } },
  ufo: { size: [29, 29], boxes: [[0, 0, 13, 13]], speed: [20, 40], draw() { disc(14, 14, 14, '#9d8fc0'); disc(14, 14, 11, '#6b5a99'); disc(14, 14, 6, '#3dfc9a'); disc(12, 12, 2, '#c8ffe4'); for (let a = 0; a < 8; a++) disc(14 + Math.cos(a * 0.785) * 12, 14 + Math.sin(a * 0.785) * 12, 1, a % 2 ? '#ffd23f' : '#ff2e97'); } },
  cloud: { size: [48, 24], boxes: [], speed: [4, 10], draw() { disc(13, 15, 8, '#ffc9e0'); disc(26, 13, 10, '#ffc9e0'); disc(37, 16, 7, '#ffc9e0'); rect(8, 17, 33, 6, '#ffc9e0'); disc(13, 13, 8, '#fff4f9'); disc(26, 10, 10, '#ffffff'); disc(37, 14, 7, '#fff4f9'); rect(9, 14, 31, 5, '#ffffff'); disc(22, 7, 4, '#ffffff'); } },
};

const obsCache = new Map();
export function obstacleSprite(type) {
  if (obsCache.has(type)) return obsCache.get(type);
  const def = OBSTACLES[type];
  const [c, ctx] = makeCanvas(def.size[0], def.size[1]);
  withCtx(ctx, def.draw);
  const out = type === 'cloud' ? c : outlined(c);
  obsCache.set(type, out);
  return out;
}

// Quel obstacle à quelle altitude (en mètres) ?
export function pickObstacle(alt, rnd) {
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  if (alt >= C.obstacles.easterEggAltitude && rnd() < C.obstacles.easterEggChance) return pick(['rocket', 'ufo']);
  if (alt < 12) return pick(['insect', 'leaf', 'balloon', 'insect']);
  if (alt < 45) return pick(['pigeon', 'seagull', 'balloon', 'pigeon']);
  if (alt < 200) return pick(['raptor', 'paraglider', 'seagull']);
  if (alt < 600) return pick(['helicopter', 'plane', 'paraglider']);
  return pick(['airliner', 'plane', 'helicopter']);
}

// ---------- cerceau de feu ----------
export function drawHoop(x, y, r, t, a = 1) {
  const c = G.ctx;
  const prev = c.globalAlpha;
  c.globalAlpha = prev * a;
  const th = Math.max(1, r * 0.16);
  ring(x, y, r + th * 0.5, th, '#ff3b4e');
  ring(x, y, r, Math.max(1, th * 0.6), '#ff8a3c');
  // flammes qui dansent
  const n = r > 10 ? 12 : 8;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + t * 2;
    const fl = r + th + (Math.sin(t * 14 + i * 2.1) + 1) * Math.max(1, r * 0.09);
    disc(x + Math.cos(ang) * fl, y + Math.sin(ang) * fl, Math.max(0.6, r * 0.07), i % 2 ? '#ffd23f' : '#ff8a3c');
  }
  c.globalAlpha = prev;
}

// ---------- effet « caméra embarquée » (fisheye + coins sombres) ----------
let buf = null;
let bufCtx = null;
let lut = null;
let shade = null;
let lutKey = '';

export function fisheyeBuffer() {
  if (!buf || buf.width !== G.W || buf.height !== G.H) {
    buf = document.createElement('canvas');
    buf.width = G.W;
    buf.height = G.H;
    bufCtx = buf.getContext('2d', { willReadFrequently: true });
    bufCtx.imageSmoothingEnabled = false;
    lutKey = '';
  }
  return bufCtx;
}

function buildLut(k, cx, cy) {
  const { W, H } = G;
  const key = `${W}x${H}:${k.toFixed(2)}:${cx}:${cy}`;
  if (key === lutKey) return;
  lutKey = key;
  if (!lut || lut.length !== W * H) {
    lut = new Int32Array(W * H);
    shade = new Uint8Array(W * H);
  }
  const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy) / R;
      const f = (1 + k * r * r) / (1 + k);
      let sx = Math.round(cx + dx * f);
      let sy = Math.round(cy + dy * f);
      if (sx < 0) sx = 0; else if (sx >= W) sx = W - 1;
      if (sy < 0) sy = 0; else if (sy >= H) sy = H - 1;
      lut[y * W + x] = (sy * W + sx) * 4;
      shade[y * W + x] = Math.round(255 * (1 - 0.6 * k * r * r * r));
    }
  }
}

// Recopie le tampon vers l'écran en le déformant. k = force de l'effet (0 = aucun).
export function fisheyeBlit(k, cx, cy) {
  const { W, H } = G;
  if (k <= 0.01) {
    G.main.drawImage(buf, 0, 0);
    return;
  }
  buildLut(Math.round(k * 50) / 50, Math.round(cx), Math.round(cy));
  const src = bufCtx.getImageData(0, 0, W, H);
  const out = G.main.createImageData(W, H);
  const s = src.data;
  const o = out.data;
  const n = W * H;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const p = lut[i];
    const sh = shade[i];
    o[j] = (s[p] * sh) >> 8;
    o[j + 1] = (s[p + 1] * sh) >> 8;
    o[j + 2] = (s[p + 2] * sh) >> 8;
    o[j + 3] = 255;
  }
  G.main.putImageData(out, 0, 0);
}

// Où un point du tampon apparaît-il à l'écran après déformation ? (pour placer les repères par-dessus)
export function fisheyePoint(x, y, k, cx, cy) {
  const { W, H } = G;
  const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  // on inverse r' = r (1 + k r²) / (1 + k) par quelques itérations
  const dx = x - cx;
  const dy = y - cy;
  const rs = Math.hypot(dx, dy) / R;
  if (rs < 1e-4) return [x, y];
  let r = rs;
  for (let i = 0; i < 6; i++) r = (rs * (1 + k)) / (1 + k * r * r);
  return [cx + (dx / rs) * r, cy + (dy / rs) * r];
}

export { line };
