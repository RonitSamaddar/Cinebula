"use client";

import { useRef, useImperativeHandle, forwardRef } from "react";
import { CATEGORIES } from "@/data/categories";

const WORLD_W = 1400;
const WORLD_H = 1800;

const CATEGORY_POSITIONS = CATEGORIES.map((cat) => ({
  key: cat.key,
  label: cat.label,
  accent: cat.accent,
  wx: cat.position.x * WORLD_W,
  wy: cat.position.y * WORLD_H,
}));

function wrapOffset(cam: number, pos: number, size: number): number {
  let d = pos - cam;
  if (d > size / 2) d -= size;
  if (d < -size / 2) d += size;
  return d;
}

export interface LabelsHandle {
  update: (cx: number, cy: number, zoom?: number) => void;
}

const CategoryLabels = forwardRef<LabelsHandle>(function CategoryLabels(_, ref) {
  const elRefs = useRef<(HTMLDivElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    update(cx: number, cy: number, zoom: number = 1) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      for (let i = 0; i < CATEGORY_POSITIONS.length; i++) {
        const el = elRefs.current[i];
        if (!el) continue;
        const cat = CATEGORY_POSITIONS[i];
        const dx = wrapOffset(cx, cat.wx, WORLD_W) * zoom;
        const dy = wrapOffset(cy, cat.wy, WORLD_H) * zoom;
        const sx = vw / 2 + dx;
        const sy = vh / 2 + dy;
        if (sx < -200 || sx > vw + 200 || sy < -200 || sy > vh + 200) {
          el.style.display = "none";
        } else {
          el.style.display = "flex";
          el.style.transform = `translate(${sx - vw / 2}px, ${sy - vh / 2}px) translate(-50%, -50%)`;
        }
      }
    },
  }));

  return (
    <>
      {CATEGORY_POSITIONS.map((cat, i) => (
        <div
          key={cat.key}
          ref={(el) => { elRefs.current[i] = el; }}
          className="pointer-events-none absolute flex flex-col items-center"
          style={{
            left: "50%",
            top: "50%",
            zIndex: 5,
            willChange: "transform",
          }}
        >
          <div
            className="mb-2 rounded-full"
            style={{
              width: 8, height: 8,
              backgroundColor: cat.accent,
              boxShadow: `0 0 12px 4px ${cat.accent}80, 0 0 30px 8px ${cat.accent}40`,
              animation: "pulse-dot 3s ease-in-out infinite",
            }}
          />
          <span
            className="whitespace-nowrap font-mono text-[10px] font-medium uppercase tracking-[0.2em]"
            style={{ color: cat.accent, textShadow: `0 0 8px ${cat.accent}60`, opacity: 0.85 }}
          >
            {cat.label}
          </span>
        </div>
      ))}
    </>
  );
});

export default CategoryLabels;
