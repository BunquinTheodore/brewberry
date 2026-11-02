import { initEngine } from './engine.js';
import { initSfx } from './sfx.js';

initEngine();
initSfx(document.getElementById('soundToggle'));
document.getElementById('year')?.replaceChildren(String(new Date().getFullYear()));

// The 3D background is progressive enhancement: loaded after first paint, off the critical path.
function canRun3D() {
  const conn = navigator.connection;
  if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function boot3D() {
  if (!canRun3D()) return;
  const host = document.getElementById('bg3d');
  import('./three/scene.js')
    .then((m) => m.start(host))
    .catch((err) => console.warn('3D background unavailable', err));
}

// Start on the first sign of a real visitor (pointer, touch, scroll, key), or shortly after load
// otherwise. Keeps the heavy WebGL setup out of the critical first seconds.
const FALLBACK_DELAY_MS = 3500;
let booted = false;
const kick = () => {
  if (booted) return;
  booted = true;
  INTENT_EVENTS.forEach((ev) => removeEventListener(ev, kick));
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1));
  idle(boot3D, { timeout: 800 });
};
const INTENT_EVENTS = ['pointermove', 'pointerdown', 'touchstart', 'scroll', 'keydown', 'wheel'];
INTENT_EVENTS.forEach((ev) => addEventListener(ev, kick, { passive: true, once: true }));
const armFallback = () => setTimeout(kick, FALLBACK_DELAY_MS);
if (document.readyState === 'complete') armFallback();
else addEventListener('load', armFallback, { once: true });

// Optional per-section behaviour: src/sections/<id>.js default-exports init(rootEl).
const sectionModules = import.meta.glob('./sections/*.js', { eager: true });
for (const [path, mod] of Object.entries(sectionModules)) {
  const id = path.split('/').pop().replace('.js', '');
  const root = document.getElementById(id);
  if (root && typeof mod.default === 'function') {
    try { mod.default(root); } catch (err) { console.error(`section ${id} failed to init`, err); }
  }
}
