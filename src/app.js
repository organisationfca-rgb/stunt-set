// État commun de l'application et changement d'écran.
import { input } from './input.js';

export const app = {
  scene: null,
  logo: null, // logo pixel du FCA, grand (96 px de large)
  logoSmall: null, // logo pixel du FCA, petit (64 px de large)
  icon: null, // icône de l'application
  go(scene) {
    if (this.scene && this.scene.leave) this.scene.leave();
    this.scene = scene;
    input.handler = scene;
    input.pointers.clear();
    if (scene.enter) scene.enter();
  },
};

// Ouvre un lien externe dans un nouvel onglet (à appeler pendant un appui du joueur).
export function openLink(url) {
  if (!/^https:\/\//.test(String(url))) return; // seulement des adresses web chiffrées (celles des réglages)
  try {
    const w = window.open(url, '_blank', 'noopener');
    if (!w) window.location.href = url;
  } catch (e) {
    window.location.href = url;
  }
}
