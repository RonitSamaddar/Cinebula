/**
 * ConnectionLines — SVG lines between connected shows, pulsing opacity.
 * Uses imperative DOM updates for performance.
 */

"use client";

import { useRef, useImperativeHandle, forwardRef, useState, useEffect } from "react";
import type { Show, Connection } from "@/types";
import { WORLD_W, WORLD_H } from "@/config/galaxy";
import { CATEGORY_ACCENTS } from "@/data/categories";

function wrapOffset(cam: number, pos: number, size: number): number {
  let d = pos - cam;
  if (d > size / 2) d -= size;
  if (d < -size / 2) d += size;
  return d;
}

export interface ConnectionLinesHandle {
  update: (cx: number, cy: number, zoom?: number) => void;
  setData: (shows: Show[], connections: Connection[]) => void;
  setVisible: (visible: boolean) => void;
}

interface ResolvedLine {
  show1: Show;
  show2: Show;
  color: string;
}

const ConnectionLines = forwardRef<ConnectionLinesHandle>(function ConnectionLines(_, ref) {
  const [lines, setLines] = useState<ResolvedLine[]>([]);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useImperativeHandle(ref, () => ({
    update(cx: number, cy: number, zoom: number = 1) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const halfW = vw / 2;
      const halfH = vh / 2;

      for (let i = 0; i < lines.length; i++) {
        const el = lineRefs.current[i];
        if (!el) continue;
        const line = lines[i];

        const dx1 = wrapOffset(cx, line.show1.worldX, WORLD_W) * zoom;
        const dy1 = wrapOffset(cy, line.show1.worldY, WORLD_H) * zoom;
        const dx2 = wrapOffset(cx, line.show2.worldX, WORLD_W) * zoom;
        const dy2 = wrapOffset(cy, line.show2.worldY, WORLD_H) * zoom;

        const x1 = halfW + dx1;
        const y1 = halfH + dy1;
        const x2 = halfW + dx2;
        const y2 = halfH + dy2;

        // Cull if both endpoints are off screen
        const margin = 100;
        const bothOff =
          (x1 < -margin && x2 < -margin) ||
          (x1 > vw + margin && x2 > vw + margin) ||
          (y1 < -margin && y2 < -margin) ||
          (y1 > vh + margin && y2 > vh + margin);

        if (bothOff) {
          el.style.display = "none";
          continue;
        }

        el.style.display = "";
        el.setAttribute("x1", String(x1));
        el.setAttribute("y1", String(y1));
        el.setAttribute("x2", String(x2));
        el.setAttribute("y2", String(y2));
      }
    },

    setVisible(visible: boolean) {
      if (svgRef.current) {
        svgRef.current.style.opacity = visible ? "1" : "0";
        svgRef.current.style.transition = "opacity 400ms ease";
      }
    },

    setData(shows: Show[], connections: Connection[]) {
      const showMap = new Map(shows.map((s) => [s.id, s]));
      const resolved: ResolvedLine[] = [];
      for (const [id1, id2] of connections) {
        const s1 = showMap.get(id1);
        const s2 = showMap.get(id2);
        if (!s1 || !s2) continue;
        const color = CATEGORY_ACCENTS[s1.category] || "#ffffff";
        resolved.push({ show1: s1, show2: s2, color });
      }
      setLines(resolved);
    },
  }));

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 1 }}
    >
      {lines.map((line, i) => (
        <line
          key={`${line.show1.id}-${line.show2.id}`}
          ref={(el) => { lineRefs.current[i] = el; }}
          stroke={line.color}
          strokeWidth={0.5}
          strokeOpacity={0.2}
          style={{
            animation: `pulse-line ${3 + (i % 3)}s ease-in-out infinite`,
          }}
        />
      ))}
    </svg>
  );
});

export default ConnectionLines;
