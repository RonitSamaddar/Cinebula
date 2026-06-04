/**
 * ShowCards — Container that positions all show cards in the galaxy.
 * Uses imperative DOM updates for 60fps panning.
 */

"use client";

import { useRef, useImperativeHandle, forwardRef, useState, useCallback, useEffect } from "react";
import type { Show } from "@/types";
import { WORLD_W, WORLD_H } from "@/config/galaxy";
import ShowCard from "./ShowCard";

function wrapOffset(cam: number, pos: number, size: number): number {
  let d = pos - cam;
  if (d > size / 2) d -= size;
  if (d < -size / 2) d += size;
  return d;
}

export interface ShowCardsHandle {
  update: (cx: number, cy: number, zoom?: number) => void;
  setShows: (shows: Show[]) => void;
}

interface ShowCardsProps {
  onShowTap?: (show: Show, screenX: number, screenY: number) => void;
  edgeFade?: boolean;
}

const ShowCards = forwardRef<ShowCardsHandle, ShowCardsProps>(function ShowCards({ onShowTap, edgeFade = false }, ref) {
  const [shows, setShowsState] = useState<Show[]>([]);
  const elMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastCamRef = useRef({ x: WORLD_W / 2, y: WORLD_H / 2 });
  const lastZoomRef = useRef(1);
  const showsRef = useRef<Show[]>([]);
  const edgeFadeRef = useRef(edgeFade);
  edgeFadeRef.current = edgeFade;

  // Keep showsRef in sync
  useEffect(() => {
    showsRef.current = shows;
  }, [shows]);

  // After shows render, run an update with last known camera to position them
  useEffect(() => {
    if (shows.length === 0) return;
    // Wait one frame so ref callbacks have fired
    requestAnimationFrame(() => {
      const cam = lastCamRef.current;
      doUpdate(cam.x, cam.y, lastZoomRef.current);
    });
  }, [shows]);

  // Re-apply positions when edgeFade changes (drag state toggle)
  useEffect(() => {
    if (showsRef.current.length === 0) return;
    doUpdate(lastCamRef.current.x, lastCamRef.current.y, lastZoomRef.current);
  }, [edgeFade]);

  const handleTap = useCallback((show: Show) => {
    const el = elMapRef.current.get(show.id);
    if (el) {
      const rect = el.getBoundingClientRect();
      onShowTap?.(show, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }, [onShowTap]);

  function doUpdate(cx: number, cy: number, zoom: number = 1) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const halfW = vw / 2;
    const halfH = vh / 2;
    const fade = edgeFadeRef.current;
    const edgeMargin = 44;

    for (const show of showsRef.current) {
      const el = elMapRef.current.get(show.id);
      if (!el) continue;

      const dx = wrapOffset(cx, show.worldX, WORLD_W) * zoom;
      const dy = wrapOffset(cy, show.worldY, WORLD_H) * zoom;
      const sx = halfW + dx;
      const sy = halfH + dy;

      el.style.display = "block";
      el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%) scale(${zoom > 1 ? Math.min(zoom * 0.7, 1.8) : 1})`;

      // Edge fade: cards in the margin zone get reduced opacity when static
      if (fade) {
        const distLeft = sx;
        const distRight = vw - sx;
        const distTop = sy;
        const distBottom = vh - sy;
        const minDist = Math.min(distLeft, distRight, distTop, distBottom);
        if (minDist < edgeMargin) {
          el.style.opacity = `${Math.max(0.1, minDist / edgeMargin * 0.5)}`;
        } else {
          el.style.opacity = "1";
        }
      } else {
        el.style.opacity = "1";
      }
    }
  }

  useImperativeHandle(ref, () => ({
    update(cx: number, cy: number, zoom: number = 1) {
      lastCamRef.current = { x: cx, y: cy };
      lastZoomRef.current = zoom;
      doUpdate(cx, cy, zoom);
    },
    setShows(newShows: Show[]) {
      setShowsState(newShows);
    },
  }));

  return (
    <>
      {shows.map((show) => (
        <div
          key={show.id}
          ref={(el) => {
            if (el) {
              elMapRef.current.set(show.id, el);
            } else {
              elMapRef.current.delete(show.id);
            }
          }}
          className="pointer-events-auto absolute left-0 top-0"
          style={{
            display: "none",
            zIndex: show.size === "l" ? 4 : show.size === "m" ? 3 : 2,
            willChange: "transform, opacity",
          }}
        >
          <ShowCard show={show} onTap={handleTap} />
        </div>
      ))}
    </>
  );
});

export default ShowCards;
