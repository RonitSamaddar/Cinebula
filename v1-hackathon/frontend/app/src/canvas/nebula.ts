/**
 * Nebula Canvas — Pre-rendered category-colored nebula background
 * 
 * Renders once to an offscreen canvas with tileable wrapping:
 * Each gradient is drawn at 9 positions (3×3 wrap grid) so
 * colors blend seamlessly when the tile repeats.
 */

const NEBULA_CANVAS_W = 1200;
const NEBULA_CANVAS_H = 1200;

export interface CategoryColor {
  key: string;
  accent: string;
  x: number; // normalized 0-1 position on canvas
  y: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// Offsets for 3×3 wrap grid: draw at original + 8 neighboring tile positions
const WRAP_OFFSETS = [
  [0, 0], [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];

function drawWrappedCircle(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  fillStyle: CanvasGradient | string,
  w: number, h: number,
) {
  for (const [ox, oy] of WRAP_OFFSETS) {
    const wx = cx + ox * w;
    const wy = cy + oy * h;
    // Skip if too far to matter
    if (wx + radius < -100 || wx - radius > w + 100) continue;
    if (wy + radius < -100 || wy - radius > h + 100) continue;
    // Re-create gradient at wrapped position
    if (fillStyle instanceof CanvasGradient) {
      ctx.fillStyle = fillStyle;
    } else {
      ctx.fillStyle = fillStyle;
    }
    ctx.beginPath();
    ctx.arc(wx, wy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderNebula(categories: CategoryColor[]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = NEBULA_CANVAS_W;
  canvas.height = NEBULA_CANVAS_H;
  const ctx = canvas.getContext("2d")!;
  const W = NEBULA_CANVAS_W;
  const H = NEBULA_CANVAS_H;

  const rand = seededRandom(137);
  const randRange = (min: number, max: number) => min + rand() * (max - min);

  // Fill transparent black base
  ctx.fillStyle = "rgba(7, 7, 12, 0.01)";
  ctx.fillRect(0, 0, W, H);

  // Main category nebula blobs — drawn at all 9 wrap positions
  for (const cat of categories) {
    const cx = cat.x * W;
    const cy = cat.y * H;
    const radius = randRange(200, 350);

    // Draw primary blob at all wrap positions
    for (const [ox, oy] of WRAP_OFFSETS) {
      const wx = cx + ox * W;
      const wy = cy + oy * H;
      if (wx + radius < -50 || wx - radius > W + 50) continue;
      if (wy + radius < -50 || wy - radius > H + 50) continue;

      const grad = ctx.createRadialGradient(wx, wy, 0, wx, wy, radius);
      grad.addColorStop(0, hexToRgba(cat.accent, 0.25));
      grad.addColorStop(0.3, hexToRgba(cat.accent, 0.12));
      grad.addColorStop(0.6, hexToRgba(cat.accent, 0.04));
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(wx, wy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Secondary offset blob — also wrapped
    const offX = randRange(-80, 80);
    const offY = randRange(-80, 80);
    const r2 = radius * randRange(0.5, 0.8);
    for (const [ox, oy] of WRAP_OFFSETS) {
      const wx = cx + offX + ox * W;
      const wy = cy + offY + oy * H;
      if (wx + r2 < -50 || wx - r2 > W + 50) continue;
      if (wy + r2 < -50 || wy - r2 > H + 50) continue;

      const grad2 = ctx.createRadialGradient(wx, wy, 0, wx, wy, r2);
      grad2.addColorStop(0, hexToRgba(cat.accent, 0.15));
      grad2.addColorStop(0.5, hexToRgba(cat.accent, 0.05));
      grad2.addColorStop(1, "transparent");
      ctx.fillStyle = grad2;
      ctx.beginPath();
      ctx.arc(wx, wy, r2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Filamentary wisps — use shortest wrapped path
  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const c1 = categories[i];
      const c2 = categories[j];
      let x1 = c1.x * W, y1 = c1.y * H;
      let x2 = c2.x * W, y2 = c2.y * H;

      // Find shortest wrapped connection
      let bestDx = x2 - x1, bestDy = y2 - y1;
      let bestDist = bestDx * bestDx + bestDy * bestDy;
      for (const [ox, oy] of WRAP_OFFSETS) {
        if (ox === 0 && oy === 0) continue;
        const dx = x2 + ox * W - x1;
        const dy = y2 + oy * H - y1;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; bestDx = dx; bestDy = dy; }
      }

      const wx2 = x1 + bestDx;
      const wy2 = y1 + bestDy;
      const bridgeGrad = ctx.createLinearGradient(x1, y1, wx2, wy2);
      bridgeGrad.addColorStop(0, hexToRgba(c1.accent, 0.06));
      bridgeGrad.addColorStop(0.5, hexToRgba(c1.accent, 0.02));
      bridgeGrad.addColorStop(0.5, hexToRgba(c2.accent, 0.02));
      bridgeGrad.addColorStop(1, hexToRgba(c2.accent, 0.06));

      const midX = (x1 + wx2) / 2 + randRange(-60, 60);
      const midY = (y1 + wy2) / 2 + randRange(-60, 60);

      ctx.strokeStyle = bridgeGrad;
      ctx.lineWidth = randRange(20, 50);
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(midX, midY, wx2, wy2);
      ctx.stroke();
    }
  }

  // Additional wispy tendrils
  ctx.globalAlpha = 1;
  for (let i = 0; i < 8; i++) {
    const cat = categories[Math.floor(rand() * categories.length)];
    const sx = cat.x * W + randRange(-100, 100);
    const sy = cat.y * H + randRange(-100, 100);
    const angle = randRange(0, Math.PI * 2);
    const len = randRange(80, 200);
    const ex = sx + Math.cos(angle) * len;
    const ey = sy + Math.sin(angle) * len;

    const wispGrad = ctx.createLinearGradient(sx, sy, ex, ey);
    wispGrad.addColorStop(0, hexToRgba(cat.accent, 0.08));
    wispGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = wispGrad;
    ctx.lineWidth = randRange(8, 25);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    const cpx = (sx + ex) / 2 + randRange(-40, 40);
    const cpy = (sy + ey) / 2 + randRange(-40, 40);
    ctx.quadraticCurveTo(cpx, cpy, ex, ey);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  return canvas;
}

export { NEBULA_CANVAS_W, NEBULA_CANVAS_H };
