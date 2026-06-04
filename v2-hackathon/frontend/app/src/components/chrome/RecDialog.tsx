/**
 * RecDialog — Full-screen recommendation overlay with 3 personalized picks.
 * Triggered by tapping alien's rec bubble.
 */

"use client";

import { useMemo } from "react";
import type { Show } from "@/types";
import { CATEGORIES } from "@/data/categories";
import { useQueueStore } from "@/stores/queue-store";
import { useSessionStore } from "@/stores/session-store";
import { getRecommendations, type Recommendation } from "@/lib/recommendations";

interface RecDialogProps {
  shows: Show[];
  onClose: () => void;
}

const TYPE_LABELS: Record<string, { title: string; icon: string }> = {
  similar: { title: "SIMILAR TO YOU", icon: "🎯" },
  mood: { title: "YOUR CATEGORY", icon: "🌙" },
  wildcard: { title: "WILDCARD", icon: "🎲" },
};

function RecCard({ rec }: { rec: Recommendation }) {
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
      className="flex flex-col overflow-hidden rounded-xl"
      style={{
        background: "rgba(14, 12, 24, 0.95)",
        border: `1px solid ${accent}30`,
        boxShadow: `0 0 20px 2px ${accent}10`,
      }}
    >
      {/* Type header */}
      <div
        className="flex items-center gap-1.5 px-3 py-2"
        style={{ background: `${accent}15` }}
      >
        <span className="text-[12px]">{label.icon}</span>
        <span
          className="font-mono text-[8px] font-bold uppercase tracking-[0.2em]"
          style={{ color: accent }}
        >
          {label.title}
        </span>
      </div>

      {/* Poster gradient */}
      <div
        className="relative h-[80px]"
        style={{
          background: rec.show.gradient || `linear-gradient(135deg, ${accent}40, ${accent}10)`,
        }}
      >
        {/* Match badge */}
        <div
          className="absolute right-2 top-2 rounded-full px-2 py-0.5 font-mono text-[8px] font-bold text-white"
          style={{ background: `${accent}cc` }}
        >
          {rec.show.match}%
        </div>
        {/* Category badge */}
        <div
          className="absolute bottom-2 left-2 rounded-full px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.1em]"
          style={{ background: `${accent}30`, color: accent, border: `1px solid ${accent}50` }}
        >
          {rec.show.category}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        <h4
          className="text-[14px] font-semibold leading-tight text-white"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {rec.show.title}
        </h4>
        <div className="flex items-center gap-1.5 font-mono text-[8px] text-white/50">
          <span>{rec.show.year}</span>
          <span>·</span>
          <span>{rec.show.runtime}</span>
          <span>·</span>
          <span>{rec.show.genres}</span>
        </div>
        <p className="line-clamp-2 text-[10px] leading-relaxed text-white/55">
          {rec.show.description}
        </p>
        {/* Reasoning */}
        <p
          className="mt-0.5 text-[9px] italic leading-snug"
          style={{ color: `${accent}aa` }}
        >
          {rec.reasoning}
        </p>
      </div>

      {/* Queue button */}
      <div className="px-3 pb-3">
        <button
          className="w-full rounded-lg py-2 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white transition-all active:scale-[0.97]"
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
              className="text-[18px] font-semibold text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Alien Picks
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
          Personalized recommendations based on your exploration
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
