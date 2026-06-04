/**
 * Starfield Canvas — Pre-rendered static star background
 * 
 * Renders once to an offscreen canvas:
 * - 900 tiny stars (1px, dim)
 * - 300 medium stars (1.5-2px, moderate glow)
 * - 100 visible stars with soft glow halos
 * - 20 bright stars with cross-spike diffraction
 * - 12 distant galaxies (elliptical smudges)
 * - 1 prominent spiral galaxy
 * - 1 ringed planet
 * - 1 nebula pillar
 * - 1 gas giant
 * - 1 supernova remnant
 * - 1 moon
 * - 1 comet
 * - 1 star cluster
 * - dust lanes
 */

const STAR_CANVAS_W = 1400;
const STAR_CANVAS_H = 1800;

interface StarSeed {
  x: number;
  y: number;
  r: number;
  brightness: number;
  hue: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

export function renderStarfield(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = STAR_CANVAS_W;
  canvas.height = STAR_CANVAS_H;
  const ctx = canvas.getContext("2d")!;

  const rand = seededRandom(42);
  const randRange = (min: number, max: number) => min + rand() * (max - min);
  const randInt = (min: number, max: number) => Math.floor(randRange(min, max + 1));

  // Fill black
  ctx.fillStyle = "#07070c";
  ctx.fillRect(0, 0, STAR_CANVAS_W, STAR_CANVAS_H);

  // Dust lanes — very subtle dark nebula regions (wrapped for seamless tiling)
  for (let i = 0; i < 5; i++) {
    const x = randRange(0, STAR_CANVAS_W);
    const y = randRange(0, STAR_CANVAS_H);
    const dustR = randRange(100, 250);
    const dustAlpha = randRange(0.3, 0.5);
    // Draw at all 9 wrap positions
    for (const ox of [-1, 0, 1]) {
      for (const oy of [-1, 0, 1]) {
        const wx = x + ox * STAR_CANVAS_W;
        const wy = y + oy * STAR_CANVAS_H;
        if (wx + dustR < -50 || wx - dustR > STAR_CANVAS_W + 50) continue;
        if (wy + dustR < -50 || wy - dustR > STAR_CANVAS_H + 50) continue;
        const grad = ctx.createRadialGradient(wx, wy, 0, wx, wy, dustR);
        grad.addColorStop(0, `rgba(3, 3, 8, ${dustAlpha})`);
        grad.addColorStop(1, "rgba(3, 3, 8, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, STAR_CANVAS_W, STAR_CANVAS_H);
      }
    }
  }

  // 900 tiny stars
  const tinyStars: StarSeed[] = [];
  for (let i = 0; i < 900; i++) {
    tinyStars.push({
      x: randRange(0, STAR_CANVAS_W),
      y: randRange(0, STAR_CANVAS_H),
      r: randRange(0.3, 0.8),
      brightness: randRange(0.15, 0.45),
      hue: randInt(180, 280),
    });
  }
  for (const s of tinyStars) {
    ctx.globalAlpha = s.brightness;
    ctx.fillStyle = `hsl(${s.hue}, 20%, 85%)`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 300 medium stars
  for (let i = 0; i < 300; i++) {
    const x = randRange(0, STAR_CANVAS_W);
    const y = randRange(0, STAR_CANVAS_H);
    const r = randRange(0.8, 1.5);
    const brightness = randRange(0.3, 0.7);
    const hue = randInt(0, 360);

    ctx.globalAlpha = brightness;
    ctx.fillStyle = `hsl(${hue}, 30%, 90%)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Subtle glow
    ctx.globalAlpha = brightness * 0.2;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    glow.addColorStop(0, `hsla(${hue}, 40%, 95%, 0.5)`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 100 visible glow stars
  for (let i = 0; i < 100; i++) {
    const x = randRange(0, STAR_CANVAS_W);
    const y = randRange(0, STAR_CANVAS_H);
    const r = randRange(1.2, 2.2);
    const brightness = randRange(0.5, 0.9);
    const hue = randInt(0, 360);

    // Core
    ctx.globalAlpha = brightness;
    ctx.fillStyle = `hsl(${hue}, 20%, 95%)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Halo
    ctx.globalAlpha = brightness * 0.3;
    const halo = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 5);
    halo.addColorStop(0, `hsla(${hue}, 50%, 90%, 0.6)`);
    halo.addColorStop(0.5, `hsla(${hue}, 40%, 80%, 0.15)`);
    halo.addColorStop(1, "transparent");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 20 bright stars with cross-spike diffraction
  for (let i = 0; i < 20; i++) {
    const x = randRange(40, STAR_CANVAS_W - 40);
    const y = randRange(40, STAR_CANVAS_H - 40);
    const r = randRange(1.8, 3);
    const spikeLen = randRange(8, 20);
    const hue = randInt(0, 360);

    // Core
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Glow
    ctx.globalAlpha = 0.5;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
    glow.addColorStop(0, `hsla(${hue}, 60%, 95%, 0.8)`);
    glow.addColorStop(0.3, `hsla(${hue}, 50%, 85%, 0.3)`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 6, 0, Math.PI * 2);
    ctx.fill();

    // Cross spikes
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = `hsla(${hue}, 30%, 95%, 0.6)`;
    ctx.lineWidth = 0.5;
    for (const angle of [0, Math.PI / 2]) {
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(angle) * spikeLen, y - Math.sin(angle) * spikeLen);
      ctx.lineTo(x + Math.cos(angle) * spikeLen, y + Math.sin(angle) * spikeLen);
      ctx.stroke();
    }
  }

  // 12 distant galaxies (elliptical smudges)
  for (let i = 0; i < 12; i++) {
    const x = randRange(60, STAR_CANVAS_W - 60);
    const y = randRange(60, STAR_CANVAS_H - 60);
    const rx = randRange(8, 25);
    const ry = randRange(4, 12);
    const angle = randRange(0, Math.PI);
    const hue = randInt(200, 320);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = randRange(0.06, 0.15);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0, `hsla(${hue}, 50%, 80%, 0.8)`);
    grad.addColorStop(0.5, `hsla(${hue}, 40%, 60%, 0.3)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.scale(1, ry / rx);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 1 prominent spiral galaxy — BIGGER
  {
    const gx = randRange(200, STAR_CANVAS_W - 200);
    const gy = randRange(200, STAR_CANVAS_H - 200);
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(randRange(0, Math.PI));

    // Core glow — larger, brighter
    ctx.globalAlpha = 0.2;
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 90);
    core.addColorStop(0, "rgba(220, 200, 255, 0.9)");
    core.addColorStop(0.2, "rgba(200, 180, 255, 0.5)");
    core.addColorStop(0.5, "rgba(180, 160, 240, 0.2)");
    core.addColorStop(1, "transparent");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.fill();

    // Spiral arms — thicker, longer
    ctx.globalAlpha = 0.1;
    for (let arm = 0; arm < 2; arm++) {
      const armOffset = arm * Math.PI;
      ctx.beginPath();
      for (let t = 0; t < 5 * Math.PI; t += 0.08) {
        const r2 = 8 + t * 14;
        const px = Math.cos(t + armOffset) * r2;
        const py = Math.sin(t + armOffset) * r2 * 0.55;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "rgba(200, 180, 255, 0.5)";
      ctx.lineWidth = randRange(3, 6);
      ctx.stroke();
    }

    // Arm star dots
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 60; i++) {
      const t = randRange(0, 5 * Math.PI);
      const arm2 = Math.floor(rand() * 2) * Math.PI;
      const r2 = 8 + t * 14 + randRange(-10, 10);
      const px = Math.cos(t + arm2) * r2;
      const py = Math.sin(t + arm2) * r2 * 0.55;
      ctx.fillStyle = `hsla(${randInt(240, 300)}, 50%, ${randInt(80, 95)}%, 0.8)`;
      ctx.beginPath();
      ctx.arc(px, py, randRange(0.5, 1.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 1 ringed planet — BIGGER, more prominent
  {
    const px = randRange(150, STAR_CANVAS_W - 150);
    const py = randRange(150, STAR_CANVAS_H - 150);
    const pr = randRange(18, 30);

    // Atmosphere glow
    ctx.globalAlpha = 0.08;
    const atmosGrad = ctx.createRadialGradient(px, py, pr, px, py, pr * 2);
    atmosGrad.addColorStop(0, "rgba(200, 180, 140, 0.3)");
    atmosGrad.addColorStop(1, "transparent");
    ctx.fillStyle = atmosGrad;
    ctx.beginPath();
    ctx.arc(px, py, pr * 2, 0, Math.PI * 2);
    ctx.fill();

    // Planet body
    ctx.globalAlpha = 0.25;
    const planetGrad = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, 0, px, py, pr);
    planetGrad.addColorStop(0, "#C4A870");
    planetGrad.addColorStop(0.6, "#8B7355");
    planetGrad.addColorStop(1, "#3A2818");
    ctx.fillStyle = planetGrad;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();

    // Surface bands
    ctx.globalAlpha = 0.1;
    for (let b = -pr * 0.7; b < pr * 0.7; b += pr * 0.2) {
      const halfW = Math.sqrt(pr * pr - b * b);
      ctx.strokeStyle = `rgba(${randInt(180, 220)}, ${randInt(150, 180)}, ${randInt(100, 140)}, 0.4)`;
      ctx.lineWidth = randRange(1.5, 3);
      ctx.beginPath();
      ctx.moveTo(px - halfW, py + b);
      ctx.quadraticCurveTo(px, py + b + randRange(-2, 2), px + halfW, py + b);
      ctx.stroke();
    }

    // Ring
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, 0.3);
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "rgba(220, 200, 160, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, pr * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, pr * 2.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.06;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, pr * 2.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 1 gas giant — BIGGER Jupiter-like
  {
    const gx2 = randRange(150, STAR_CANVAS_W - 150);
    const gy2 = randRange(STAR_CANVAS_H * 0.5, STAR_CANVAS_H - 150);
    const gr = randRange(22, 35);

    // Atmosphere glow
    ctx.globalAlpha = 0.06;
    const atmosGrad2 = ctx.createRadialGradient(gx2, gy2, gr, gx2, gy2, gr * 1.8);
    atmosGrad2.addColorStop(0, "rgba(200, 160, 100, 0.4)");
    atmosGrad2.addColorStop(1, "transparent");
    ctx.fillStyle = atmosGrad2;
    ctx.beginPath();
    ctx.arc(gx2, gy2, gr * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Planet body
    ctx.globalAlpha = 0.2;
    const gjGrad = ctx.createRadialGradient(gx2 - gr * 0.2, gy2 - gr * 0.2, 0, gx2, gy2, gr);
    gjGrad.addColorStop(0, "#D4A56A");
    gjGrad.addColorStop(0.4, "#C4956A");
    gjGrad.addColorStop(0.7, "#9B6B3F");
    gjGrad.addColorStop(1, "#5C3D22");
    ctx.fillStyle = gjGrad;
    ctx.beginPath();
    ctx.arc(gx2, gy2, gr, 0, Math.PI * 2);
    ctx.fill();

    // Bands — more visible
    ctx.globalAlpha = 0.12;
    for (let b = -gr * 0.8; b < gr * 0.8; b += gr * 0.15) {
      const halfW = Math.sqrt(Math.max(0, gr * gr - b * b));
      ctx.strokeStyle = `rgba(${randInt(160, 220)}, ${randInt(100, 160)}, ${randInt(50, 100)}, 0.5)`;
      ctx.lineWidth = randRange(1.5, 3);
      ctx.beginPath();
      ctx.moveTo(gx2 - halfW, gy2 + b);
      ctx.quadraticCurveTo(gx2, gy2 + b + randRange(-1.5, 1.5), gx2 + halfW, gy2 + b);
      ctx.stroke();
    }

    // Great Red Spot
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = "#C4654A";
    ctx.beginPath();
    ctx.ellipse(gx2 + gr * 0.3, gy2 + gr * 0.15, gr * 0.18, gr * 0.12, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 1 nebula pillar — BIGGER, more visible
  {
    const nx = randRange(STAR_CANVAS_W * 0.6, STAR_CANVAS_W - 120);
    const ny = randRange(120, STAR_CANVAS_H * 0.4);
    ctx.globalAlpha = 0.12;
    const nGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny + 80, 150);
    nGrad.addColorStop(0, "rgba(130, 70, 180, 0.6)");
    nGrad.addColorStop(0.3, "rgba(100, 50, 160, 0.3)");
    nGrad.addColorStop(0.7, "rgba(80, 40, 120, 0.1)");
    nGrad.addColorStop(1, "transparent");
    ctx.fillStyle = nGrad;
    ctx.beginPath();
    ctx.ellipse(nx, ny + 40, 55, 120, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    ctx.globalAlpha = 0.06;
    const nGrad2 = ctx.createRadialGradient(nx, ny + 20, 0, nx, ny + 20, 40);
    nGrad2.addColorStop(0, "rgba(200, 150, 255, 0.5)");
    nGrad2.addColorStop(1, "transparent");
    ctx.fillStyle = nGrad2;
    ctx.beginPath();
    ctx.arc(nx, ny + 20, 40, 0, Math.PI * 2);
    ctx.fill();
  }

  // 1 supernova remnant — BIGGER
  {
    const sx = randRange(100, STAR_CANVAS_W - 100);
    const sy = randRange(STAR_CANVAS_H * 0.6, STAR_CANVAS_H - 100);
    const snr = 55;

    ctx.globalAlpha = 0.12;
    const snGrad = ctx.createRadialGradient(sx, sy, 3, sx, sy, snr);
    snGrad.addColorStop(0, "rgba(255, 220, 220, 0.7)");
    snGrad.addColorStop(0.15, "rgba(255, 150, 150, 0.4)");
    snGrad.addColorStop(0.4, "rgba(200, 100, 100, 0.2)");
    snGrad.addColorStop(0.7, "rgba(100, 50, 150, 0.08)");
    snGrad.addColorStop(1, "transparent");
    ctx.fillStyle = snGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, snr, 0, Math.PI * 2);
    ctx.fill();

    // Filament wisps
    ctx.globalAlpha = 0.06;
    for (let f = 0; f < 8; f++) {
      const fa = randRange(0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${randInt(200, 255)}, ${randInt(80, 150)}, ${randInt(80, 200)}, 0.4)`;
      ctx.lineWidth = randRange(0.5, 1.5);
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(fa) * 8, sy + Math.sin(fa) * 8);
      ctx.quadraticCurveTo(
        sx + Math.cos(fa + 0.3) * snr * 0.6,
        sy + Math.sin(fa + 0.3) * snr * 0.6,
        sx + Math.cos(fa) * snr * 0.9,
        sy + Math.sin(fa) * snr * 0.9,
      );
      ctx.stroke();
    }
  }

