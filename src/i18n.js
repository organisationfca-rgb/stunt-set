// Langues : tous les textes sont dans src/i18n/fr.json et en.json.
import { save } from './save.js';

const dict = { fr: {}, en: {} };
let lang = 'fr';

export async function loadLanguages() {
  const load = async (code) => {
    try {
      const res = await fetch(`src/i18n/${code}.json`);
      dict[code] = await res.json();
    } catch (e) {
      dict[code] = {};
    }
  };
  await Promise.all([load('fr'), load('en')]);
}

export function detectLanguage() {
  const nav = (navigator.language || 'fr').toLowerCase();
  return nav.startsWith('fr') ? 'fr' : 'en';
}

export function setLanguage(code) {
  lang = code === 'en' ? 'en' : 'fr';
  document.documentElement.lang = lang;
  save.set('lang', lang);
}

export function initLanguage() {
  lang = save.data.lang || detectLanguage();
  document.documentElement.lang = lang;
}

export function getLanguage() {
  return lang;
}

// t('cle', { n: 3 }) : remplace {n} dans le texte.
export function t(key, vars) {
  let s = dict[lang][key];
  if (s === undefined) s = dict.fr[key];
  if (s === undefined) return key;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

// Nombre avec séparateur de milliers selon la langue.
export function num(n) {
  const s = String(Math.round(n));
  const sep = lang === 'fr' ? ' ' : ',';
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}
