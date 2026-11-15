// Démarrage du jeu et boucle principale.
import { G, initGfx, loadImage, rect, text, PAL } from './gfx.js';
import { initInput, input } from './input.js';
import { loadSave, save } from './save.js';
import { loadLanguages, initLanguage } from './i18n.js';
import { audio } from './audio.js';
import { app } from './app.js';
import { board } from './leaderboard.js';
import { langScreen, charScreen, titleScreen } from './screens.js';
import { registerServiceWorker } from './install.js';

registerServiceWorker(); // copie du jeu sur l'appareil : lancement hors ligne et mises à jour automatiques

async function boot() {
  initGfx(document.getElementById('game'));
  rect(0, 0, G.W, G.H, PAL.night);
  loadSave();
  initInput();
  input.onFirstGesture = () => audio.unlock();
  document.addEventListener('pointerdown', () => audio.unlock());
  audio.applySettings();

  const [, logo, logoSmall, icon] = await Promise.all([loadLanguages(), loadImage('assets/logo-96.png'), loadImage('assets/logo-64.png'), loadImage('assets/icon-192.png')]);
  app.icon = icon;
  initLanguage();
  app.logo = logo;
  app.logoSmall = logoSmall;

  // Premier lancement : langue, puis personnage, puis écran titre.
  const toTitle = () => { save.set('onboarded', true); app.go(titleScreen()); };
  const toChar = () => app.go(charScreen(toTitle, null));
  if (!save.data.lang) app.go(langScreen(toChar));
  else if (!save.data.character) toChar();
  else app.go(titleScreen());

  // Accès pratique pour les tests, seulement sur l'ordinateur de développement (jamais sur le jeu en ligne).
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) window.stuntset = app;
  board.flush(); // renvoie les scores restés en attente

  // Pause automatique quand le jeu passe en arrière-plan
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (app.scene && app.scene.hide) app.scene.hide();
      audio.suspend();
    } else {
      audio.resume();
      last = performance.now();
    }
  });

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const sc = app.scene;
    if (sc) {
      try {
        if (sc.update) sc.update(dt);
        G.ctx = G.main;
        sc.draw();
      } catch (e) {
        console.error(e);
        rect(0, 0, G.W, 12, PAL.red);
        text(String(e.message || e).slice(0, 34), 2, 2);
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot();
