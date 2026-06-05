/**
 * CompassLabels — Fixed direction labels at top/bottom/left/right edges
 * showing the nearest genre in that direction. Low opacity, clean font.
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

export interface CompassLabelsHandle {
  update: (cx: number, cy: number) => void;
}

interface CompassLabelsProps {
  onNavigate?: (worldX: number, worldY: number) => void;
  visible?: boolean;
}

const CompassLabels = forwardRef<CompassLabelsHandle, CompassLabelsProps>(function CompassLabels({ onNavigate, visible = true }, ref) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<{ top?: { x: number; y: number }; bottom?: { x: number; y: number }; left?: { x: number; y: number }; right?: { x: number; y: number } }>({});

  useImperativeHandle(ref, () => ({
    update(cx: number, cy: number) {
      // Compute wrapped offsets to all categories
      const offsets = CATEGORIES.map((cat) => {
        const dx = wrapDist(cx, cat.position.x * WORLD_W, WORLD_W);
        const dy = wrapDist(cy, cat.position.y * WORLD_H, WORLD_H);
        return { cat, dx, dy, dist: Math.sqrt(dx * dx + dy * dy) };
      });

      // Find current (nearest) genre for center label
      offsets.sort((a, b) => a.dist - b.dist);
      const current = offsets[0];
      if (centerRef.current && current) {
        centerRef.current.textContent = current.cat.label;
        centerRef.current.style.color = current.cat.accent;
      }

      // Find nearest in each cardinal direction
      let bestTop: typeof offsets[0] | null = null;
      let bestBottom: typeof offsets[0] | null = null;
      let bestLeft: typeof offsets[0] | null = null;
      let bestRight: typeof offsets[0] | null = null;

      for (const o of offsets) {
        // Skip if too close (it's the current center)
        if (o.dist < 50) continue;

        // Determine dominant direction
        const absX = Math.abs(o.dx);
        const absY = Math.abs(o.dy);

        if (absY > absX) {
          // Vertical dominant
          if (o.dy < 0 && (!bestTop || o.dist < bestTop.dist)) bestTop = o;
          if (o.dy > 0 && (!bestBottom || o.dist < bestBottom.dist)) bestBottom = o;
        } else {
          // Horizontal dominant
          if (o.dx < 0 && (!bestLeft || o.dist < bestLeft.dist)) bestLeft = o;
          if (o.dx > 0 && (!bestRight || o.dist < bestRight.dist)) bestRight = o;
        }
      }

      // Update labels
      if (topRef.current) {
        if (bestTop) {
          topRef.current.textContent = bestTop.cat.label;
          topRef.current.style.color = bestTop.cat.accent;
          targetRef.current.top = { x: bestTop.cat.position.x * WORLD_W, y: bestTop.cat.position.y * WORLD_H };
        } else {
          topRef.current.textContent = "";
        }
      }
      if (bottomRef.current) {
        if (bestBottom) {
          bottomRef.current.textContent = bestBottom.cat.label;
          bottomRef.current.style.color = bestBottom.cat.accent;
          targetRef.current.bottom = { x: bestBottom.cat.position.x * WORLD_W, y: bestBottom.cat.position.y * WORLD_H };
        } else {
          bottomRef.current.textContent = "";
        }
      }
      if (leftRef.current) {
        if (bestLeft) {
          leftRef.current.textContent = bestLeft.cat.label;
          leftRef.current.style.color = bestLeft.cat.accent;
          targetRef.current.left = { x: bestLeft.cat.position.x * WORLD_W, y: bestLeft.cat.position.y * WORLD_H };
        } else {
          leftRef.current.textContent = "";
        }
      }
      if (rightRef.current) {
        if (bestRight) {
          rightRef.current.textContent = bestRight.cat.label;
          rightRef.current.style.color = bestRight.cat.accent;
          targetRef.current.right = { x: bestRight.cat.position.x * WORLD_W, y: bestRight.cat.position.y * WORLD_H };
        } else {
          rightRef.current.textContent = "";
        }
      }
    },
  }));

  const handleTap = (dir: "top" | "bottom" | "left" | "right") => {
    const t = targetRef.current[dir];
    if (t && onNavigate) onNavigate(t.x, t.y);
  };

  const baseStyle: React.CSSProperties = {
    position: "fixed",
    opacity: visible ? 0.4 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: "opacity 300ms ease",
    zIndex: 15,
    cursor: "pointer",
    fontFamily: "var(--font-inter), 'SF Pro Display', -apple-system, sans-serif",
    fontSize: "11px",
    fontWeight: 500,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    textShadow: "0 0 10px rgba(0,0,0,0.8)",
  };

  return (
    <>
      {/* Center — current genre, very low opacity */}
      <div
        ref={centerRef}
        style={{
          ...baseStyle,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: visible ? 0.15 : 0,
          fontSize: "22px",
          fontWeight: 600,
          letterSpacing: "0.25em",
          pointerEvents: "none",
          cursor: "default",
        }}
      />
      {/* Top — horizontal, at very top edge */}
      <div
        ref={topRef}
        onPointerUp={() => handleTap("top")}
        style={{ ...baseStyle, top: 10, left: "50%", transform: "translateX(-50%)" }}
      />
      {/* Bottom — horizontal, at very bottom edge */}
      <div
        ref={bottomRef}
        onPointerUp={() => handleTap("bottom")}
        style={{ ...baseStyle, bottom: 6, left: "50%", transform: "translateX(-50%)" }}
      />
      {/* Left — vertical, at very left edge */}
      <div
        ref={leftRef}
        onPointerUp={() => handleTap("left")}
        style={{ ...baseStyle, left: 4, top: "50%", transform: "translateY(-50%) rotate(-90deg)" }}
      />
      {/* Right — vertical, at very right edge */}
      <div
        ref={rightRef}
        onPointerUp={() => handleTap("right")}
        style={{ ...baseStyle, right: 4, top: "50%", transform: "translateY(-50%) rotate(90deg)" }}
      />
    </>
  );
});

export default CompassLabels;
