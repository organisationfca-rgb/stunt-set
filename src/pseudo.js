// Règles du pseudo : 3 à 16 caractères, lettres sans accent, chiffres, tiret et tiret bas.
// Filtre des pseudos insultants (français et anglais). Le serveur applique le même filtre.
import { CONFIG } from './config.js';

// Mots refusés où qu'ils apparaissent dans le pseudo
const BLOCK_ANYWHERE = [
  'connard', 'connasse', 'salope', 'salaud', 'encule', 'putain', 'merde', 'batard', 'bougnoul', 'negre', 'negro',
  'tapette', 'tarlouze', 'filsdepute', 'couille', 'chatte', 'branleur', 'branlette',
  'pouffiasse', 'petasse', 'trouduc', 'abruti', 'nazi', 'hitler', 'youpin', 'bicot', 'gouine', 'violeur', 'pedophile',
  'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'asshole', 'pussy', 'bastard',
  'wanker', 'rapist', 'pedo', 'tranny', 'jizz', 'porn', 'penis', 'vagin',
];
// Mots refusés seulement s'ils forment tout le pseudo (pour ne pas bloquer « unique », « dispute » ou « cockpit »)
const BLOCK_EXACT = [
  'con', 'cul', 'pd', 'ass', 'fag', 'cum', 'sex', 'sexe', 'kkk', 'ss', 'tg', 'pute', 'putes', 'nique', 'niquer', 'ntm', 'fdp', 'bite', 'bites',
  'pedale', 'raton', 'viol', 'suce', 'dick', 'cock', 'rape', 'kike', 'spic', 'chink', 'twat', 'anus', 'retard',
];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's' };

export function normalizePseudo(p) {
  return String(p || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0134578@$]/g, (c) => LEET[c] || '')
    .replace(/[^a-z]/g, '');
}

export function isOffensive(p) {
  const n = normalizePseudo(p);
  if (!n) return false;
  if (BLOCK_EXACT.includes(n)) return true;
  return BLOCK_ANYWHERE.some((w) => n.includes(w));
}

// Renvoie null si le pseudo est valable, sinon la clé du message d'erreur.
export function pseudoError(p) {
  const s = String(p || '').trim();
  if (s.length < CONFIG.pseudo.min) return 'pseudo.err.short';
  if (s.length > CONFIG.pseudo.max) return 'pseudo.err.long';
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(s)) return 'pseudo.err.chars'; // commence par une lettre ou un chiffre
  if (isOffensive(s)) return 'pseudo.err.rude';
  return null;
}
