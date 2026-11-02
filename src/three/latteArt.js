import { CanvasTexture, SRGBColorSpace } from 'three';

// Procedurally painted rosetta for the latte surface. Drawn once into a small
// canvas so there is no image request and the texture costs ~1MB of VRAM.
const SIZE = 512;
const C = SIZE / 2;
const FOAM = '#f6ead6';

function paintCrema(ctx) {
  const g = ctx.createRadialGradient(C, C * 0.95, 20, C, C, C);
  g.addColorStop(0, '#9a6040');
  g.addColorStop(0.62, '#7e4a2a');
  g.addColorStop(0.9, '#5e321a');
  g.addColorStop(1, '#3f2010');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  // fine crema speckle so the surface does not read as flat plastic
  for (let i = 0; i < 900; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * C;
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '240,200,150' : '60,28,10'},${0.05 + Math.random() * 0.08})`;
    ctx.fillRect(C + Math.cos(a) * r, C + Math.sin(a) * r, 2, 2);
  }
}

// One rosetta leaf: a thick arch whose ends droop, like milk folded by a wiggling pitcher.
function leaf(ctx, cy, w, thick) {
  ctx.lineWidth = thick;
  ctx.beginPath();
  ctx.ellipse(C, cy + w * 0.55, w, w * 0.62, 0, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
}

function heart(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.4, cy, cx - s * 0.9, cy - s * 1.1, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.1, cx + s * 1.4, cy, cx, cy + s * 0.9);
  ctx.fill();
}

function paintRosetta(ctx) {
  ctx.fillStyle = FOAM;
  ctx.strokeStyle = FOAM;
  ctx.lineCap = 'round';
  ctx.filter = 'blur(1.4px)';
  const leaves = 9;
  for (let i = 0; i < leaves; i++) {
    const k = i / (leaves - 1);
    leaf(ctx, 400 - i * 29, 190 - k * 120, 17 - k * 6);
  }
  heart(ctx, C, 128, 40);
  // the pull through: a thin tapering line dragged from the heart down through every leaf
  ctx.strokeStyle = 'rgba(246, 234, 214, 0.9)';
  for (let y = 140; y < 452; y += 8) {
    ctx.lineWidth = 1.2 + ((y - 140) / 312) * 3;
    ctx.beginPath();
    ctx.moveTo(C, y);
    ctx.lineTo(C, y + 9);
    ctx.stroke();
  }
  ctx.filter = 'none';
}

export function createLatteTexture(maxAnisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  paintCrema(ctx);
  paintRosetta(ctx);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}
