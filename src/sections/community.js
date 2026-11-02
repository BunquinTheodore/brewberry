// Pause the drifting photo columns while the section is off screen (saves compositor work).
export default function init(root) {
  if (!('IntersectionObserver' in window)) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.classList.add('is-paused');
  const io = new IntersectionObserver(([entry]) => {
    root.classList.toggle('is-paused', !entry.isIntersecting);
  }, { rootMargin: '200px 0px' });
  io.observe(root);
}