  // 1 moon — BIGGER
  {
    const mx = randRange(80, STAR_CANVAS_W - 80);
    const my = randRange(80, STAR_CANVAS_H * 0.3);
    const mr = randRange(10, 16);

    // Moon glow
    ctx.globalAlpha = 0.06;
    const moonGlow = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 2.5);
    moonGlow.addColorStop(0, "rgba(230, 220, 200, 0.3)");
    moonGlow.addColorStop(1, "transparent");
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(mx, my, mr * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Moon body
    ctx.globalAlpha = 0.2;
    const moonGrad = ctx.createRadialGradient(mx - mr * 0.35, my - mr * 0.35, 0, mx, my, mr);
    moonGrad.addColorStop(0, "#F0E8D8");
    moonGrad.addColorStop(0.7, "#B0A890");
    moonGrad.addColorStop(1, "#706858");
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();

    // Craters
    ctx.globalAlpha = 0.08;
    for (let c = 0; c < 4; c++) {
      const ca = randRange(0, Math.PI * 2);
      const cd = randRange(mr * 0.2, mr * 0.7);
      const cr = randRange(mr * 0.08, mr * 0.18);
      ctx.fillStyle = "rgba(80, 70, 60, 0.4)";
      ctx.beginPath();
      ctx.arc(mx + Math.cos(ca) * cd, my + Math.sin(ca) * cd, cr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 1 ice giant planet — NEW extra planet
  {
    const ix = randRange(120, STAR_CANVAS_W - 120);
    const iy = randRange(STAR_CANVAS_H * 0.3, STAR_CANVAS_H * 0.6);
    const ir = randRange(16, 24);

    // Atmosphere
    ctx.globalAlpha = 0.06;
    const iceAtmos = ctx.createRadialGradient(ix, iy, ir, ix, iy, ir * 1.8);
    iceAtmos.addColorStop(0, "rgba(100, 180, 220, 0.3)");
    iceAtmos.addColorStop(1, "transparent");
    ctx.fillStyle = iceAtmos;
    ctx.beginPath();
    ctx.arc(ix, iy, ir * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.globalAlpha = 0.18;
    const iceGrad = ctx.createRadialGradient(ix - ir * 0.2, iy - ir * 0.2, 0, ix, iy, ir);
    iceGrad.addColorStop(0, "#8ECAE6");
    iceGrad.addColorStop(0.5, "#5AA0C0");
    iceGrad.addColorStop(1, "#2A5070");
    ctx.fillStyle = iceGrad;
    ctx.beginPath();
    ctx.arc(ix, iy, ir, 0, Math.PI * 2);
    ctx.fill();

    // Subtle bands
    ctx.globalAlpha = 0.06;
    for (let b = -ir * 0.6; b < ir * 0.6; b += ir * 0.25) {
      const halfW = Math.sqrt(Math.max(0, ir * ir - b * b));
      ctx.strokeStyle = `rgba(${randInt(100, 160)}, ${randInt(180, 220)}, ${randInt(220, 255)}, 0.4)`;
      ctx.lineWidth = randRange(1, 2);
      ctx.beginPath();
      ctx.moveTo(ix - halfW, iy + b);
      ctx.lineTo(ix + halfW, iy + b);
      ctx.stroke();
    }
  }

  // 3 comets — MORE, BIGGER tails
  for (let ci = 0; ci < 3; ci++) {
    const cx = randRange(80, STAR_CANVAS_W - 80);
    const cy = randRange(80, STAR_CANVAS_H - 80);
    const cAngle = randRange(0.3, 1.2) + ci * 0.8;
    const tailLen = randRange(80, 150);
    const headR = randRange(2.5, 4);

    // Head glow
    ctx.globalAlpha = 0.08;
    const headGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, headR * 5);
    headGlow.addColorStop(0, "rgba(200, 230, 255, 0.5)");
    headGlow.addColorStop(1, "transparent");
    ctx.fillStyle = headGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, headR * 5, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#ddeeff";
    ctx.beginPath();
    ctx.arc(cx, cy, headR, 0, Math.PI * 2);
    ctx.fill();

    // Tail — wider, longer
    ctx.globalAlpha = 0.15;
    const tailEndX = cx + Math.cos(cAngle) * tailLen;
    const tailEndY = cy + Math.sin(cAngle) * tailLen;
    const grad = ctx.createLinearGradient(cx, cy, tailEndX, tailEndY);
    grad.addColorStop(0, "rgba(180, 210, 255, 0.5)");
    grad.addColorStop(0.4, "rgba(150, 190, 240, 0.2)");
    grad.addColorStop(1, "transparent");
    ctx.strokeStyle = grad;
    ctx.lineWidth = randRange(2, 4);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(
      cx + Math.cos(cAngle + 0.1) * tailLen * 0.5,
      cy + Math.sin(cAngle + 0.1) * tailLen * 0.5,
      tailEndX, tailEndY
    );
    ctx.stroke();

    // Secondary dust tail
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = "rgba(200, 180, 150, 0.3)";
    ctx.lineWidth = randRange(3, 6);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(
      cx + Math.cos(cAngle + 0.3) * tailLen * 0.4,
      cy + Math.sin(cAngle + 0.3) * tailLen * 0.4,
      cx + Math.cos(cAngle + 0.2) * tailLen * 0.8,
      cy + Math.sin(cAngle + 0.2) * tailLen * 0.8,
    );
    ctx.stroke();
  }

  // 1 star cluster — DENSER
  {
    const clx = randRange(200, STAR_CANVAS_W - 200);
    const cly = randRange(200, STAR_CANVAS_H - 200);

    // Cluster glow
    ctx.globalAlpha = 0.05;
    const clGlow = ctx.createRadialGradient(clx, cly, 0, clx, cly, 45);
    clGlow.addColorStop(0, "rgba(200, 210, 255, 0.4)");
    clGlow.addColorStop(1, "transparent");
    ctx.fillStyle = clGlow;
    ctx.beginPath();
    ctx.arc(clx, cly, 45, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 60; i++) {
      const angle2 = randRange(0, Math.PI * 2);
      const dist = randRange(0, 40) ** 0.7;
      const sx2 = clx + Math.cos(angle2) * dist;
      const sy2 = cly + Math.sin(angle2) * dist;
      ctx.globalAlpha = randRange(0.3, 0.9);
      ctx.fillStyle = `hsl(${randInt(200, 240)}, 40%, ${randInt(80, 95)}%)`;
      ctx.beginPath();
      ctx.arc(sx2, sy2, randRange(0.5, 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  return canvas;
}

export { STAR_CANVAS_W, STAR_CANVAS_H };
