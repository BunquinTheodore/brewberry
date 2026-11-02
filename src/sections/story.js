// Story: after the engine splits the quote into scrub words, tint the key words
// (barista, pâtissier, passion, coffee, pastry) with the serif accent. No-op under reduced motion.
const ACCENT = /^(barista|pâtissier|passion|coffee|pastry)[.,]?$/i;

export default function init(root) {
  root.querySelectorAll('.story-quote .scrub-w').forEach((w) => {
    if (ACCENT.test(w.textContent)) w.classList.add('story-hl');
  });
}
