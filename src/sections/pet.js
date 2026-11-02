// Kitten section: "Say hi" burst of paws and hearts, plus a soft paw trail on fine pointers.
const PAW = '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="21.5" rx="7" ry="6"/><ellipse cx="7.5" cy="13" rx="2.8" ry="3.6"/><ellipse cx="12.5" cy="8" rx="2.8" ry="3.7"/><ellipse cx="19.5" cy="8" rx="2.8" ry="3.7"/><ellipse cx="24.5" cy="13" rx="2.8" ry="3.6"/></svg>';
const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-8.5-5.2-8.5-11.3A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 3.1C20.5 15.8 12 21 12 21z"/></svg>';
const REPLIES = [
  'Mrrp. Hello to you too.',
  'A slow blink. That means you are friends now.',
  'Purr levels rising.',
  'The kitten has approved your visit.',
  'Okay, one more. Then nap time.',
  'Quality control says hi back.',
];
const MAX_BITS = 18;
const BURST = 6;
const MAX_STEPS = 12;
const STEP_MS = 90;
const STEP_DIST = 46;

function spawn(layer, html, cls) {
  const el = document.createElement('span');
  el.className = cls;
  el.innerHTML = html;
  const done = () => el.remove();
  el.addEventListener('animationend', done, { once: true });
  setTimeout(done, 2500);
  layer.append(el);
  return el;
}

function initBurst(root, reduced) {
  const btn = root.querySelector('.pet-hi__btn');
  const layer = root.querySelector('.pet-burst');
  const reply = root.querySelector('.pet-hi__reply');
  if (!btn || !layer) return;
  let n = 0;

  btn.addEventListener('click', () => {
    if (reply) {
      reply.textContent = REPLIES[n % REPLIES.length];
      reply.classList.remove('is-new');
      void reply.offsetWidth;
      reply.classList.add('is-new');
    }
    n += 1;
    btn.classList.remove('is-boop');
    void btn.offsetWidth;
    btn.classList.add('is-boop');
    if (reduced) return;

    const room = Math.min(BURST, MAX_BITS - layer.childElementCount);
    for (let i = 0; i < room; i += 1) {
      const heart = i % 2 === 1;
      const el = spawn(layer, heart ? HEART : PAW, `pet-bit${heart ? ' pet-bit--heart' : ''}`);
      const spread = (i / Math.max(1, BURST - 1) - 0.5) * 2;
      el.style.setProperty('--dx', `${(spread * 70 + (Math.random() - 0.5) * 30).toFixed(0)}px`);
      el.style.setProperty('--dy', `${(-120 - Math.random() * 90).toFixed(0)}px`);
      el.style.setProperty('--r', `${((Math.random() - 0.5) * 60).toFixed(0)}deg`);
      el.style.setProperty('--s', (0.8 + Math.random() * 0.6).toFixed(2));
      el.style.setProperty('--dur', `${(1.3 + Math.random() * 0.6).toFixed(2)}s`);
      el.style.animationDelay = `${i * 45}ms`;
    }
  });
}

function initTrail(root) {
  const layer = root.querySelector('.pet-trail');
  if (!layer) return;
  let last = 0;
  let lx = -999;
  let ly = -999;
  let left = false;

  root.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const now = performance.now();
    if (now - last < STEP_MS) return;
    const r = root.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const dx = x - lx;
    const dy = y - ly;
    if (dx * dx + dy * dy < STEP_DIST * STEP_DIST) return;
    last = now;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    const len = Math.hypot(dx, dy) || 1;
    // offset alternate steps sideways, like left and right paws
    const side = (left ? -1 : 1) * 9;
    left = !left;
    lx = x;
    ly = y;
    while (layer.childElementCount >= MAX_STEPS) layer.firstElementChild.remove();
    const el = spawn(layer, PAW, 'pet-step');
    el.style.setProperty('--x', `${(x + (-dy / len) * side).toFixed(0)}px`);
    el.style.setProperty('--y', `${(y + (dx / len) * side).toFixed(0)}px`);
    el.style.setProperty('--a', `${angle.toFixed(0)}deg`);
  }, { passive: true });
}

export default function init(root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  initBurst(root, reduced);
  if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) initTrail(root);
}
