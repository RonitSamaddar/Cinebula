/**
 * CategoryPill — Top-center pill showing current category name + animated colored dot.
 * Imperatively updated via ref to avoid re-renders during pan.
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

export interface CategoryPillHandle {
  update: (cx: number, cy: number) => void;
}

interface CategoryPillProps {
  visible?: boolean;
}

const CategoryPill = forwardRef<CategoryPillHandle, CategoryPillProps>(function CategoryPill({ visible = true }, ref) {
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const lastKeyRef = useRef<string>("");

  useImperativeHandle(ref, () => ({
    update(cx: number, cy: number) {
      // Find nearest category
      let nearest = CATEGORIES[0];
      let bestDist = Infinity;
      for (const cat of CATEGORIES) {
        const dx = wrapDist(cx, cat.position.x * WORLD_W, WORLD_W);
        const dy = wrapDist(cy, cat.position.y * WORLD_H, WORLD_H);
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          nearest = cat;
        }
      }

      // Only update DOM if category changed
      if (nearest.key === lastKeyRef.current) return;
      lastKeyRef.current = nearest.key;

      if (dotRef.current) {
        dotRef.current.style.backgroundColor = nearest.accent;
        dotRef.current.style.boxShadow = `0 0 8px 2px ${nearest.accent}80, 0 0 20px 4px ${nearest.accent}40`;
      }
      if (labelRef.current) {
        labelRef.current.textContent = nearest.label;
        labelRef.current.style.color = nearest.accent;
      }
    },
  }));

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 flex items-center gap-2 rounded-full px-4 py-2"
      style={{
        zIndex: 20,
        marginTop: "max(env(safe-area-inset-top, 12px), 12px)",
        background: "rgba(14, 12, 24, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms ease",
      }}
    >
      <div
        ref={dotRef}
        className="rounded-full"
        style={{
          width: 7,
          height: 7,
          backgroundColor: "#ff9f43",
          boxShadow: "0 0 8px 2px #ff9f4380, 0 0 20px 4px #ff9f4340",
          animation: "pulse-dot 3s ease-in-out infinite",
        }}
      />
      <span
        ref={labelRef}
        className="whitespace-nowrap font-mono text-[10px] font-medium uppercase tracking-[0.2em]"
        style={{ color: "#ff9f43" }}
      >
        ACTION · INTENSE
      </span>
    </div>
  );
});

export default CategoryPill;
