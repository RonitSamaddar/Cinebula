/**
 * RecDialog — Full-screen recommendation overlay with 3 personalized picks.
 * Triggered by tapping alien's rec bubble.
 */

"use client";

import { useMemo, useState } from "react";
import type { Show } from "@/types";
import { CATEGORIES } from "@/data/categories";
import { useQueueStore } from "@/stores/queue-store";
import { useSessionStore } from "@/stores/session-store";
import { getRecommendations, type Recommendation } from "@/lib/recommendations";

interface RecDialogProps {
  shows: Show[];
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  watched: "FROM YOUR HISTORY",
  trending: "TRENDING NOW",
  "hidden-gem": "HIDDEN GEM",
  wildcard: "DEEP CUT",
};

function RecCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false);
  const isQueued = useQueueStore((s) => s.items.some((i) => i.id === rec.show.id));
  const addToQueue = useQueueStore((s) => s.add);
  const removeFromQueue = useQueueStore((s) => s.remove);
  const cat = CATEGORIES.find((c) => c.key === rec.show.category);
  const accent = cat?.accent || "#fff";
  const label = TYPE_LABELS[rec.type];

  const handleQueue = () => {
    if (isQueued) {
      removeFromQueue(rec.show.id);
    } else {
      addToQueue(rec.show);
    }
  };

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl transition-all duration-200"
      style={{
        background: "rgba(14, 12, 24, 0.95)",
        border: `1px solid ${accent}30`,
        boxShadow: `0 0 20px 2px ${accent}10`,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Compact row */}
      <div className="flex flex-row" style={{ minHeight: 160 }}>
        {/* Poster (left, portrait) */}
        <div
          className="relative shrink-0 overflow-hidden"
          style={{
            width: expanded ? 120 : 100,
            background: rec.show.gradient || `linear-gradient(135deg, ${accent}40, ${accent}10)`,
            transition: "width 200ms ease",
          }}
        >
          {rec.show.poster && (
            <img
              src={rec.show.poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {/* Match badge */}
          <div
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 font-mono text-[8px] font-bold text-white"
            style={{ background: `${accent}cc` }}
          >
            {rec.show.match}%
          </div>
        </div>

        {/* Text content (right) */}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-2.5 px-3">
          {/* Type badge */}
          <div className="flex items-center">
            <span
              className="text-[8px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: accent, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            >
              {label}
            </span>
          </div>

          {/* Title + meta + synopsis */}
          <div className="flex flex-col gap-1">
            <h4
              className="truncate text-[14px] font-semibold leading-tight text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {rec.show.title}
            </h4>
            <div className="flex items-center gap-1.5 font-mono text-[8px] text-white/50">
              <span>{rec.show.year}</span>
              <span>·</span>
              <span>{rec.show.genres}</span>
            </div>
            <p className={`text-[9px] leading-snug text-white/60 ${expanded ? "" : "line-clamp-2"}`}>
              {rec.show.description}
            </p>
          </div>

          {/* Queue button */}
          <button
            className="w-full rounded-lg py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-white transition-all active:scale-[0.97]"
            style={{
              background: isQueued
                ? "rgba(255,255,255,0.08)"
                : `linear-gradient(135deg, ${accent}cc, ${accent}88)`,
              border: isQueued ? "1px solid rgba(255,255,255,0.15)" : "none",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); handleQueue(); }}
          >
            {isQueued ? "✓ IN QUEUE" : "+ ADD TO QUEUE"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecDialog({ shows, onClose }: RecDialogProps) {
  const metrics = useSessionStore();

  const recs = useMemo(() => getRecommendations(shows, metrics), [shows, metrics]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 80,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          animation: "fade-in 200ms ease-out",
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => { e.stopPropagation(); onClose(); }}
      />

      {/* Dialog */}
      <div
        className="fixed inset-x-0 top-0 bottom-0 flex flex-col overflow-hidden"
        style={{
          zIndex: 81,
          paddingTop: "max(calc(env(safe-area-inset-top, 12px) + 8px), 20px)",
          paddingBottom: "max(env(safe-area-inset-bottom, 10px), 14px)",
          animation: "popup-in 250ms ease-out",
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[18px]">🛸</span>
            <h2
              className="text-[18px] font-bold tracking-wide text-white"
              style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            >
              Alien Top Picks
            </h2>
          </div>
          <button
            className="rounded-full p-2 text-white/40 active:text-white/70"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <p className="shrink-0 px-5 pb-4 font-mono text-[9px] uppercase tracking-[0.15em] text-white/35">
        </p>

        {/* Scrollable cards */}
        <div
          className="flex-1 overflow-y-auto px-5 pb-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {recs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <span className="text-[32px]">🌌</span>
              <span className="font-mono text-[11px] text-white/30 uppercase tracking-[0.15em]">
                Keep exploring to get recommendations
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recs.map((rec) => (
                <RecCard key={rec.show.id} rec={rec} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
