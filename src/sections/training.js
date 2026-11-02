// Stacking cards: each card gets --k (0..1) as the next card slides over it.
// Reads rects only while the section is on screen, writes one custom property per card.
export default function init(root) {
  const cards = [...root.querySelectorAll('.training-card')];
  if (cards.length < 2) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let tops = [];
  let vh = innerHeight;
  let active = false;
  let queued = false;

  const measure = () => {
    vh = innerHeight;
    tops = cards.map((c) => parseFloat(getComputedStyle(c).top) || 0);
  };

  const update = () => {
    queued = false;
    const rects = cards.map((c) => c.getBoundingClientRect().top);
    for (let i = 0; i < cards.length - 1; i += 1) {
      const range = Math.max(1, vh - tops[i + 1]);
      const k = Math.min(1, Math.max(0, (vh - rects[i + 1]) / range));
      const v = k.toFixed(3);
      if (cards[i].dataset.k !== v) {
        cards[i].dataset.k = v;
        cards[i].style.setProperty('--k', v);
      }
    }
  };

  const request = () => {
    if (active && !queued) { queued = true; requestAnimationFrame(update); }
  };

  // several entries can queue up between callbacks: the last one is the current state
  const io = new IntersectionObserver((entries) => {
    active = entries[entries.length - 1].isIntersecting;
    request();
  });
  io.observe(root.querySelector('.training-stack') || root);

  measure();
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', () => { measure(); request(); }, { passive: true });
}
