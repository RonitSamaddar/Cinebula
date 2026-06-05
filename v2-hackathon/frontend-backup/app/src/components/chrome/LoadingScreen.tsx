"use client";

import { useEffect, useState } from "react";

const LOADING_TEXTS = [
  "Charting your cosmic preferences...",
  "Scanning nebulae for hidden gems...",
  "Calibrating taste algorithms...",
  "Mapping your entertainment galaxy...",
  "Discovering stellar recommendations...",
  "Aligning content constellations...",
  "Probing dimensions for perfect matches...",
];

const LOADING_DURATION = 15000; // 15 seconds

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [textIdx, setTextIdx] = useState(0);

  // Animate progress bar — eases toward 95% over duration, never visually "finishes"
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const linear = Math.min(1, elapsed / LOADING_DURATION);
      // Ease-out: fast at start, slows down near end, caps at 95%
      setProgress(linear * 0.95);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Cycle through loading texts
  useEffect(() => {
    const interval = setInterval(() => {
      setTextIdx((i) => (i + 1) % LOADING_TEXTS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#07070c]">
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        {Array.from({ length: 40 }).map((_, i) => {
          // Deterministic pseudo-random using index to avoid hydration mismatch
          const seed = (i * 7 + 13) % 40;
          const size = (seed % 3) + 1;
          const left = ((i * 17 + 5) % 100);
          const top = ((i * 23 + 11) % 100);
          const dur = 2 + (seed % 3);
          const delay = (i % 5) * 0.4;
          return (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: size,
                height: size,
                left: `${left}%`,
                top: `${top}%`,
                animation: `twinkle ${dur}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* Alien + Ship (same SVG as AlienCompanion) */}
      <div className="relative flex flex-col items-center" style={{ animation: "float 3s ease-in-out infinite" }}>
        {/* Alien character */}
        <div className="relative" style={{ width: 78, height: 75 }}>
          <svg width="78" height="75" viewBox="0 -4 60 62" fill="none" style={{ overflow: "visible" }}>
            {/* Antennae */}
            <line x1="18" y1="8" x2="12" y2="0" stroke="#5cff5c" strokeWidth="1.8" opacity="0.7" />
            <circle cx="12" cy="0" r="2.5" fill="#7fff7f" opacity="0.85" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
            <line x1="42" y1="8" x2="48" y2="0" stroke="#5cff5c" strokeWidth="1.8" opacity="0.7" />
            <circle cx="48" cy="0" r="2.5" fill="#7fff7f" opacity="0.85" style={{ animation: "pulse-dot 2s ease-in-out infinite 0.5s" }} />

            {/* Head — round, green */}
            <ellipse cx="30" cy="18" rx="14" ry="14" fill="#5cff5c" opacity="0.9" />

            {/* Eyes — large, dark */}
            <ellipse cx="24" cy="16" rx="4.5" ry="5" fill="#0a2a0a" opacity="0.9" />
            <ellipse cx="36" cy="16" rx="4.5" ry="5" fill="#0a2a0a" opacity="0.9" />
            {/* Eye shine */}
            <circle cx="25.5" cy="14.5" r="1.8" fill="rgba(255,255,255,0.7)" />
            <circle cx="37.5" cy="14.5" r="1.8" fill="rgba(255,255,255,0.7)" />

            {/* Mouth — gentle smile */}
            <path d="M25 24 Q30 27 35 24" stroke="#0a2a0a" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />

            {/* Body / Torso — dark blue t-shirt */}
            <rect x="16" y="30" width="28" height="24" rx="6" fill="#1a2744" opacity="0.95" />
            <path d="M22 30 Q30 33 38 30" stroke="#2a3a5c" strokeWidth="0.8" fill="none" />
          </svg>
        </div>

        {/* Spaceship — flat saucer below */}
        <div className="-mt-3">
          <svg width="125" height="50" viewBox="0 0 96 40" fill="none" style={{ filter: "drop-shadow(0 0 16px rgba(127, 255, 127, 0.3))" }}>
            <ellipse cx="48" cy="14" rx="48" ry="14" fill="url(#loadShipGrad)" opacity="0.9" />
            <circle cx="20" cy="12" r="2.5" fill="rgba(127, 255, 127, 0.5)" />
            <circle cx="34" cy="10" r="2.5" fill="rgba(127, 255, 127, 0.6)" />
            <circle cx="48" cy="9.5" r="3" fill="rgba(127, 255, 127, 0.65)" />
            <circle cx="62" cy="10" r="2.5" fill="rgba(127, 255, 127, 0.6)" />
            <circle cx="76" cy="12" r="2.5" fill="rgba(127, 255, 127, 0.5)" />
            {/* Thrust */}
            <ellipse cx="48" cy="28" rx="18" ry="3" fill="rgba(127, 255, 127, 0.25)" />
            <ellipse cx="48" cy="32" rx="12" ry="2.5" fill="rgba(127, 255, 127, 0.15)" />
            <ellipse cx="48" cy="36" rx="7" ry="2" fill="rgba(127, 255, 127, 0.08)" />
            <defs>
              <linearGradient id="loadShipGrad" x1="0" y1="0" x2="96" y2="28">
                <stop offset="0" stopColor="#2a2a40" />
                <stop offset="0.5" stopColor="#3d3d5c" />
                <stop offset="1" stopColor="#2a2a40" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Speed lines — horizontal dotted lines moving backward */}
        <div className="relative mt-2 h-14 w-72 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-[1.5px]"
              style={{
                top: `${5 + i * 12}%`,
                left: 0,
                right: 0,
                background: `repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(127,255,127,${0.2 + i * 0.06}) 6px, rgba(127,255,127,${0.2 + i * 0.06}) 14px)`,
                animation: `speedLines ${0.6 + i * 0.12}s linear infinite`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Loading text */}
      <p
        className="mt-10 text-center font-mono text-sm tracking-wider text-white/60"
        style={{ animation: "breathe 2.5s ease-in-out infinite" }}
      >
        {LOADING_TEXTS[textIdx]}
      </p>

      {/* Progress bar */}
      <div className="mt-6 w-56 overflow-hidden rounded-full" style={{ height: 4, background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-100 ease-linear"
          style={{
            width: `${progress * 100}%`,
            background: "linear-gradient(90deg, #5cff5c, #7fff7f)",
            boxShadow: "0 0 8px rgba(127,255,127,0.4)",
          }}
        />
      </div>
      <p className="mt-2 font-mono text-[10px] text-white/30">
        {Math.round(progress * 100)}%
      </p>

      {/* Inline keyframes */}
      <style jsx>{`
        @keyframes speedLines {
          0% { transform: translateX(0); }
          100% { transform: translateX(-28px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
