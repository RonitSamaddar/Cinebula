/**
 * CompassLabels — Fixed direction labels at top/bottom/left/right edges
 * showing the summary of content in that direction, fetched from the
 * /api/direction endpoint. Debounced to avoid flooding API calls.
 */

"use client";

import { useRef, useImperativeHandle, forwardRef, useState, useCallback } from "react";
import type { CoordBounds } from "@/services/backend";

export interface CompassLabelsHandle {
  update: (cx: number, cy: number, zoom?: number) => void;
  setBounds: (bounds: CoordBounds) => void;
  refresh: () => void;
}

interface CompassLabelsProps {
  onNavigate?: (worldX: number, worldY: number) => void;
  visible?: boolean;
}

interface DirectionResponse {
  direction: string;
  summary: string;
}

const DIRECTIONS = ["up", "down", "left", "right"] as const;

/** Convert world coordinates back to raw embedding coordinates */
function worldToRaw(
  worldX: number,
  worldY: number,
  bounds: CoordBounds,
): { rawX: number; rawY: number } {
  const { minX, maxX, minY, maxY, worldW, worldH, padding } = bounds;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const relX = (worldX - padding) / (worldW - 2 * padding);
  const relY = (worldY - padding) / (worldH - 2 * padding);
  const rawX = relX * rangeX + minX;
  const rawY = relY * rangeY + minY;
  return { rawX, rawY };
}

/** Compute radius based on zoom level — higher zoom = larger radius (seeing further) */
function radiusFromZoom(zoom: number): number {
  // zoom 1 → ~15, zoom 7 → ~105, zoom 14 → ~210, zoom 20 → 300
  return Math.min(300, Math.max(5, Math.round(zoom * 15)));
}

const CompassLabels = forwardRef<CompassLabelsHandle, CompassLabelsProps>(function CompassLabels({ visible = true }, ref) {
  const boundsRef = useRef<CoordBounds | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchRef = useRef({ x: -Infinity, y: -Infinity, zoom: -1 });
  const abortRef = useRef<AbortController | null>(null);
  const lastCameraRef = useRef({ x: 0, y: 0, zoom: 1 });

  const [labels, setLabels] = useState<Record<string, string>>({
    up: "",
    down: "",
    left: "",
    right: "",
    center: "",
  });

  const fetchDirections = useCallback(async (cx: number, cy: number, zoom: number) => {
    const bounds = boundsRef.current;
    if (!bounds) return;

    const { rawX, rawY } = worldToRaw(cx, cy, bounds);
    const radius = radiusFromZoom(zoom);

    // Abort any in-flight requests
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Fetch 4 directions + center (radius=0) in parallel
      const allDirs = [...DIRECTIONS, "center" as const];
      const results = await Promise.all(
        allDirs.map(async (dir) => {
          const r = dir === "center" ? 0 : radius;
          const d = dir === "center" ? "right" : dir; // direction doesn't matter for radius=0
          const url = `/api/direction?x=${rawX.toFixed(2)}&y=${rawY.toFixed(2)}&dir=${d}&radius=${r}`;
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) return { direction: dir, summary: "" };
          const data: DirectionResponse = await res.json();
          return { direction: dir, summary: data.summary || "" };
        }),
      );

      if (controller.signal.aborted) return;

      const next: Record<string, string> = {};
      for (const r of results) {
        next[r.direction] = r.summary || "";
      }
      setLabels(next);
    } catch {
      // aborted or network error — ignore
    }
  }, []);

  useImperativeHandle(ref, () => ({
    update(cx: number, cy: number, zoom: number = 1) {
      lastCameraRef.current = { x: cx, y: cy, zoom };

      const last = lastFetchRef.current;
      const distMoved = Math.sqrt((cx - last.x) ** 2 + (cy - last.y) ** 2);
      const zoomChanged = Math.abs(zoom - last.zoom) > 0.3;
      const threshold = 30 / zoom;

      if (distMoved < threshold && !zoomChanged) return;

      lastFetchRef.current = { x: cx, y: cy, zoom };

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchDirections(cx, cy, zoom);
      }, 400);
    },
    setBounds(bounds: CoordBounds) {
      boundsRef.current = bounds;
      // Immediately fetch directions with current camera position
      const { x, y, zoom } = lastCameraRef.current;
      lastFetchRef.current = { x: -Infinity, y: -Infinity, zoom: -1 }; // reset so next update also fires
      fetchDirections(x, y, zoom);
    },
    refresh() {
      // Re-fetch directions at the current camera position (e.g. after closing an overlay)
      // Reset lastFetchRef so the next update() call also triggers a fetch as backup
      lastFetchRef.current = { x: -Infinity, y: -Infinity, zoom: -1 };
      // Delay slightly to let React finish re-renders (avoids abort race with pushCamera→update)
      setTimeout(() => {
        const { x, y, zoom } = lastCameraRef.current;
        fetchDirections(x, y, zoom);
      }, 100);
    },
  }), [fetchDirections]);

  const baseStyle: React.CSSProperties = {
    position: "fixed",
    opacity: visible ? 0.35 : 0,
    pointerEvents: "none",
    transition: "opacity 500ms ease",
    zIndex: 15,
    fontFamily: "var(--font-inter), 'SF Pro Display', -apple-system, sans-serif",
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.15em",
    textTransform: "lowercase",
    textShadow: "0 0 8px rgba(0,0,0,0.6)",
    color: "rgba(210, 220, 230, 0.9)",
    maxWidth: "140px",
    lineHeight: "1.3",
    textAlign: "center" as const,
  };

  /** Split comma-separated summary into lines */
  const splitWords = (text: string) =>
    text.split(",").map((w) => w.trim()).filter(Boolean);

  return (
    <>
      {/* Center — current space name */}
      {labels.center && (
        <div style={{
          ...baseStyle,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: visible ? 0.15 : 0,
          fontSize: "18px",
          fontWeight: 600,
          letterSpacing: "0.2em",
          maxWidth: "280px",
        }}>
          {labels.center}
        </div>
      )}
      {/* Top center — up */}
      {labels.up && (
        <div style={{ ...baseStyle, top: 18, left: "50%", transform: "translateX(-50%)" }}>
          ↑ {labels.up}
        </div>
      )}
      {/* Bottom center — down */}
      {labels.down && (
        <div style={{ ...baseStyle, bottom: 18, left: "50%", transform: "translateX(-50%)" }}>
          ↓ {labels.down}
        </div>
      )}
      {/* Left center — stacked vertically */}
      {labels.left && (
        <div style={{ ...baseStyle, left: 12, top: "50%", transform: "translateY(-50%)", lineHeight: "1.6" }}>
          {splitWords(labels.left).map((word, i) => (
            <div key={i}>{i === 0 ? `← ${word}` : word}</div>
          ))}
        </div>
      )}
      {/* Right center — stacked vertically */}
      {labels.right && (
        <div style={{ ...baseStyle, right: 12, top: "50%", transform: "translateY(-50%)", lineHeight: "1.6" }}>
          {splitWords(labels.right).map((word, i) => (
            <div key={i}>{i === 0 ? `${word} →` : word}</div>
          ))}
        </div>
      )}
    </>
  );
});

export default CompassLabels;
