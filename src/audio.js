// Son : musique synthwave et bruitages, entièrement fabriqués par le code (Web Audio API).
// Aucune musique ni aucun son existant n'est utilisé.
import { save } from './save.js';
import { vibrate } from './input.js';
import { TRACKS, scheduleStep } from './music.js';

let ac = null;
let master, musicBus, sfxBus, delay, noiseBuf;
let musicOn = true;
let sfxOn = true;

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const MINOR = [0, 2, 3, 5, 7, 8, 10];
// note de la gamme mineure : degré (peut dépasser 7) → demi-tons
const deg = (d) => MINOR[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);

function ensure() {
  if (ac) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try {
    ac = new AC();
  } catch (e) {
    return false;
  }
  master = ac.createGain();
  master.gain.value = 0.9;
  const comp = ac.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(ac.destination);
  musicBus = ac.createGain();
  musicBus.gain.value = musicOn ? 0.5 : 0;
  musicBus.connect(master);
  sfxBus = ac.createGain();
  sfxBus.gain.value = sfxOn ? 0.8 : 0;
  sfxBus.connect(master);
  // petit écho pour la musique
  delay = ac.createDelay(1);
  delay.delayTime.value = 0.21;
  const fb = ac.createGain();
  fb.gain.value = 0.18;
  const wet = ac.createGain();
  wet.gain.value = 0.12;
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(musicBus);
  // bruit blanc réutilisable
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

// ---------- briques de base ----------
function tone(dest, type, freq, t, dur, vol, opts = {}) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t + dur);
  if (opts.detune) o.detune.value = opts.detune;
  const g = ac.createGain();
  const a = opts.attack || 0.004;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  if (opts.hold) g.gain.setValueAtTime(vol, t + Math.max(a, dur - (opts.release || 0.05)));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (opts.cutoff) {
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(opts.cutoff, t);
    if (opts.cutoffTo) f.frequency.exponentialRampToValueAtTime(opts.cutoffTo, t + dur);
    f.Q.value = opts.q || 1;
    o.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(dest);
  if (opts.send) g.connect(opts.send);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dest, t, dur, vol, opts = {}) {
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = ac.createBiquadFilter();
  f.type = opts.type || 'bandpass';
  f.frequency.setValueAtTime(opts.freq || 2000, t);
  if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(opts.freqTo, t + dur);
  f.Q.value = opts.q || 0.8;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + (opts.attack || 0.003));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(dest);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

// ---------- bruitages ----------
const SFX = {
  click(t) { tone(sfxBus, 'square', 880, t, 0.05, 0.12); tone(sfxBus, 'square', 1320, t + 0.03, 0.05, 0.1); },
  back(t) { tone(sfxBus, 'square', 660, t, 0.05, 0.12); tone(sfxBus, 'square', 440, t + 0.03, 0.06, 0.1); },
  clap(t) {
    // clap de cinéma : deux claquements secs de bois
    noise(sfxBus, t, 0.05, 0.9, { freq: 1800, q: 1.2 });
    tone(sfxBus, 'square', 420, t, 0.04, 0.3, { to: 180 });
    noise(sfxBus, t + 0.012, 0.09, 0.5, { freq: 3200, q: 0.7 });
  },
  lock(t) { tone(sfxBus, 'square', 1200, t, 0.06, 0.18); tone(sfxBus, 'triangle', 600, t, 0.1, 0.2); },
  whoosh(t) { noise(sfxBus, t, 0.55, 0.5, { freq: 300, freqTo: 2600, q: 0.6 }); },
  trick(t, o) {
    const base = 520 + (o.step || 0) * 28;
    tone(sfxBus, 'square', base, t, 0.09, 0.14, { to: base * 1.5 });
    noise(sfxBus, t, 0.12, 0.12, { freq: 1500, freqTo: 4000 });
  },
  combo(t, o) {
    const n = 3 + Math.min(4, Math.floor(o.mult || 1));
    for (let i = 0; i < n; i++) tone(sfxBus, 'square', midi(72 + deg(i * 2)), t + i * 0.055, 0.12, 0.13);
  },
  hit(t) {
    noise(sfxBus, t, 0.22, 0.8, { type: 'lowpass', freq: 900, freqTo: 120 });
    tone(sfxBus, 'sawtooth', 160, t, 0.25, 0.4, { to: 45 });
  },
  hoop(t) {
    [76, 80, 83, 88].forEach((m, i) => tone(sfxBus, 'square', midi(m), t + i * 0.04, 0.22, 0.12));
    noise(sfxBus, t, 0.35, 0.25, { freq: 5000, freqTo: 1200 });
  },
  burn(t) {
    noise(sfxBus, t, 0.5, 0.6, { freq: 2600, freqTo: 500, q: 0.5 });
    tone(sfxBus, 'sawtooth', 220, t, 0.3, 0.2, { to: 70 });
  },
  land(t) {
    // chute dans les cartons : coup sourd + froissement
    tone(sfxBus, 'sine', 140, t, 0.3, 0.9, { to: 38 });
    noise(sfxBus, t, 0.45, 0.7, { type: 'lowpass', freq: 2400, freqTo: 300 });
    noise(sfxBus, t + 0.08, 0.3, 0.3, { freq: 1200, q: 2 });
  },
  perfect(t) {
    [72, 76, 79, 84, 88].forEach((m, i) => tone(sfxBus, 'square', midi(m), t + i * 0.07, 0.25, 0.14));
    tone(sfxBus, 'triangle', midi(96), t + 0.35, 0.5, 0.12);
  },
  good(t) { [72, 76, 79].forEach((m, i) => tone(sfxBus, 'square', midi(m), t + i * 0.08, 0.2, 0.13)); },
  fail(t) {
    [64, 61, 57, 52].forEach((m, i) => tone(sfxBus, 'sawtooth', midi(m), t + i * 0.16, 0.3, 0.16, { cutoff: 1400 }));
    noise(sfxBus, t, 0.5, 0.6, { type: 'lowpass', freq: 700, freqTo: 90 });
  },
  warn(t) { tone(sfxBus, 'square', 1480, t, 0.07, 0.13); },
  tick(t) { tone(sfxBus, 'square', 1900, t, 0.03, 0.1); tone(sfxBus, 'triangle', 950, t, 0.04, 0.12); },
  dos(t) { tone(sfxBus, 'triangle', 500, t, 0.14, 0.3, { to: 250 }); noise(sfxBus, t, 0.1, 0.2, { freq: 900 }); },
  best(t) {
    [72, 79, 76, 84, 79, 88].forEach((m, i) => tone(sfxBus, 'square', midi(m), t + i * 0.09, 0.2, 0.13));
  },
};

