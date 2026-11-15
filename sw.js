// Stunt Set ! — service worker.
// Rôle : garder une copie du jeu sur l'appareil pour qu'il se lance sans réseau,
// tout en prenant toujours la dernière version quand le réseau est là.
//
// Principe « réseau d'abord » : à chaque ouverture, on demande les fichiers au serveur
// (donc les mises à jour arrivent toutes seules, sans rien faire) ; si le réseau ne répond pas
// en quelques secondes, on sert la copie gardée sur l'appareil.

const CACHE = 'stuntset-cache-v1';
const TIMEOUT_MS = 3500;

// Les fichiers du jeu, copiés dès la première visite (à compléter quand on ajoute un fichier).
const FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'assets/logo-96.png',
  'assets/logo-64.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
  'assets/apple-touch-icon.png',
  'src/main.js',
  'src/app.js',
  'src/audio.js',
  'src/characters.js',
  'src/config.js',
  'src/font.js',
  'src/gfx.js',
  'src/i18n.js',
  'src/input.js',
  'src/install.js',
  'src/leaderboard.js',
  'src/music.js',
  'src/pseudo.js',
  'src/pseudoPrompt.js',
  'src/save.js',
  'src/screens.js',
  'src/ui.js',
  'src/widgets.js',
  'src/games/chute.js',
  'src/games/chuteArt.js',
  'src/i18n/fr.json',
  'src/i18n/en.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // un fichier manquant ne doit pas empêcher l'installation : on les copie un par un
      .then((cache) => Promise.all(FILES.map((f) => cache.add(f).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // « no-cache » : on vérifie auprès du serveur que le fichier n'a pas changé
    const target = request.mode === 'navigate' ? request.url : request;
    const response = await fetch(target, { signal: controller.signal, cache: 'no-cache' });
    clearTimeout(timer);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    clearTimeout(timer);
    const hit = (await cache.match(request, { ignoreSearch: true }))
      || (request.mode === 'navigate' ? await cache.match('index.html') : null);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  // on ne s'occupe que des fichiers du jeu ; le classement en ligne passe directement par le réseau
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});
