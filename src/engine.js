// Lightweight motion engine (no animation library). One rAF loop, one scroll read per frame.
// Hooks (see CONTRACT.md): data-reveal, data-split, data-scrub-words, data-parallax,
// data-progress, data-hscroll, data-tilt, data-magnetic, data-count, data-scene.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- text splitting ---------- */
function splitText(el, mode) {
  if (el.dataset.splitDone) return;
  el.dataset.splitDone = '1';
  const label = el.textContent.trim().replace(/\s+/g, ' ');
  el.setAttribute('aria-label', label);
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const mask = document.createElement('span');
          mask.className = 'split-mask';
          mask.setAttribute('aria-hidden', 'true');
          if (mode === 'chars') {
            const word = document.createElement('span');
            word.className = 'split-w';
            word.style.transform = 'none';
            [...part].forEach((ch) => {
              const c = document.createElement('span');
              c.className = 'split-c'; c.textContent = ch; c.style.setProperty('--i', i++);
              word.append(c);
            });
            mask.append(word);
          } else {
            const w = document.createElement('span');
            w.className = 'split-w'; w.textContent = part; w.style.setProperty('--i', i++);
            mask.append(w);
          }
          frag.append(mask);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        walk(child);
      }
    });
  };
  walk(el);
}

function splitScrub(el) {
  const frag = document.createDocumentFragment();
  el.textContent.trim().split(/\s+/).forEach((word, i, arr) => {
    const s = document.createElement('span');
    s.className = 'scrub-w'; s.textContent = word;
    frag.append(s);
    if (i < arr.length - 1) frag.append(' ');
  });
  el.textContent = '';
  el.append(frag);
}

/* ---------- state ---------- */
const scrubs = [];      // {el, words, host}
const parallax = [];    // {el, speed}
const progress = [];    // {el}
const hscroll = [];     // {el, track, dist}
const sceneEls = [];
let vh = innerHeight;
let lastY = -1;
let currentScene = '';

function measureH() {
  vh = innerHeight;
  hscroll.forEach((h) => {
    const dist = Math.max(0, h.track.scrollWidth - innerWidth);
    h.dist = dist;
    h.el.style.height = `${dist + vh}px`;
  });
}

function rectProgress(el) {
  const r = el.getBoundingClientRect();
  // 0 when top enters bottom of viewport, 1 when bottom leaves top
  return { r, p: Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height))) };
}

function frame() {
  const y = scrollY;
  if (y !== lastY) {
    lastY = y;
    document.documentElement.style.setProperty('--scroll', String(y));

    for (const s of scrubs) {
      const r = s.host.getBoundingClientRect();
      // starts when the host's top reaches 60% of the viewport, completes as a pinned (tall) host
      // reaches its end; short hosts get a minimum range so they still light up gradually
      const range = Math.max(r.height - vh * 0.4, vh * 0.35);
      const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / range));
      const n = Math.round(p * s.words.length);
      if (n !== s.n) { s.n = n; s.words.forEach((w, i) => w.classList.toggle('on', i < n)); }
    }
    for (const p of parallax) {
      const r = p.el.getBoundingClientRect();
      const c = r.top + r.height / 2 - vh / 2;
      p.el.style.transform = `translate3d(0, ${(c * -p.speed).toFixed(1)}px, 0)`;
    }
    for (const g of progress) g.el.style.setProperty('--p', rectProgress(g.el).p.toFixed(4));
    for (const h of hscroll) {
      const r = h.el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (h.dist || 1)));
      h.el.style.setProperty('--x', `${(-p * h.dist).toFixed(1)}px`);
      h.el.style.setProperty('--hp', p.toFixed(4));
    }
    // which [data-scene] occupies viewport centre
    let active = '';
    for (const el of sceneEls) {
      const r = el.getBoundingClientRect();
      if (r.top <= vh * 0.5 && r.bottom >= vh * 0.5) { active = el.dataset.scene; break; }
    }
    if (active && active !== currentScene) {
      currentScene = active;
      window.dispatchEvent(new CustomEvent('brew:scene', { detail: active }));
    }
  }
  requestAnimationFrame(frame);
}

