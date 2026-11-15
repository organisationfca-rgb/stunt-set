// Installation du jeu sur l'écran d'accueil du téléphone (application web, sans passer par un magasin d'applications).
// Sur Android (Chrome), le navigateur fournit un vrai bouton d'installation.
// Sur iPhone, il n'y a pas de bouton : on explique le geste à faire (Partager, puis « Sur l'écran d'accueil »).

let deferred = null; // l'invitation d'installation fournie par le navigateur, quand il en propose une
let installed = false;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  installed = true;
});

export const install = {
  // true si le jeu tourne déjà comme une application installée
  get isInstalled() {
    try {
      return installed || window.navigator.standalone === true
        || window.matchMedia('(display-mode: standalone)').matches
        || window.matchMedia('(display-mode: fullscreen)').matches;
    } catch (e) {
      return false;
    }
  },
  // true si le navigateur peut afficher lui-même la fenêtre d'installation
  get canPrompt() {
    return !!deferred;
  },
  // true si la page est ouverte dans le navigateur intégré d'une appli (Instagram, Facebook, TikTok, Snapchat…) :
  // on ne peut pas y installer le jeu, il faut d'abord ouvrir la page dans le vrai navigateur du téléphone.
  get inApp() {
    return /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Bytedance|Snapchat|LinkedInApp|Twitter|Line\//i.test(navigator.userAgent || '');
  },
  // 'ios', 'android' ou 'other' (ordinateur)
  get platform() {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'other';
  },
  // Ouvre la fenêtre d'installation du navigateur. Renvoie true si le joueur a accepté.
  async prompt() {
    if (!deferred) return false;
    const ev = deferred;
    deferred = null;
    try {
      ev.prompt();
      const choice = await ev.userChoice;
      return !!choice && choice.outcome === 'accepted';
    } catch (e) {
      return false;
    }
  },
};

// Le « service worker » garde une copie du jeu sur l'appareil : il se lance alors même sans réseau,
// et se met à jour tout seul dès qu'une nouvelle version est en ligne.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (window.location.protocol !== 'https:' && !local) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* pas grave : le jeu marche sans */ });
  });
}
