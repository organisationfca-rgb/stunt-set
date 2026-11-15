// Sauvegarde sur l'appareil (stockage du navigateur). Si le stockage est indisponible, on garde tout en mémoire.
const KEY = 'stuntset.v1';

const DEFAULTS = {
  lang: null, // 'fr' | 'en' | null (pas encore choisi)
  character: null, // identifiant du personnage
  pseudo: '',
  deviceId: '',
  music: true,
  sfx: true,
  vibration: true,
  onboarded: false,
  tutorials: {}, // { chute: true } = tutoriel déjà vu
  best: {}, // { chute: 1234 }
  periodBest: {}, // { chute: { week: { id, score }, season: { id, score } } }
  pending: [], // scores en attente d'envoi au classement
};

let data = { ...DEFAULTS };
let storageOk = true;

function randomId() {
  const a = new Uint8Array(12);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
  else for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Contrôle de la sauvegarde relue sur l'appareil : chaque valeur doit avoir la forme attendue.
// Une sauvegarde abîmée ou modifiée à la main ne doit ni bloquer le jeu, ni partir telle quelle au classement.
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isScore = (v) => typeof v === 'number' && isFinite(v) && v >= 0;
const isName = (v) => typeof v === 'string' && /^[a-z]{1,20}$/.test(v); // identifiant d'un mini-jeu ou d'un personnage
const isBool = (v) => typeof v === 'boolean';

function sanitize(p) {
  const d = { ...DEFAULTS, tutorials: {}, best: {}, periodBest: {}, pending: [] };
  if (!isObj(p)) return d;
  if (p.lang === 'fr' || p.lang === 'en') d.lang = p.lang;
  if (isName(p.character)) d.character = p.character;
  if (typeof p.pseudo === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{2,15}$/.test(p.pseudo)) d.pseudo = p.pseudo;
  if (typeof p.deviceId === 'string' && /^[a-f0-9]{16,40}$/.test(p.deviceId)) d.deviceId = p.deviceId;
  for (const k of ['music', 'sfx', 'vibration', 'onboarded']) if (isBool(p[k])) d[k] = p[k];
  if (isObj(p.tutorials)) for (const k of Object.keys(p.tutorials)) if (isName(k)) d.tutorials[k] = !!p.tutorials[k];
  if (isObj(p.best)) for (const k of Object.keys(p.best)) if (isName(k) && isScore(p.best[k])) d.best[k] = p.best[k];
  if (isObj(p.periodBest)) {
    for (const k of Object.keys(p.periodBest)) {
      const pb = p.periodBest[k];
      if (!isName(k) || !isObj(pb)) continue;
      const one = (x) => (isObj(x) && typeof x.id === 'string' && x.id.length <= 12 && isScore(x.score) ? { id: x.id, score: x.score } : null);
      d.periodBest[k] = { week: one(pb.week), season: one(pb.season) };
    }
  }
  if (Array.isArray(p.pending)) {
    d.pending = p.pending
      .filter((it) => isObj(it) && it.a === 'score' && typeof it.id === 'string' && it.id.length <= 24 && isName(it.g) && isScore(it.s))
      .slice(-20);
  }
  return d;
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) data = sanitize(JSON.parse(raw));
  } catch (e) {
    storageOk = false;
  }
  if (!data.deviceId) {
    data.deviceId = randomId();
    persist();
  }
  return data;
}

export function persist() {
  if (!storageOk) return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    storageOk = false;
    return false;
  }
}

export const save = {
  get data() {
    return data;
  },
  get storageOk() {
    return storageOk;
  },
  set(key, value) {
    data[key] = value;
    persist();
  },
  // Enregistre un score ; renvoie true si c'est un nouveau record personnel.
  recordScore(game, score) {
    const prev = data.best[game] || 0;
    const isBest = score > prev;
    if (isBest) data.best[game] = score;
    persist();
    return isBest;
  },
};
