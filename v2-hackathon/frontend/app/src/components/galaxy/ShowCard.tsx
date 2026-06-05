/**
 * ShowCard — A single show floating in the galaxy.
 * Renders poster image if available, otherwise gradient fallback.
 * 3 sizes: L (90px), M (70px), S (50px).
 */

"use client";

import { useRef, useState } from "react";
import type { Show } from "@/types";
import { SHOW_SIZE_PX } from "@/config/galaxy";

interface ShowCardProps {
  show: Show;
  isQueued?: boolean;
  onTap?: (show: Show) => void;
}

export default function ShowCard({ show, isQueued, onTap }: ShowCardProps) {
  const size = SHOW_SIZE_PX[show.size] ?? 50;
  const downPos = useRef({ x: 0, y: 0 });
  const [imgError, setImgError] = useState(false);
  const hasPoster = show.poster && !imgError;

  // Opacity tied to size tier — deterministic from show id
  const hash = show.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  let opacity: number;
  if (show.size >= 8) {
    opacity = [0.8, 0.9, 1.0][hash % 3];
  } else if (show.size >= 5) {
    opacity = [0.5, 0.6, 0.7][hash % 3];
  } else {
    opacity = [0.4, 0.5, 0.6, 0.7][hash % 4];
  }
  // Apply collision penalty from world-space placement
  opacity = Math.max(0.2, opacity - (show.opacityPenalty || 0));

  // Drift animation — unique duration per tile for organic feel
  const driftDuration = 12 + (hash % 15); // 12s to 26s (slow)
  const driftDelay = (hash % 3000) / 1000; // 0s to 3s
  const driftName = ["tile-drift-sm", "tile-drift-md", "tile-drift-lg"][hash % 3];

  return (
    <div
      className="flex flex-col items-center justify-end overflow-hidden rounded-md"
      style={{
        width: size,
        height: size * 1.4,
        opacity,
        animation: `${driftName} ${driftDuration}s ease-in-out ${driftDelay}s infinite`,
        background: hasPoster ? "#0a0a14" : (show.gradient || "linear-gradient(135deg, #2a2a3a, #1a1a2a)"),
        boxShadow: isQueued
          ? "0 0 12px 3px rgba(181,108,255,0.5), 0 0 24px 6px rgba(181,108,255,0.2)"
          : show.watched
            ? "0 0 8px 2px rgba(230,176,74,0.4)"
            : "0 2px 8px rgba(0,0,0,0.5)",
        border: isQueued
          ? "1.5px solid rgba(181,108,255,0.6)"
          : show.watched
            ? "1.5px solid rgba(230,176,74,0.5)"
            : "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
      }}
      onPointerDown={(e) => {
        downPos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const dx = Math.abs(e.clientX - downPos.current.x);
        const dy = Math.abs(e.clientY - downPos.current.y);
        if (dx < 10 && dy < 10) {
          e.stopPropagation();
          onTap?.(show);
        }
      }}
    >
      {/* Poster image */}
      {hasPoster && (
        <img
          src={show.poster}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ borderRadius: "inherit" }}
        />
      )}

      {/* Queued check badge */}
      {isQueued && (
        <div
          className="absolute right-0.5 top-0.5 flex items-center justify-center rounded-full"
          style={{
            width: size >= 70 ? 16 : 12,
            height: size >= 70 ? 16 : 12,
            backgroundColor: "rgba(181,108,255,0.9)",
            fontSize: size >= 70 ? 10 : 8,
          }}
        >
          ✓
        </div>
      )}

      {/* Watched badge */}
      {show.watched && !isQueued && (
        <div
          className="absolute right-0.5 top-0.5 flex items-center justify-center rounded-full"
          style={{
            width: size >= 70 ? 16 : 12,
            height: size >= 70 ? 16 : 12,
            backgroundColor: "rgba(230,176,74,0.9)",
            fontSize: size >= 70 ? 8 : 6,
          }}
        >
          ★
        </div>
      )}
    </div>
  );
}
