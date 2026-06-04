/**
 * CompassLabels — 4 nearest-genre indicators positioned at screen edges
 * in the actual direction of each category relative to the camera.
 * Imperatively updated via ref.
 */

"use client";

import { useRef, useImperativeHandle, forwardRef } from "react";
import { CATEGORIES } from "@/data/categories";
import { WORLD_W, WORLD_H } from "@/config/galaxy";

function wrapDist(cam: number, pos: number, size: number): number {
  let d = pos - cam;
  if (d > size / 2) d -= size;
  if (d < -size / 2) d += size;
  return d;
}

/** Project an angle onto the screen rectangle edge, returning (x, y) in viewport coords */
function edgePoint(angle: number, vw: number, vh: number, margin: number): { x: number; y: number } {
  const hw = vw / 2 - margin;
  const hh = vh / 2 - margin;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Scale to hit the rectangle edge
  const sx = cos !== 0 ? Math.abs(hw / cos) : Infinity;
  const sy = sin !== 0 ? Math.abs(hh / sin) : Infinity;
  const s = Math.min(sx, sy);
  return {
    x: vw / 2 + cos * s,
    y: vh / 2 + sin * s,
  };
}

export interface CompassLabelsHandle {
  update: (cx: number, cy: number) => void;
}

interface CompassLabelsProps {
  onNavigate?: (worldX: number, worldY: number) => void;
  visible?: boolean;
}

const NUM_INDICATORS = 4;

const CompassLabels = forwardRef<CompassLabelsHandle, CompassLabelsProps>(function CompassLabels({ onNavigate, visible = true }, ref) {
  const pillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const targetRef = useRef<{ worldX: number; worldY: number }[]>([]);

  useImperativeHandle(ref, () => ({
    update(cx: number, cy: number) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Compute wrapped offsets to all categories
      const offsets = CATEGORIES.map((cat) => {
        const dx = wrapDist(cx, cat.position.x * WORLD_W, WORLD_W);
        const dy = wrapDist(cy, cat.position.y * WORLD_H, WORLD_H);
        return { cat, dx, dy, dist: Math.sqrt(dx * dx + dy * dy) };
      });

      // Sort by distance, skip nearest (current), take next 4
      offsets.sort((a, b) => a.dist - b.dist);
      const nearest = offsets.slice(1, 1 + NUM_INDICATORS);

      for (let i = 0; i < NUM_INDICATORS; i++) {
        const el = pillRefs.current[i];
        if (!el) continue;

        if (i >= nearest.length) {
          el.style.display = "none";
          continue;
        }

        const entry = nearest[i];
        const angle = Math.atan2(entry.dy, entry.dx);
        const pos = edgePoint(angle, vw, vh, 10);

        // Clamp so the pill stays fully on screen — narrower pills (50×32)
        const pillHalfW = 28;
        const pillHalfH = 18;
        const safeTop = 56 + pillHalfH;
        const safeBottom = vh - 16 - pillHalfH;
        const safeLeft = pillHalfW + 4;
        const safeRight = vw - pillHalfW - 4;
        const clampedX = Math.max(safeLeft, Math.min(safeRight, pos.x));
        const clampedY = Math.max(safeTop, Math.min(safeBottom, pos.y));

        // Store target for tap
        targetRef.current[i] = {
          worldX: entry.cat.position.x * WORLD_W,
          worldY: entry.cat.position.y * WORLD_H,
        };

        // Arrow rotation: point outward toward category
        const arrowDeg = (angle * 180) / Math.PI;

        el.style.display = "flex";
        el.style.left = `${clampedX}px`;
        el.style.top = `${clampedY}px`;
        el.style.transform = `translate(-50%, -50%)`;

        const arrow = el.querySelector<HTMLDivElement>("[data-arrow]");
        const dot = el.querySelector<HTMLDivElement>("[data-dot]");
        const label = el.querySelector<HTMLSpanElement>("[data-label]");

        if (arrow) arrow.style.transform = `rotate(${arrowDeg}deg)`;
        if (dot) {
          dot.style.backgroundColor = entry.cat.accent;
          dot.style.boxShadow = `0 0 6px 2px ${entry.cat.accent}60`;
        }
        if (label) {
          label.innerHTML = entry.cat.label.split(/\s+/).map(w => `<div style="white-space:nowrap">${w}</div>`).join("");
          label.style.color = entry.cat.accent;
        }
      }
    },
  }));

  const handleTap = (i: number) => {
    const target = targetRef.current[i];
    if (target && onNavigate) onNavigate(target.worldX, target.worldY);
  };

  const pillStyle: React.CSSProperties = {
    background: "rgba(14, 12, 24, 0.75)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    zIndex: 15,
    display: "none",
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: "opacity 300ms ease",
  };

  return (
    <>
      {Array.from({ length: NUM_INDICATORS }, (_, i) => (
        <div
          key={i}
          ref={(el) => { pillRefs.current[i] = el; }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => { e.stopPropagation(); handleTap(i); }}
          className="absolute flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 cursor-pointer"
          style={{ ...pillStyle, width: "auto" }}
        >
          <div className="flex items-center gap-1">
            <div data-arrow className="flex items-center text-white/40" style={{ fontSize: 8 }}>
              ▸
            </div>
            <div data-dot className="h-[5px] w-[5px] rounded-full shrink-0" />
          </div>
          <span data-label className="font-mono text-[7px] uppercase tracking-[0.1em] text-center leading-tight whitespace-nowrap" />
        </div>
      ))}
    </>
  );
});

export default CompassLabels;
