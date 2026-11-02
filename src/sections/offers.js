// Offers: weekday picker for the student promo + Summer Sips drink selector.
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const SWAP_MS = 220;
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Weekday (0 Sunday ... 6 Saturday) at the café in Batangas, not in the visitor's timezone.
function cafeWeekday() {
  try {
    const short = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Manila' }).format(new Date());
    const i = SHORT_DAYS.indexOf(short);
    if (i >= 0) return i;
  } catch { /* fall back to local time */ }
  return new Date().getDay();
}

function initDays(root, reduced) {
  const wrap = root.querySelector('[data-days]');
  if (!wrap) return;
  const seg = wrap.querySelector('.offers-seg');
  const buttons = [...wrap.querySelectorAll('.offers-seg__btn')];
  const box = wrap.querySelector('.offers-school');
  const dayEl = wrap.querySelector('[data-school-day]');
  const nameEl = wrap.querySelector('[data-school-name]');
  const note = wrap.querySelector('[data-days-note]');
  let timer = 0;
  let current = -1;

  const select = (i, animate = true) => {
    if (i === current) return;
    current = i;
    buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    seg.style.setProperty('--i', String(i));
    const write = () => {
      dayEl.textContent = `${DAY_NAMES[i]} is for`;
      nameEl.textContent = buttons[i].dataset.school;
      box.classList.remove('is-swap');
    };
    clearTimeout(timer);
    if (!animate || reduced) { write(); return; }
    box.classList.add('is-swap');
    timer = setTimeout(write, SWAP_MS);
  };

  buttons.forEach((b, i) => {
    b.addEventListener('click', () => select(i));
    b.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const next = (i + step + buttons.length) % buttons.length;
      buttons[next].focus();
      select(next);
    });
  });

  // Promo days are Monday (1) to Thursday (4).
  const today = cafeWeekday();
  const isPromoDay = today >= 1 && today <= 4;
  if (isPromoDay) {
    const btn = buttons[today - 1];
    btn.dataset.today = '';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = ', today';
    btn.append(sr);
  } else if (note) {
    note.hidden = false;
  }
  select(isPromoDay ? today - 1 : 0, false);
}

function initSips(root) {
  const card = root.querySelector('.offers-card--sips');
  if (!card) return;
  const pills = [...card.querySelectorAll('.offers-pill')];
  const descs = [...card.querySelectorAll('.offers-desc__text')];
  const live = card.querySelector('[data-desc-live]');
  // The stacked visual copies are hidden from assistive tech; one live region carries the active text.
  descs.forEach((d) => { d.hidden = false; if (live || !d.classList.contains('is-on')) d.setAttribute('aria-hidden', 'true'); });
  if (live) live.textContent = (descs.find((d) => d.classList.contains('is-on')) || descs[0])?.textContent || '';

  const select = (key) => {
    if (card.dataset.drink === key) return;
    card.dataset.drink = key;
    pills.forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.pick === key)));
    descs.forEach((d) => {
      const on = d.dataset.desc === key;
      d.classList.toggle('is-on', on);
      if (live) { if (on) live.textContent = d.textContent; return; }
      if (on) d.removeAttribute('aria-hidden'); else d.setAttribute('aria-hidden', 'true');
    });
  };
  pills.forEach((p) => p.addEventListener('click', () => select(p.dataset.pick)));
}

export default function init(root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  initDays(root, reduced);
  initSips(root);
}
