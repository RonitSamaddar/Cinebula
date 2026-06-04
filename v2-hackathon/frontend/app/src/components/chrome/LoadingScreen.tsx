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
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Alien + Ship (same SVG as AlienCompanion) */}
      <div className="relative flex flex-col items-center" style={{ animation: "float 3s ease-in-out infinite" }}>
        {/* Alien character */}
        <div className="relative" style={{ width: 64, height: 68 }}>
          <svg width="64" height="68" viewBox="0 0 44 46" fill="none">
            <ellipse cx="22" cy="20" rx="14" ry="15" fill="#5cff5c" opacity="0.88" />
            <ellipse cx="10" cy="24" rx="4" ry="2.5" fill="#ff9fcf" opacity="0.2" />
            <ellipse cx="34" cy="24" rx="4" ry="2.5" fill="#ff9fcf" opacity="0.2" />
            <ellipse cx="15" cy="18" rx="5" ry="5.5" fill="#0a2a0a" opacity="0.9" />
            <ellipse cx="29" cy="18" rx="5" ry="5.5" fill="#0a2a0a" opacity="0.9" />
            <circle cx="17" cy="16" r="2" fill="rgba(255,255,255,0.7)" />
            <circle cx="31" cy="16" r="2" fill="rgba(255,255,255,0.7)" />
            <circle cx="13.5" cy="20" r="1" fill="rgba(255,255,255,0.35)" />
            <circle cx="27.5" cy="20" r="1" fill="rgba(255,255,255,0.35)" />
            <path d="M18 27 Q20 29.5 22 27" stroke="#0a2a0a" strokeWidth="1" fill="none" opacity="0.5" />
            <path d="M22 27 Q24 29.5 26 27" stroke="#0a2a0a" strokeWidth="1" fill="none" opacity="0.5" />
            <line x1="13" y1="7" x2="8" y2="0" stroke="#5cff5c" strokeWidth="1.5" opacity="0.7" />
            <circle cx="8" cy="0" r="2.5" fill="#7fff7f" opacity="0.85" />
            <line x1="31" y1="7" x2="36" y2="0" stroke="#5cff5c" strokeWidth="1.5" opacity="0.7" />
            <circle cx="36" cy="0" r="2.5" fill="#7fff7f" opacity="0.85" />
          </svg>
        </div>

        {/* Spaceship */}
        <div className="-mt-3">
          <svg width="128" height="58" viewBox="0 0 96 44" fill="none" style={{ filter: "drop-shadow(0 0 16px rgba(127, 255, 127, 0.3))" }}>
            <ellipse cx="48" cy="28" rx="48" ry="16" fill="url(#loadShipGrad)" opacity="0.9" />
            <ellipse cx="48" cy="25" rx="33" ry="8" fill="none" stroke="rgba(127, 255, 127, 0.3)" strokeWidth="0.8" />
            <circle cx="24" cy="25" r="3" fill="rgba(127, 255, 127, 0.5)" />
            <circle cx="36" cy="24" r="3" fill="rgba(127, 255, 127, 0.6)" />
            <circle cx="48" cy="23.5" r="3.2" fill="rgba(127, 255, 127, 0.65)" />
            <circle cx="60" cy="24" r="3" fill="rgba(127, 255, 127, 0.6)" />
            <circle cx="72" cy="25" r="3" fill="rgba(127, 255, 127, 0.5)" />
            <ellipse cx="48" cy="16" rx="19" ry="16" fill="url(#loadDomeGrad)" opacity="0.55" />
            <ellipse cx="48" cy="42" rx="28" ry="4" fill="rgba(127, 255, 127, 0.12)" />
            <defs>
              <linearGradient id="loadShipGrad" x1="0" y1="14" x2="96" y2="42">
                <stop offset="0" stopColor="#2a2a40" />
                <stop offset="0.5" stopColor="#3d3d5c" />
                <stop offset="1" stopColor="#2a2a40" />
              </linearGradient>
              <radialGradient id="loadDomeGrad" cx="0.5" cy="0.6">
                <stop offset="0" stopColor="rgba(127, 255, 127, 0.18)" />
                <stop offset="1" stopColor="rgba(127, 255, 127, 0.02)" />
              </radialGradient>
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
