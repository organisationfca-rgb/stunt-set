// Musiques originales, façon générique de film d'action des années 90 : tempo rapide, basse qui galope,
// accords de cuivres plaqués, grosse caisse claire, mélodie héroïque. Tout est joué par le code.
// Chaque morceau : tempo, tonalité, accords (r = demi-tons depuis la tonique, q = 'maj' ou 'min'),
// basse (16 pas par mesure), cuivres (pas où l'accord est plaqué), mélodie par mesure [pas, note, durée].

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const TRACKS = {
  // Menus : thème d'ouverture, entraînant et lumineux (ré majeur)
  menu: {
    bpm: 126, key: 50,
    chords: [{ r: 0, q: 'maj' }, { r: 0, q: 'maj' }, { r: 10, q: 'maj' }, { r: 5, q: 'maj' }, { r: 0, q: 'maj' }, { r: 0, q: 'maj' }, { r: 10, q: 'maj' }, { r: 7, q: 'maj' }],
    bass: [0, null, 0, 12, 0, null, 0, 12, 0, null, 0, 12, 0, 7, 12, 7],
    stabs: [0, 3, 6, 10, 14],
    lead: [
      [[0, 12, 2], [2, 12, 1], [3, 14, 1], [4, 16, 4], [8, 14, 2], [10, 12, 2], [12, 9, 2], [14, 12, 2]],
      [[0, 14, 6], [6, 12, 2], [8, 9, 4], [12, 7, 4]],
      [[0, 10, 2], [2, 10, 1], [3, 12, 1], [4, 14, 4], [8, 12, 2], [10, 10, 2], [12, 7, 2], [14, 10, 2]],
      [[0, 12, 6], [6, 9, 2], [8, 7, 4], [12, 5, 2], [14, 7, 2]],
      [[0, 12, 2], [2, 12, 1], [3, 14, 1], [4, 16, 4], [8, 14, 2], [10, 16, 2], [12, 19, 4]],
      [[0, 19, 3], [3, 16, 3], [6, 14, 2], [8, 12, 4], [12, 14, 2], [14, 16, 2]],
      [[0, 17, 4], [4, 14, 4], [8, 10, 2], [10, 12, 2], [12, 14, 4]],
      [[0, 14, 4], [4, 11, 4], [8, 9, 2], [10, 11, 2], [12, 14, 4]],
    ],
  },
  // La chute : rock d'action qui fonce (mi)
  chute: {
    bpm: 140, key: 52,
    chords: [{ r: 0, q: 'min' }, { r: 0, q: 'min' }, { r: 3, q: 'maj' }, { r: 5, q: 'maj' }, { r: 0, q: 'min' }, { r: 0, q: 'min' }, { r: 10, q: 'maj' }, { r: 7, q: 'maj' }],
    bass: [0, 0, 12, 0, 0, 12, 0, 0, 12, 0, 0, 12, 0, 12, 7, 12],
    stabs: [0, 6, 8, 14],
    lead: [
      [[0, 12, 2], [2, 15, 2], [4, 17, 2], [6, 19, 4], [10, 17, 2], [12, 15, 2], [14, 12, 2]],
      [[0, 19, 3], [3, 22, 3], [6, 24, 6], [12, 22, 2], [14, 19, 2]],
      [[0, 15, 4], [4, 19, 4], [8, 22, 4], [12, 19, 2], [14, 15, 2]],
      [[0, 17, 4], [4, 21, 4], [8, 24, 6], [14, 21, 2]],
      [[0, 24, 2], [2, 22, 2], [4, 19, 2], [6, 17, 2], [8, 19, 4], [12, 15, 2], [14, 12, 2]],
      [[0, 12, 2], [2, 15, 2], [4, 17, 2], [6, 19, 2], [8, 22, 2], [10, 24, 6]],
      [[0, 22, 4], [4, 26, 4], [8, 22, 2], [10, 17, 2], [12, 14, 4]],
      [[0, 19, 4], [4, 23, 4], [8, 26, 4], [12, 23, 2], [14, 19, 2]],
    ],
  },
};

// Joue un pas (une double croche) du morceau. a : { tone, noise, bus, delay } fournis par audio.js
export function scheduleStep(a, tr, step, t, intensity) {
  const sd = 60 / tr.bpm / 4;
  const bars = tr.chords.length;
  const bar = Math.floor(step / 16) % bars;
  const s = step % 16;
  const ch = tr.chords[bar];
  const root = tr.key + ch.r;
  const third = ch.q === 'maj' ? 4 : 3;
  const full = intensity > 0.5;
  const out = a.bus;

  // basse qui galope
  const b = tr.bass[s];
  if (b !== null) {
    a.tone(out, 'sawtooth', midi(root - 12 + b), t, sd * 0.95, 0.2, { cutoff: 1100, cutoffTo: 220, q: 3 });
    a.tone(out, 'square', midi(root - 24 + b), t, sd * 0.9, 0.1, { cutoff: 400 });
  }
  // cuivres : accords plaqués
  if (tr.stabs.includes(s)) {
    const long = s === 0;
    const dur = long ? sd * 3.2 : sd * 1.5;
    const vol = (full ? 0.055 : 0.03) * (long ? 1.15 : 1);
    [0, third, 7, 12].forEach((n, i) => {
      a.tone(out, 'sawtooth', midi(root + 12 + n), t, dur, vol, { cutoff: 3200, cutoffTo: 900, q: 1.5, detune: i % 2 ? 8 : -8, attack: 0.008 });
    });
  }
  // mélodie
  if (full) {
    for (const n of tr.lead[bar]) {
      if (n[0] !== s) continue;
      const f = midi(tr.key + 12 + n[1]);
      const dur = sd * n[2] * 0.95;
      a.tone(out, 'sawtooth', f, t, dur, 0.075, { cutoff: 3800, cutoffTo: 1800, q: 2, detune: -6, attack: 0.01, hold: true, release: 0.06, send: a.delay });
      a.tone(out, 'square', f, t, dur, 0.04, { cutoff: 2600, detune: 6, attack: 0.01, hold: true, release: 0.06 });
    }
  }
  // batterie
  if (s % 4 === 0 || (full && s === 10)) {
    a.tone(out, 'sine', 165, t, 0.17, 0.75, { to: 44 });
    a.noise(out, t, 0.015, 0.25, { type: 'highpass', freq: 3000 });
  }
  if (s === 4 || s === 12) {
    a.noise(out, t, 0.2, full ? 0.42 : 0.25, { freq: 2100, q: 0.6 });
    a.noise(out, t, 0.07, 0.25, { type: 'highpass', freq: 5000 });
    a.tone(out, 'triangle', 200, t, 0.1, 0.3, { to: 130 });
  }
  if (s % 2 === 0) a.noise(out, t, s % 4 === 2 ? 0.08 : 0.03, s % 4 === 2 ? 0.11 : 0.07, { type: 'highpass', freq: 8000 });
  else if (full) a.noise(out, t, 0.02, 0.035, { type: 'highpass', freq: 9000 });
  // cymbale au début de la boucle, roulement de toms à la fin
  if (full && step % (bars * 16) === 0) a.noise(out, t, 0.9, 0.16, { type: 'highpass', freq: 5500 });
  if (full && bar === bars - 1 && s >= 12) {
    const f0 = [230, 190, 155, 125][s - 12];
    a.tone(out, 'sine', f0, t, 0.16, 0.5, { to: f0 * 0.55 });
  }
}
