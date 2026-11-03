// Builds public/og.jpg (1200x630 link preview): photo background, espresso gradient, logo overlay.
const sharp = require('sharp');
const [W, H] = [1200, 630];
const BG = process.argv[2] || 'raw/40.png';
(async () => {
  const bg = await sharp(BG).resize(W, H, { fit: 'cover', position: 'attention' }).modulate({ saturation: 1.08 }).toBuffer();
  const gradient = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#0e0907" stop-opacity="0.92"/>
        <stop offset="0.42" stop-color="#0e0907" stop-opacity="0.72"/>
        <stop offset="0.75" stop-color="#0e0907" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#0e0907" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.6" stop-color="#0e0907" stop-opacity="0"/>
        <stop offset="1" stop-color="#0e0907" stop-opacity="0.55"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.24" cy="0.46" r="0.42">
        <stop offset="0" stop-color="#c8945a" stop-opacity="0.28"/>
        <stop offset="1" stop-color="#c8945a" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect width="100%" height="100%" fill="url(#v)"/>
    <rect width="100%" height="100%" fill="url(#glow)"/>
    <text x="80" y="470" font-family="Georgia, serif" font-style="italic" font-size="34" fill="#e2b47c">Brew and Bakery Kitchenette</text>
    <text x="80" y="520" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#f6efe3" fill-opacity="0.78">Coffee, pastries, cakes and barista training</text>
  </svg>`);
  const logo = await sharp('public/img/logo-light.png').resize({ width: 480 }).toBuffer();
  await sharp(bg)
    .composite([{ input: gradient }, { input: logo, left: 72, top: 150 }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile('public/og.jpg');
  console.log('og.jpg written');
})();
