# Build contract: Brewbery Kitchenette website

Static site, Vite 5, plain JS (no TS, no framework, no animation library). three.js only in `src/three/`.
Run `npm run dev` / `npm run build`. Read these before writing anything (do not rewrite them):
`index.html`, `vite.config.js`, `src/styles/base.css`, `src/styles/shell.css`, `src/engine.js`, `src/sfx.js`, `src/main.js`.

## Brand + facts (do NOT invent other facts)
- Name: **Brewbery Kitchenette** (spelled "Brewbery", one r in "bery"). Tagline: "Brew and Bakery Kitchenette".
- Quote: "From the heart of a barista, from the hands of a pâtissier. A perfect harmony of passion, coffee, and pastry."
- Phone: 0968 892 3674 (`tel:+639688923674`). Facebook page: https://www.facebook.com/brewberycafe
- Instagram: https://www.instagram.com/brewberycafe . Facebook group: https://www.facebook.com/share/g/1EDFB3jamq/?mibextid=wwXIfr
- Map link: https://www.google.com/maps/search/?api=1&query=Brewbery+Kitchenette+Batangas
- Offers: (1) Student promo: 10% OFF your favourite coffee and pastries with student card. Schools by day: Monday Lyceum of the Philippines University, Tuesday University of Batangas, Wednesday Batangas State University, Thursday Westmead International School. (2) Summer Sips Drinks: Strawberry Mint ("Taste the pure essence of sunshine in every sip"), Calamansi Ginger ("A classic Calamansi Ginger that's like a breath of fresh air on a hot summer day"), Blueberry Basil ("This sparkling spritzer combines the freshness of blueberry puree with a touch of basil").
- They offer **one on one barista training** with a certificate of completion (photos show espresso dosing, tamping, milk steaming, latte art, graduates holding certificates).
- There is a resident orange café kitten (name unknown: do not name it).
- Signature ube line: "You had me at Ube Pastillas" (ube drink), ube cheese buns, ube bread.
- NO prices, opening hours, street address, staff names, years, ratings or statistics. Never fabricate numbers. Use "Message us" style CTAs instead.

## Design language
Apple product page feel + glassmorphism. Dark espresso canvas (`--bg`) with a live 3D background behind everything,
huge tight sans headlines (system SF stack), an italic serif accent (`.serif`, Instrument Serif) for a word or two,
lots of space, soft depth, frosted `.glass` panels, pill buttons, rounded media frames. Light cream sections use
`.section--light` (opaque, covers the 3D bg) for rhythm. Palette tokens only (see base.css :root).

Hard rules from the client:
- No hyphens or dashes before labels and no decorative leading lines/rules (no "—— WHO WE ARE", no "01 —"). Eyebrows are plain text: `<span class="eyebrow">Our story</span>`.
- Avoid em dashes and en dashes in UI copy; use a period or comma.
- Mobile first. 16px side gutter minimum (`.wrap` handles it), no horizontal page scroll (body has `overflow-x: clip`). Phones have a bottom tab bar: body already reserves `--tabbar-h`; fixed things you add must sit above it.
- Performance is a top priority (target Lighthouse 95+): no new dependencies, no web fonts beyond the one already linked, no videos, no large inline SVGs, avoid layout thrash, animate only transform/opacity/filter, keep `backdrop-filter` to a handful of panels in view at once, no `box-shadow` animation.
- Accessibility: semantic headings (one `h1`, in hero only; sections use `h2`/`h3`), alt text on content images (empty alt for decorative), buttons are `<button>`, links are `<a>`, visible focus, `prefers-reduced-motion` respected, colour contrast AA.

## Images
Use the custom tag, it expands at build time into a responsive lazy `<img>` with srcset, intrinsic size and colour placeholder:
`<x-img name="cakes-showcase" alt="Cakes on white pedestals" sizes="(max-width: 700px) 92vw, 40vw" class="..." />`
Add the bare attribute `eager` ONLY for the hero's above-the-fold image (none expected). Names + intrinsic sizes are in `src/images.txt`.
Wrap images in `.frame` (rounded, overflow hidden) or your own frame class; set `aspect-ratio` on the frame so nothing shifts.
Logo files: `/img/logo-light.webp` (cream, for dark bg), `/img/logo-dark.webp` (brown, for light bg), 600x285.

## Motion hooks (engine.js handles them, just add attributes)
- `data-reveal` fade up on enter. Variants `data-reveal="scale|left|right|blur"`. Stagger with `style="--d:120ms"`.
- `data-split` (words) or `data-split="chars"` on a heading: masked line-rise text animation on enter. Plain text inside (inline `<em>`/`<span>` allowed, no block children).
- `data-scrub-words` on a paragraph: words light up as you scroll; put `data-scrub-host` on a tall ancestor (e.g. a 200vh wrapper with a sticky child) to control the scrub range.
- `data-parallax="0.15"` translateY parallax (do not combine with data-reveal on the same element; nest them).
- `data-progress` sets `--p` (0..1) on the element as it crosses the viewport: use in CSS for scroll-linked transforms, e.g. `transform: rotate(calc(var(--p) * 30deg))`.
- `data-hscroll` section with `<div class="hs-sticky"><div class="hs-track">...cards...</div></div>`: pinned horizontal scroll. Engine sets the section height and `--x` on the section (track translate) and `--hp` (0..1).
- `data-tilt="8"` glass card 3D tilt on fine pointers; sets `--mx/--my` (%) for a specular highlight you can paint with a radial-gradient.
- `data-magnetic` buttons follow the pointer slightly.
- `data-count="10" data-suffix="%"` count up on enter (only for real numbers, e.g. the 10% promo).
- `data-scene="hero|story|menu|cakes|ube|offers|training|pet|community|visit"` on each `<section>`: tells the 3D background which mood to show.
- Sound: every `a`/`button` click already plays a synthesized sound. Choose a variant with `data-sfx="pop|tick|chime|pour|meow"` (e.g. `meow` for the kitten, `pour` for drinks).
- Marquee: `.marquee > .marquee__track` with the content duplicated twice (second copy `aria-hidden="true"`), `--marquee-dur` to set speed, `.marquee--rev` to reverse.

## Files and ownership (only touch your own files)
Each section = `sections/<id>.html` (a single root `<section id="<id>" class="section ..." data-scene="<id>">`, footer uses `<footer id="footer">`),
`src/styles/sections/<id>.css` (every selector prefixed with the section's own class prefix, e.g. `.story-`, `.menu-`; no global element selectors),
and optional `src/sections/<id>.js` with `export default function init(root) {}` (auto-wired by main.js; keep tiny, no deps, guard for reduced motion).
Section ids in order: hero, story, menu, cakes, ube, offers, training, pet, community, visit, footer.
3D background: `src/three/scene.js` exporting `start(hostEl)`.
