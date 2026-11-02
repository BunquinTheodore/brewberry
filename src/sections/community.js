// Pause the drifting photo columns while the section is off screen (saves compositor work).
export default function init(root) {
  if (!('IntersectionObserver' in window)) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.classList.add('is-paused');
  // several entries can queue up between callbacks: the last one is the current state
  const io = new IntersectionObserver((entries) => {
    root.classList.toggle('is-paused', !entries[entries.length - 1].isIntersecting);
  }, { rootMargin: '200px 0px' });
  io.observe(root);
}
