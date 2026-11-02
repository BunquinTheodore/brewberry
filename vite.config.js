import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const images = JSON.parse(fs.readFileSync(path.resolve('src/images.json'), 'utf8'));

// <x-img name="cakes-showcase" alt="..." sizes="(max-width:700px) 90vw, 40vw" class="..." eager />
// expands into a responsive <img> with srcset, intrinsic size and a dominant-colour placeholder.
function expandImg(attrs) {
  const get = (k) => (attrs.match(new RegExp(`(?:^|\\s)${k}="([^"]*)"`)) || [])[1];
  const name = get('name');
  const meta = images[name];
  if (!meta) throw new Error(`x-img: unknown image "${name}"`);
  const eager = /\beager\b/.test(attrs);
  const sizes = get('sizes') || '(max-width: 700px) 92vw, 45vw';
  const cls = get('class') || '';
  const alt = get('alt') ?? '';
  const srcset = meta.widths.map((w) => `/img/${name}-${w}.webp ${w}w`).join(', ');
  const mid = meta.widths[Math.min(1, meta.widths.length - 1)];
  return `<img src="/img/${name}-${mid}.webp" srcset="${srcset}" sizes="${sizes}" width="${meta.w}" height="${meta.h}" alt="${alt}"${cls ? ` class="${cls}"` : ''} style="background:${meta.color}" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}>`;
}

function includes() {
  return {
    name: 'brewbery-includes',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const withPartials = html.replace(/<!--\s*@include\s+([\w./-]+)\s*-->/g, (_, file) =>
          fs.readFileSync(path.resolve(file), 'utf8'));
        return withPartials.replace(/<x-img\b([^>]*?)\/?>/g, (_, attrs) => expandImg(attrs));
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.includes(`${path.sep}sections${path.sep}`) || file.endsWith('.html')) server.ws.send({ type: 'full-reload' });
    },
  };
}

// Inline the (small, ~16 KB gzip) stylesheet into the HTML at build time: saves a render-blocking round trip.
function inlineCss() {
  return {
    name: 'brewbery-inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = Object.values(bundle).find((f) => f.fileName === 'index.html');
      if (!html) return;
      let source = String(html.source);
      for (const [name, file] of Object.entries(bundle)) {
        if (!name.endsWith('.css')) continue;
        const tag = new RegExp(`<link rel="stylesheet"[^>]*href="/${name.replace(/[.]/g, '\\.')}"[^>]*>`);
        if (!tag.test(source)) continue;
        source = source.replace(tag, () => `<style>${file.source}</style>`);
        delete bundle[name];
      }
      html.source = source;
    },
  };
}

export default defineConfig({
  plugins: [includes(), inlineCss()],
  build: { target: 'es2020', cssCodeSplit: true, assetsInlineLimit: 2048 },
});
