// Commandes : doigts, souris et clavier, ramenés aux pixels du jeu.
import { G } from './gfx.js';

export const input = {
  pointers: new Map(), // doigts actuellement posés
  keys: new Set(), // touches actuellement enfoncées
  handler: null, // { pointer(type, p), key(code, down) } : la scène en cours
  onFirstGesture: null,
};

function toGame(e) {
  const r = G.canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * G.W,
    y: ((e.clientY - r.top) / r.height) * G.H,
  };
}

let gestureDone = false;
function firstGesture() {
  if (gestureDone) return;
  gestureDone = true;
  if (input.onFirstGesture) input.onFirstGesture();
}

export function initInput() {
  const c = G.canvas;
  c.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    firstGesture();
    try { c.setPointerCapture(e.pointerId); } catch (err) { /* sans importance */ }
    const pos = toGame(e);
    const p = { id: e.pointerId, x: pos.x, y: pos.y, sx: pos.x, sy: pos.y, t0: performance.now(), dx: 0, dy: 0, data: {} };
    input.pointers.set(e.pointerId, p);
    if (input.handler && input.handler.pointer) input.handler.pointer('down', p);
  });
  c.addEventListener('pointermove', (e) => {
    const p = input.pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    const pos = toGame(e);
    p.dx = pos.x - p.x;
    p.dy = pos.y - p.y;
    p.x = pos.x;
    p.y = pos.y;
    if (input.handler && input.handler.pointer) input.handler.pointer('move', p);
  });
  const end = (e) => {
    const p = input.pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    const pos = toGame(e);
    p.x = pos.x;
    p.y = pos.y;
    input.pointers.delete(e.pointerId);
    p.cancelled = e.type === 'pointercancel';
    if (input.handler && input.handler.pointer) input.handler.pointer('up', p);
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
  c.addEventListener('contextmenu', (e) => e.preventDefault());
  // Empêche le défilement et le zoom involontaires
  document.addEventListener('touchmove', (e) => { if (e.target === c) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    firstGesture();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    input.keys.add(e.code);
    if (input.handler && input.handler.key) input.handler.key(e.code, true, e);
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    if (input.handler && input.handler.key) input.handler.key(e.code, false, e);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.pointers.clear();
  });
}

export function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) {
    /* non supporté (iOS Safari) : on ignore */
  }
}