// ---------- vent (boucle pendant la chute) ----------
let windNode = null;
function setWind(level) {
  if (!ac) return;
  if (!windNode) {
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.5;
    const g = ac.createGain();
    g.gain.value = 0;
    s.connect(f);
    f.connect(g);
    g.connect(sfxBus);
    s.start();
    windNode = { f, g };
  }
  const now = ac.currentTime;
  windNode.g.gain.setTargetAtTime(level * 0.28, now, 0.15);
  windNode.f.frequency.setTargetAtTime(350 + level * 900, now, 0.15);
}

// ---------- musique : petit séquenceur (les morceaux sont dans music.js) ----------
const seq = { track: null, name: '', step: 0, nextTime: 0, timer: null, intensity: 1 };

function tick() {
  if (!ac || !seq.track) return;
  const stepDur = 60 / seq.track.bpm / 4;
  if (seq.nextTime < ac.currentTime - 0.3) seq.nextTime = ac.currentTime + 0.05; // rattrapage après une pause
  while (seq.nextTime < ac.currentTime + 0.14) {
    if (musicOn) scheduleStep({ tone, noise, bus: musicBus, delay }, seq.track, seq.step, seq.nextTime, seq.intensity);
    seq.step++;
    seq.nextTime += stepDur;
  }
}

// ---------- interface publique ----------
export const audio = {
  // À appeler au premier toucher : sur iPhone, le son reste bloqué tant que le joueur n'a pas touché l'écran.
  unlock() {
    if (!ensure()) return;
    if (ac.state === 'suspended') ac.resume();
  },
  applySettings() {
    musicOn = !!save.data.music;
    sfxOn = !!save.data.sfx;
    if (!ac) return;
    musicBus.gain.setTargetAtTime(musicOn ? 0.5 : 0, ac.currentTime, 0.05);
    sfxBus.gain.setTargetAtTime(sfxOn ? 0.8 : 0, ac.currentTime, 0.05);
  },
  sfx(name, opts = {}) {
    if (!ac || !sfxOn || ac.state !== 'running') return;
    const fn = SFX[name];
    if (fn) fn(ac.currentTime + 0.005, opts);
  },
  music(name) {
    if (seq.name === name) return;
    seq.name = name;
    seq.track = TRACKS[name] || null;
    seq.step = 0;
    if (ac) seq.nextTime = ac.currentTime + 0.08;
    if (!seq.timer) seq.timer = setInterval(tick, 30);
  },
  intensity(v) {
    seq.intensity = v;
  },
  wind(level) {
    if (!ac || ac.state !== 'running') return;
    setWind(sfxOn ? level : 0);
  },
  // Mise en veille quand le jeu passe en arrière-plan
  suspend() {
    if (ac && ac.state === 'running') ac.suspend();
  },
  resume() {
    if (ac && ac.state === 'suspended') ac.resume();
  },
  buzz(pattern) {
    if (save.data.vibration) vibrate(pattern);
  },
};
