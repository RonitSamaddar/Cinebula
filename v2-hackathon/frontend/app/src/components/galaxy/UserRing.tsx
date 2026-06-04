/**
 * UserRing — Centered ring showing "YOU ARE HERE" with spinning dashed border.
 */

"use client";

export default function UserRing() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ zIndex: 3, width: 88, height: 88 }}
    >
      {/* Spinning dashed ring */}
      <svg
        width={88}
        height={88}
        className="absolute inset-0"
        style={{ animation: "spin 20s linear infinite" }}
      >
        <circle
          cx={44}
          cy={44}
          r={40}
          fill="none"
          stroke="rgba(244, 235, 217, 0.15)"
          strokeWidth={1}
          strokeDasharray="6 4"
        />
      </svg>
      {/* YOU label */}
      <span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-[0.3em] text-[#f4ebd9]"
        style={{ opacity: 0.3 }}
      >
        YOU
      </span>
    </div>
  );
}