/* ---------- pointer effects ---------- */
function initTilt(el) {
  const max = parseFloat(el.dataset.tilt) || 8;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`;
    el.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
}

function initMagnetic(el) {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${x * 0.25}px, ${y * 0.3}px)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
}

function countUp(el) {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  if (reduced) { el.textContent = target + suffix; return; }
  const t0 = performance.now();
  const dur = 1600;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 4);
    el.textContent = Math.round(target * e) + suffix;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- nav + tabbar ---------- */
function initNav() {
  const nav = document.getElementById('nav');
  const links = [...document.querySelectorAll('.nav__links a, .tabbar__item')];
  const tabbar = document.getElementById('tabbar');
  const tabs = [...document.querySelectorAll('.tabbar__item')];
  let prev = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('is-hidden', y > prev && y > 300 && innerWidth > 820);
    prev = y;
  }, { passive: true });

  const ids = [...new Set(links.map((a) => a.getAttribute('href').slice(1)))];
  const targets = ids.map((id) => (id === 'top' ? document.body : document.getElementById(id))).filter(Boolean);
  const order = tabs.map((t) => t.dataset.tab);
  const setActive = (id) => {
    links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
    // map sections without a tab onto the nearest earlier tab
    const tabFor = { top: 'top', story: 'top', menu: 'menu', cakes: 'menu', ube: 'menu', offers: 'offers', training: 'training', pet: 'training', community: 'training', visit: 'visit' };
    const t = tabFor[id] || 'top';
    tabs.forEach((a) => a.classList.toggle('is-active', a.dataset.tab === t));
    tabbar?.style.setProperty('--tab', String(Math.max(0, order.indexOf(t))));
  };
  const sections = [...document.querySelectorAll('main > section[id]')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id === 'hero' ? 'top' : e.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));
  if (!targets.length) setActive('top');
}

/* ---------- boot ---------- */
export function initEngine() {
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      if (e.target.dataset.count) countUp(e.target);
      revealIO.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

  document.querySelectorAll('[data-split]').forEach((el) => {
    splitText(el, el.dataset.split === 'chars' ? 'chars' : 'words');
    revealIO.observe(el);
  });
  document.querySelectorAll('[data-reveal], [data-count]').forEach((el) => revealIO.observe(el));

  if (!reduced) {
    document.querySelectorAll('[data-scrub-words]').forEach((el) => {
      splitScrub(el);
      scrubs.push({ el, host: el.closest('[data-scrub-host]') || el, words: [...el.querySelectorAll('.scrub-w')], n: -1 });
    });
    document.querySelectorAll('[data-parallax]').forEach((el) => parallax.push({ el, speed: parseFloat(el.dataset.parallax) || 0.15 }));
  }
  document.querySelectorAll('[data-progress]').forEach((el) => progress.push({ el }));
  document.querySelectorAll('[data-hscroll]').forEach((el) => {
    const track = el.querySelector('.hs-track');
    if (track && !reduced) hscroll.push({ el, track, dist: 0 });
    else if (track) { el.style.height = 'auto'; track.parentElement.style.overflowX = 'auto'; }
  });
  sceneEls.push(...document.querySelectorAll('[data-scene]'));

  if (finePointer && !reduced) {
    document.querySelectorAll('[data-tilt]').forEach(initTilt);
    document.querySelectorAll('[data-magnetic]').forEach(initMagnetic);
  }

  initNav();
  measureH();
  addEventListener('resize', () => { measureH(); lastY = -1; }, { passive: true });
  // images loading late can change track widths
  addEventListener('load', () => { measureH(); lastY = -1; });
  requestAnimationFrame(frame);

  const splash = document.getElementById('splash');
  if (splash) splash.addEventListener('animationend', (e) => { if (e.animationName === 'splash-out') splash.classList.add('is-done'); });
}
