// Synthesized UI sounds via Web Audio: no audio files to download.
// Every button/link click plays a sound; data-sfx="pop|tick|pour|meow|chime" picks a variant.
const STORAGE_KEY = 'brewbery:sfx';
let ctx = null;
let enabled = true;

try { enabled = localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { /* storage blocked: default on */ }

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function env(c, gain, t0, attack, decay) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  g.connect(c.destination);
  return g;
}

function tone(c, { type = 'sine', from, to, gain = 0.08, attack = 0.004, decay = 0.08, delay = 0 }) {
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + attack + decay);
  o.connect(env(c, gain, t0, attack, decay));
  o.start(t0);
  o.stop(t0 + attack + decay + 0.02);
}

const SOUNDS = {
  // soft bubbly "pop" for primary buttons
  pop: (c) => { tone(c, { from: 420, to: 880, gain: 0.09, decay: 0.07 }); tone(c, { type: 'triangle', from: 1400, to: 1100, gain: 0.02, decay: 0.04 }); },
  // crisp tick for nav and small links
  tick: (c) => tone(c, { type: 'triangle', from: 1900, to: 1300, gain: 0.05, attack: 0.002, decay: 0.035 }),
  // two-note chime for CTAs
  chime: (c) => { tone(c, { from: 880, gain: 0.06, decay: 0.22 }); tone(c, { from: 1318.5, gain: 0.05, decay: 0.3, delay: 0.07 }); },
  // little liquid "pour" glide
  pour: (c) => { tone(c, { from: 300, to: 1200, gain: 0.06, attack: 0.01, decay: 0.16 }); tone(c, { type: 'triangle', from: 600, to: 1500, gain: 0.03, attack: 0.01, decay: 0.14, delay: 0.04 }); },
  // tiny synthesized meow for the café cat
  meow: (c) => {
    const t0 = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, t0); o.frequency.linearRampToValueAtTime(820, t0 + 0.12); o.frequency.exponentialRampToValueAtTime(440, t0 + 0.42);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(900, t0); f.frequency.linearRampToValueAtTime(1800, t0 + 0.14); f.frequency.linearRampToValueAtTime(1000, t0 + 0.42);
    o.connect(f); f.connect(env(c, 0.12, t0, 0.04, 0.4));
    o.start(t0); o.stop(t0 + 0.48);
  },
};

export function play(name = 'pop') {
  if (!enabled) return;
  const c = audio();
  if (!c) return;
  (SOUNDS[name] || SOUNDS.pop)(c);
}

function soundFor(el) {
  if (el.dataset.sfx) return el.dataset.sfx;
  if (el.closest('.nav__links, .tabbar')) return 'tick';
  if (el.classList.contains('btn--caramel')) return 'chime';
  if (el.matches('.btn')) return 'pop';
  return 'tick';
}

export function initSfx(toggleBtn) {
  const sync = () => toggleBtn && toggleBtn.setAttribute('aria-pressed', String(enabled));
  sync();
  toggleBtn?.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch { /* ignore */ }
    sync();
    if (enabled) play('chime');
  });
  // Mouse: pointerdown feels instant. Touch and keyboard: wait for click, because a touch
  // pointerdown also starts every scroll gesture and is not a user activation for audio.
  let lastPointer = 0;
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest('a, button, [data-sfx]');
    if (!el || el === toggleBtn) return;
    lastPointer = performance.now();
    play(soundFor(el));
  }, { passive: true });
  document.addEventListener('click', (e) => {
    if (performance.now() - lastPointer < 600) return;
    const el = e.target.closest('a, button, [data-sfx]');
    if (!el || el === toggleBtn) return;
    play(soundFor(el));
  });
}
