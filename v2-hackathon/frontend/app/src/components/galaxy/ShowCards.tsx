/**
 * ShowCards — Container that positions all show cards in the galaxy.
 * Uses imperative DOM updates for 60fps panning.
 * Viewport constraint: only shows max 10 non-overlapping shows on screen at any time.
 */

"use client";

import { useRef, useImperativeHandle, forwardRef, useState, useCallback, useEffect } from "react";
import type { Show } from "@/types";
import type { DustParticle } from "@/services/backend";
import { WORLD_W, WORLD_H, ICON_DIMS } from "@/config/galaxy";
import ShowCard from "./ShowCard";

function wrapOffset(cam: number, pos: number, size: number): number {
  let d = pos - cam;
  if (d > size / 2) d -= size;
  if (d < -size / 2) d += size;
  return d;
}

export interface ShowCardsHandle {
  update: (cx: number, cy: number, zoom?: number) => void;
  setShows: (shows: Show[], dust?: DustParticle[]) => void;
}

interface ShowCardsProps {
  onShowTap?: (show: Show, screenX: number, screenY: number) => void;
}

const ShowCards = forwardRef<ShowCardsHandle, ShowCardsProps>(function ShowCards({ onShowTap }, ref) {
  const [shows, setShowsState] = useState<Show[]>([]);
  const [dust, setDustState] = useState<DustParticle[]>([]);
  const elMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const dustMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastCamRef = useRef({ x: WORLD_W / 2, y: WORLD_H / 2 });
  const lastZoomRef = useRef(1);
  const showsRef = useRef<Show[]>([]);
  const dustRef = useRef<DustParticle[]>([]);

  // Keep showsRef in sync
  useEffect(() => {
    showsRef.current = shows;
    dustRef.current = dust;
  }, [shows, dust]);

  // After shows render, run an update with last known camera to position them
  useEffect(() => {
    if (shows.length === 0) return;
    // Wait one frame so ref callbacks have fired
    requestAnimationFrame(() => {
      const cam = lastCamRef.current;
      doUpdate(cam.x, cam.y, lastZoomRef.current);
    });
  }, [shows]);

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
    const margin = 60;

    // Position show tiles
    for (const show of showsRef.current) {
      const el = elMapRef.current.get(show.id);
      if (!el) continue;

      const dx = wrapOffset(cx, show.worldX, WORLD_W) * zoom;
      const dy = wrapOffset(cy, show.worldY, WORLD_H) * zoom;
      const sx = halfW + dx;
      const sy = halfH + dy;

      const dims = ICON_DIMS[show.size] || ICON_DIMS[1];
      const cardW = dims.w;
      const cardH = dims.h;

      const inBounds =
        sx + cardW / 2 > -margin &&
        sx - cardW / 2 < vw + margin &&
        sy + cardH / 2 > -margin &&
        sy - cardH / 2 < vh + margin;

      if (inBounds) {
        el.style.display = "block";
        el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
      } else {
        el.style.display = "none";
      }
    }

    // Position dust particles
    for (const d of dustRef.current) {
      const el = dustMapRef.current.get(d.id);
      if (!el) continue;

      const dx = wrapOffset(cx, d.worldX, WORLD_W) * zoom;
      const dy = wrapOffset(cy, d.worldY, WORLD_H) * zoom;
      const sx = halfW + dx;
      const sy = halfH + dy;

      const inBounds =
        sx > -margin && sx < vw + margin &&
        sy > -margin && sy < vh + margin;

      if (inBounds) {
        el.style.display = "block";
        el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
      } else {
        el.style.display = "none";
      }
    }
  }

  useImperativeHandle(ref, () => ({
    update(cx: number, cy: number, zoom: number = 1) {
      lastCamRef.current = { x: cx, y: cy };
      lastZoomRef.current = zoom;
      doUpdate(cx, cy, zoom);
    },
    setShows(newShows: Show[], newDust?: DustParticle[]) {
      setShowsState(newShows);
      if (newDust) setDustState(newDust);
    },
  }));

  return (
    <>
      {shows.map((show) => {
        const dims = ICON_DIMS[show.size] || ICON_DIMS[1];
        return (
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
            width: dims.w,
            height: dims.h,
            zIndex: Math.min(show.size + 1, 10),
            willChange: "transform, opacity",
          }}
        >
          <ShowCard show={show} onTap={handleTap} />
        </div>
        );
      })}
      {/* Dust particles — textured circles, big ones show poster thumbnails */}
      {dust.map((d, i) => {
        // Random texture per particle based on index
        const texType = i % 4;
        const bg = d.poster
          ? "transparent"
          : texType === 0
            ? `radial-gradient(circle at 35% 35%, ${d.color}, transparent 70%)`
            : texType === 1
              ? `radial-gradient(circle at 50% 50%, white 0%, ${d.color} 40%, transparent 75%)`
              : texType === 2
                ? `linear-gradient(135deg, ${d.color} 0%, transparent 60%), radial-gradient(circle, ${d.color} 30%, transparent 70%)`
                : `radial-gradient(circle at 60% 40%, ${d.color}cc 0%, ${d.color}66 50%, transparent 80%)`;

        return (
          <div
            key={d.id}
            ref={(el) => {
              if (el) dustMapRef.current.set(d.id, el);
              else dustMapRef.current.delete(d.id);
            }}
            className="absolute left-0 top-0 rounded-full overflow-hidden"
            style={{
              display: "none",
              width: d.size,
              height: d.size,
              background: bg,
              opacity: d.opacity,
              zIndex: 1,
              willChange: "transform",
            }}
          >
            {d.poster && (
              <img
                src={d.poster}
                alt=""
                className="w-full h-full object-cover rounded-full"
                loading="lazy"
              />
            )}
          </div>
        );
      })}
    </>
  );
});

export default ShowCards;
