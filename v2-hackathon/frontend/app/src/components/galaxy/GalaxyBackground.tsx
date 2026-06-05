"use client";

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef, useState } from "react";
import { renderStarfield, STAR_CANVAS_W, STAR_CANVAS_H } from "@/canvas/starfield";
import { renderNebula, NEBULA_CANVAS_W, NEBULA_CANVAS_H, type CategoryColor } from "@/canvas/nebula";
import { EffectsRenderer } from "@/canvas/effects";
import { CATEGORIES } from "@/data/categories";

const NEBULA_CATEGORIES: CategoryColor[] = CATEGORIES.map((cat) => ({
  key: cat.key,
  accent: cat.accent,
  x: cat.position.x,
  y: cat.position.y,
}));

const WORLD_W = 1600;
const WORLD_H = 2200;
const STAR_PARALLAX = 0.15;
const NEBULA_PARALLAX = 0.12;

const CAT_RGB = NEBULA_CATEGORIES.map((c) => ({
  r: parseInt(c.accent.slice(1, 3), 16),
  g: parseInt(c.accent.slice(3, 5), 16),
  b: parseInt(c.accent.slice(5, 7), 16),
  wx: c.x * WORLD_W,
  wy: c.y * WORLD_H,
}));

function wrapDist(cam: number, pos: number, size: number): number {
  let d = pos - cam;
  if (d > size / 2) d -= size;
  if (d < -size / 2) d += size;
  return d;
}

export interface GalaxyHandle {
  update: (cx: number, cy: number) => void;
}

const GalaxyBackground = forwardRef<GalaxyHandle>(function GalaxyBackground(_, ref) {
  const starDivRef = useRef<HTMLDivElement>(null);
  const nebulaDivRef = useRef<HTMLDivElement>(null);
  const glowDivRef = useRef<HTMLDivElement>(null);
  const effectsCanvasRef = useRef<HTMLCanvasElement>(null);
  const effectsRendererRef = useRef<EffectsRenderer | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(
      "ontouchstart" in window || navigator.maxTouchPoints > 0
    );
  }, []);

  useImperativeHandle(ref, () => ({
    update(cx: number, cy: number) {
      // cx/cy are raw unwrapped — use directly for background-position
      // (CSS background-repeat tiles seamlessly at any offset)
      if (starDivRef.current) {
        starDivRef.current.style.backgroundPosition =
          `${-(cx * STAR_PARALLAX)}px ${-(cy * STAR_PARALLAX)}px`;
      }
      if (nebulaDivRef.current) {
        nebulaDivRef.current.style.backgroundPosition =
          `${-(cx * NEBULA_PARALLAX)}px ${-(cy * NEBULA_PARALLAX)}px`;
      }
      if (glowDivRef.current) {
        // Glow uses wrapped camera for shortest-distance-to-category math
        const wcx = ((cx % WORLD_W) + WORLD_W) % WORLD_W;
        const wcy = ((cy % WORLD_H) + WORLD_H) % WORLD_H;
        let tw = 0, r = 0, g = 0, b = 0;
        for (const c of CAT_RGB) {
          const dx = wrapDist(wcx, c.wx, WORLD_W);
          const dy = wrapDist(wcy, c.wy, WORLD_H);
          const w = 1 / (1 + (dx * dx + dy * dy) * 0.00001);
          r += c.r * w; g += c.g * w; b += c.b * w; tw += w;
        }
        glowDivRef.current.style.background =
          `radial-gradient(circle, rgba(${Math.round(r / tw)},${Math.round(g / tw)},${Math.round(b / tw)},0.15) 0%, transparent 70%)`;
      }
    },
  }));

  const initCanvases = useCallback(() => {
    const starCanvas = renderStarfield();
    if (starDivRef.current) {
      starDivRef.current.style.backgroundImage = `url(${starCanvas.toDataURL("image/png")})`;
    }
    const nebulaCanvas = renderNebula(NEBULA_CATEGORIES);
    if (nebulaDivRef.current) {
      nebulaDivRef.current.style.backgroundImage = `url(${nebulaCanvas.toDataURL("image/png")})`;
    }
    // Skip effects canvas on mobile to save GPU
    if (!isMobile) {
      const effectsCanvas = effectsCanvasRef.current;
      if (effectsCanvas) {
        const dpr = window.devicePixelRatio || 1;
        effectsCanvas.width = window.innerWidth * dpr;
        effectsCanvas.height = window.innerHeight * dpr;
        effectsCanvas.style.width = `${window.innerWidth}px`;
        effectsCanvas.style.height = `${window.innerHeight}px`;
        const ctx = effectsCanvas.getContext("2d");
        if (ctx) ctx.scale(dpr, dpr);
        const renderer = new EffectsRenderer();
        renderer.init(effectsCanvas);
        renderer.start();
        effectsRendererRef.current = renderer;
      }
    }
  }, [isMobile]);

  useEffect(() => {
    initCanvases();
    const handleResize = () => {
      const c = effectsCanvasRef.current;
      if (c && effectsRendererRef.current) {
        const dpr = window.devicePixelRatio || 1;
        c.style.width = `${window.innerWidth}px`;
        c.style.height = `${window.innerHeight}px`;
        effectsRendererRef.current.resize(window.innerWidth * dpr, window.innerHeight * dpr);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      effectsRendererRef.current?.stop();
    };
  }, [initCanvases]);

  return (
    <>
      <div
        ref={starDivRef}
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 0,
          backgroundRepeat: "repeat",
          backgroundSize: `${STAR_CANVAS_W}px ${STAR_CANVAS_H}px`,
          willChange: "background-position",
          animation: "galaxy-breathe 6s ease-in-out infinite",
        }}
      />
      <div
        ref={nebulaDivRef}
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 0,
          backgroundRepeat: "repeat",
          backgroundSize: `${NEBULA_CANVAS_W}px ${NEBULA_CANVAS_H}px`,
          filter: isMobile ? "blur(15px)" : "blur(30px)",
          WebkitFilter: isMobile ? "blur(15px)" : "blur(30px)",
          opacity: 0.7,
          willChange: "background-position",
        }}
      />
      <div
        ref={glowDivRef}
        className="pointer-events-none absolute"
        style={{
          zIndex: 1,
          width: 600, height: 600,
          left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(181,108,255,0.15) 0%, transparent 70%)",
          filter: isMobile ? "blur(25px)" : "blur(60px)",
          WebkitFilter: isMobile ? "blur(25px)" : "blur(60px)",
          opacity: 0.38,
        }}
      />
      {/* Effects canvas — only rendered on desktop */}
      {!isMobile && (
        <canvas
          ref={effectsCanvasRef}
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: 1 }}
        />
      )}
    </>
  );
});

export default GalaxyBackground;
