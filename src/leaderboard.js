// Classements. Deux modes derrière la même interface :
//  - démonstration (tant que CONFIG.leaderboard.url est vide) : joueurs fictifs + ton score, sur l'appareil ;
//  - en ligne : Google Sheet + Apps Script (voir le dossier server/).
import { CONFIG } from './config.js';
import { save, persist } from './save.js';
import { mulberry } from './gfx.js';

// ----- périodes (heure de Paris) -----
function parisParts(date = new Date()) {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
    const parts = {};
    fmt.formatToParts(date).forEach((p) => (parts[p.type] = p.value));
    return { y: +parts.year, m: +parts.month, d: +parts.day, wd: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday) };
  } catch (e) {
    return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate(), wd: (date.getDay() + 6) % 7 };
  }
}
// identifiant de la semaine = date du lundi
export function weekId() {
  const p = parisParts();
  const monday = new Date(Date.UTC(p.y, p.m - 1, p.d - p.wd));
  return monday.toISOString().slice(0, 10);
}
// identifiant de la saison = année du 1er septembre de départ
export function seasonId() {
  const p = parisParts();
  return String(p.m >= 9 ? p.y : p.y - 1);
}

// ----- meilleur score local par période -----
function localPeriodBest(game) {
  const pb = save.data.periodBest[game] || {};
  const w = pb.week && pb.week.id === weekId() ? pb.week.score : 0;
  const s = pb.season && pb.season.id === seasonId() ? pb.season.score : 0;
  return { week: w, season: s };
}
function updateLocalPeriodBest(game, score) {
  const cur = localPeriodBest(game);
  save.data.periodBest[game] = {
    week: { id: weekId(), score: Math.max(cur.week, score) },
    season: { id: seasonId(), score: Math.max(cur.season, score) },
  };
  persist();
}

// ----- classement de démonstration -----
const SYL = ['MAX', 'NEO', 'ZED', 'KAI', 'LEO', 'SAM', 'ROX', 'JAZ', 'TOM', 'LOU', 'ACE', 'SKY', 'RAY', 'MIA', 'ELI', 'NOA', 'IVY', 'KIM', 'BEN', 'ZOE'];
const TAIL = ['_STUNT', 'FLIP', '2000', '_X', 'DROP', '99', '_PRO', 'JUMP', '84', 'FALL', '_FX', 'CUT', '77', 'ROLL', '_ONE', 'DASH'];
function demoList(game, period) {
  const cfg = CONFIG.demoBoard[game] || { top: 10000, bottom: 100 };
  const id = period === 'week' ? weekId() : seasonId();
  let seed = 7;
  for (const ch of game + period + id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = mulberry(seed);
  const top = period === 'week' ? cfg.top * 0.6 : cfg.top;
  const list = [];
  for (let i = 0; i < CONFIG.demoBoard.players; i++) {
    const u = rnd();
    const score = Math.round(cfg.bottom * Math.pow(top / cfg.bottom, Math.pow(u, 1.8)) / 10) * 10;
    list.push({ pseudo: SYL[Math.floor(rnd() * SYL.length)] + TAIL[Math.floor(rnd() * TAIL.length)], score });
  }
  return list;
}
function demoPeriod(game, period) {
  const list = demoList(game, period);
  const mine = localPeriodBest(game)[period];
  const pseudo = save.data.pseudo;
  if (mine > 0 && pseudo) list.push({ pseudo, score: mine, me: true });
  list.sort((a, b) => b.score - a.score);
  const idx = list.findIndex((e) => e.me);
  return { top: list.slice(0, CONFIG.leaderboard.topSize), rank: idx >= 0 ? idx + 1 : 0, total: list.length, best: mine };
}

// ----- mode en ligne -----
// Sécurité : le jeu n'envoie des scores qu'à une application web Google Apps Script, en connexion chiffrée (https).
// Toute autre adresse dans les réglages est ignorée, et le jeu reste en classement de démonstration.
const SERVER = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(CONFIG.leaderboard.url) ? CONFIG.leaderboard.url : '';

async function request(params, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.leaderboard.timeoutMs);
  try {
    const url = SERVER + (params ? '?' + new URLSearchParams(params).toString() : '');
    const res = await fetch(url, body
      // « text/plain » évite une requête de contrôle supplémentaire du navigateur ; le script lit le JSON lui-même.
      ? { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctrl.signal, redirect: 'follow' }
      : { signal: ctrl.signal, redirect: 'follow' });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function flushPending() {
  if (!SERVER) return;
  const queue = save.data.pending.slice();
  for (const item of queue) {
    try {
      const res = await request(null, item);
      // envoyé (ou refusé définitivement par le serveur) : on le retire de la file
      if (res && (res.ok || res.final)) {
        save.data.pending = save.data.pending.filter((p) => p !== item && p.id !== item.id);
        persist();
      }
    } catch (e) {
      return; // pas de réseau : on réessaiera plus tard
    }
  }
}

export const board = {
  get isDemo() {
    return !SERVER;
  },
  // Envoie un score. meta : { duration (secondes), steps (nombre de sauts, de scènes...) }
  async submit(game, score, meta = {}) {
    updateLocalPeriodBest(game, score);
    if (this.isDemo || !save.data.pseudo || score <= 0) return { ok: true, demo: this.isDemo };
    const item = {
      a: 'score', id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      g: game, p: save.data.pseudo, s: Math.round(score), d: save.data.deviceId, v: CONFIG.version,
      t: Math.round(meta.duration || 0), n: meta.steps || 0,
    };
    save.data.pending.push(item);
    if (save.data.pending.length > 20) save.data.pending.shift();
    persist();
    await flushPending();
    return { ok: !save.data.pending.some((p) => p.id === item.id) };
  },
  // Charge le classement d'un mini-jeu. Renvoie { demo, offline, week, season, hall }.
  async fetch(game) {
    if (this.isDemo) {
      return { demo: true, week: demoPeriod(game, 'week'), season: demoPeriod(game, 'season'), hall: [] };
    }
    try {
      await flushPending();
      const res = await request({ a: 'top', g: game, p: save.data.pseudo || '', n: CONFIG.leaderboard.topSize });
      if (!res || !res.ok) throw new Error('bad');
      // On ne fait pas confiance à la réponse : chaque valeur est remise dans la forme attendue avant d'être affichée.
      const str = (v, max) => String(v === null || v === undefined ? '' : v).slice(0, max);
      const nb = (v) => (typeof v === 'number' && isFinite(v) && v > 0 ? Math.floor(v) : 0);
      const rows = (v) => (Array.isArray(v) ? v.slice(0, 50) : []);
      const shape = (p) => ({
        top: rows(p && p.top).filter(Array.isArray).map((r) => ({ pseudo: str(r[0], 16), score: nb(r[1]), me: r[0] === save.data.pseudo })),
        rank: nb(p && p.rank), total: nb(p && p.total), best: nb(p && p.best),
      });
      const hall = rows(res.hall).filter((h) => h && typeof h === 'object').map((h) => ({ season: str(h.season, 9), pseudo: str(h.pseudo, 16), score: nb(h.score) }));
      return { demo: false, week: shape(res.week), season: shape(res.season), hall };
    } catch (e) {
      const lb = localPeriodBest(game);
      const empty = (best) => ({ top: [], rank: 0, total: 0, best });
      return { demo: false, offline: true, week: empty(lb.week), season: empty(lb.season), hall: [] };
    }
  },
  flush: flushPending,
};
