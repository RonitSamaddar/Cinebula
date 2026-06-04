"use client";

import { useState } from "react";
import { useQueueStore } from "@/stores/queue-store";
import { CATEGORIES } from "@/data/categories";

interface QueuePanelProps {
  onClose: () => void;
}

export default function QueuePanel({ onClose }: QueuePanelProps) {
  const items = useQueueStore((s) => s.items);
  const remove = useQueueStore((s) => s.remove);
  const clear = useQueueStore((s) => s.clear);
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    setSent(true);
    setTimeout(() => {
      clear();
      setSent(false);
      onClose();
    }, 2500);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: 60,
        background: "rgba(14, 12, 24, 0.98)",
        animation: "fade-in 200ms ease-out",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between px-5 pb-3"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top, 12px) + 16px), 28px)" }}
      >
        <h2 className="text-[18px] font-semibold text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Tonight&apos;s Queue
        </h2>
        <span className="font-mono text-[10px] text-white/40">
          {items.length} {items.length === 1 ? "show" : "shows"}
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <span className="text-[32px]">🌌</span>
            <span className="font-mono text-[11px] text-white/30 uppercase tracking-[0.15em]">
              Queue is empty
            </span>
            <span className="text-[12px] text-white/20">
              Tap shows to add them
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((show) => {
              const cat = CATEGORIES.find((c) => c.key === show.category);
              const accent = cat?.accent || "#fff";
              return (
                <div
                  key={show.id}
                  className="flex items-center gap-3 rounded-lg p-2"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  {/* Poster thumb */}
                  <div
                    className="shrink-0 rounded-md"
                    style={{
                      width: 44,
                      height: 62,
                      background: show.gradient || `linear-gradient(135deg, ${accent}40, ${accent}10)`,
                      border: `1px solid ${accent}30`,
                    }}
                  />
                  {/* Info */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-medium text-white">
                      {show.title}
                    </span>
                    <span className="font-mono text-[9px] text-white/40">
                      {show.year} · {show.runtime} · {show.genres}
                    </span>
                    <span
                      className="self-start rounded-full px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.1em]"
                      style={{ background: `${accent}25`, color: accent }}
                    >
                      {show.category}
                    </span>
                  </div>
                  {/* Remove */}
                  <button
                    className="shrink-0 rounded-full p-2 text-white/30 active:text-white/60 active:scale-90"
                    onClick={(e) => { e.stopPropagation(); remove(show.id); }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom button bar */}
      <div
        className="shrink-0 flex items-center gap-3 px-5 pb-5 pt-3 border-t"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          paddingBottom: "max(env(safe-area-inset-bottom, 20px), 24px)",
        }}
      >
        <button
          className="flex-1 rounded-xl py-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white/70 active:scale-[0.97] transition-transform"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onClick={onClose}
        >
          ← Back
        </button>
        {items.length > 0 && (
          <button
            className="flex-1 rounded-xl py-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 active:scale-[0.97] transition-transform"
            style={{
              background: "rgba(255,70,70,0.1)",
              border: "1px solid rgba(255,70,70,0.25)",
            }}
            onClick={() => clear()}
          >
            Clear Queue
          </button>
        )}
        {items.length > 0 && (
          <button
            className="flex-1 rounded-xl py-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white active:scale-[0.97] transition-transform"
            style={{
              background: "linear-gradient(135deg, #7c6bf0, #b56cff)",
              boxShadow: "0 0 16px 2px rgba(124, 107, 240, 0.3)",
            }}
            onClick={handleSend}
          >
            📺 Send to TV
          </button>
        )}
      </div>

      {/* Sent confirmation overlay */}
      {sent && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(14, 12, 24, 0.97)", zIndex: 2 }}>
          <span className="text-[48px]">✓</span>
          <span className="font-mono text-[13px] uppercase tracking-[0.2em] text-white/80">
            Sent to your TV
          </span>
          <span className="text-[12px] text-white/30">
            {items.length} {items.length === 1 ? "show" : "shows"} queued up
          </span>
        </div>
      )}
    </div>
  );
}
