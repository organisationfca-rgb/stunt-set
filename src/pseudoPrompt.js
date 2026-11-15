// Saisie du pseudo : une petite fenêtre HTML par-dessus le jeu (pour profiter du clavier du téléphone).
import { t } from './i18n.js';
import { save } from './save.js';
import { pseudoError } from './pseudo.js';
import { CONFIG } from './config.js';

// Renvoie une promesse : le pseudo choisi, ou null si le joueur annule.
export function askPseudo() {
  return new Promise((resolve) => {
    const overlay = document.getElementById('overlay');
    const form = document.getElementById('pseudo-form');
    const inputEl = document.getElementById('pseudo-input');
    const err = document.getElementById('pseudo-error');
    document.getElementById('pseudo-label').textContent = t('pseudo.title');
    document.getElementById('pseudo-hint').textContent = t('pseudo.hint', { min: CONFIG.pseudo.min, max: CONFIG.pseudo.max });
    document.getElementById('pseudo-ok').textContent = t('common.ok');
    document.getElementById('pseudo-cancel').textContent = t('common.later');
    inputEl.maxLength = CONFIG.pseudo.max;
    inputEl.value = save.data.pseudo || '';
    err.textContent = '';
    overlay.hidden = false;
    setTimeout(() => inputEl.focus(), 50);

    const close = (value) => {
      overlay.hidden = true;
      form.removeEventListener('submit', onSubmit);
      cancel.removeEventListener('click', onCancel);
      inputEl.blur();
      resolve(value);
    };
    const onSubmit = (e) => {
      e.preventDefault();
      const value = inputEl.value.trim();
      const problem = pseudoError(value);
      if (problem) {
        err.textContent = t(problem);
        return;
      }
      save.set('pseudo', value);
      close(value);
    };
    const onCancel = () => close(null);
    const cancel = document.getElementById('pseudo-cancel');
    form.addEventListener('submit', onSubmit);
    cancel.addEventListener('click', onCancel);
  });
}
