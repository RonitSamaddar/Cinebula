"use client";

import type { Show } from "@/types";
import { CATEGORIES } from "@/data/categories";
import { useQueueStore } from "@/stores/queue-store";
import { SHOW_SIZE_PX } from "@/config/galaxy";

interface DetailPopupProps {
  show: Show;
  /** Screen position where the card was tapped */
  screenX: number;
  screenY: number;
  onClose: () => void;
}

const POPUP_W = 200;
const POPUP_H = 380;

export default function DetailPopup({ show, screenX, screenY, onClose }: DetailPopupProps) {
  const isQueued = useQueueStore((s) => s.items.some((i) => i.id === show.id));
  const addToQueue = useQueueStore((s) => s.add);
  const removeFromQueue = useQueueStore((s) => s.remove);

  const cat = CATEGORIES.find((c) => c.key === show.category);
  const accent = cat?.accent || "#fff";
  const cardH = (SHOW_SIZE_PX[show.size] ?? 50) * 1.4;

  // Smart edge avoidance: position popup so it stays on screen
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  let left = screenX - POPUP_W / 2;
  let top = screenY + cardH / 2 + 12; // default: below the card

  // If popup would overflow bottom, place it above the card
  if (top + POPUP_H > vh - 60) {
    top = screenY - cardH / 2 - POPUP_H - 12;
  }
  // If still off top, center vertically
  if (top < 60) {
    top = Math.max(60, screenY - POPUP_H / 2);
  }
  // Horizontal clamping
  left = Math.max(8, Math.min(vw - POPUP_W - 8, left));

  const handleQueue = () => {
    if (isQueued) {
      removeFromQueue(show.id);
    } else {
      addToQueue(show);
    }
  };

  return (
    <>
      {/* Backdrop — tap to close */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 50, touchAction: "none" }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => { e.stopPropagation(); onClose(); }}
      />
      {/* Popup */}
      <div
        className="fixed flex flex-col overflow-hidden rounded-xl"
        style={{
          zIndex: 51,
          left,
          top,
          width: POPUP_W,
          background: "rgba(14, 12, 24, 0.95)",
          border: `1px solid ${accent}40`,
          boxShadow: `0 0 30px 4px ${accent}20, 0 8px 32px rgba(0,0,0,0.6)`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          animation: "popup-in 200ms ease-out",
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {/* Poster (top, scaled to fill width, 3:4 aspect) */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            height: POPUP_W * 1.2,
            background: show.gradient || `linear-gradient(135deg, ${accent}40, ${accent}10)`,
          }}
        >
          {show.poster && (
            <img
              src={show.poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {/* Match badge */}
          <div
            className="absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold text-white"
            style={{ background: `${accent}cc` }}
          >
            {show.match}%
          </div>
        </div>

        {/* Text content (below poster) */}
        <div className="flex flex-col gap-1.5 p-3">
          <h3 className="text-[14px] font-semibold leading-tight text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {show.title}
          </h3>
          <div className="flex items-center gap-1.5 font-mono text-[8px] text-white/50">
            <span>{show.year}</span>
            <span>·</span>
            <span>{show.runtime}</span>
            <span>·</span>
            <span>{show.genres}</span>
          </div>
          <div
            className="overflow-y-auto text-[9px] leading-snug text-white/60"
            style={{ maxHeight: "5.4em" }}
          >
            {show.description}
          </div>
          {show.language && (
            <div className="font-mono text-[7px] text-white/30 uppercase">
              {show.language}
            </div>
          )}

          {/* Queue button */}
          <button
            className="mt-1 w-full rounded-lg py-2 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white transition-all active:scale-[0.97]"
            style={{
              background: isQueued
                ? "rgba(255,255,255,0.08)"
                : `linear-gradient(135deg, ${accent}cc, ${accent}88)`,
              border: isQueued ? "1px solid rgba(255,255,255,0.15)" : "none",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); handleQueue(); }}
          >
            {isQueued ? "✓ IN QUEUE" : "+ ADD TO QUEUE"}
          </button>
        </div>
      </div>
    </>
  );
}
