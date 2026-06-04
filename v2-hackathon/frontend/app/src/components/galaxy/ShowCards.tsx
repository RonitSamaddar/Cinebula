/**
 * ShowCards — Container that positions all show cards in the galaxy.
 * Uses imperative DOM updates for 60fps panning.
 * Viewport constraint: only shows max 10 non-overlapping shows on screen at any time.
 */

"use client";

import { useRef, useImperativeHandle, forwardRef, useState, useCallback, useEffect } from "react";
import type { Show } from "@/types";
import { WORLD_W, WORLD_H, MAX_SHOWS_ON_SCREEN, ICON_DIMS } from "@/config/galaxy";
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
}

const ShowCards = forwardRef<ShowCardsHandle, ShowCardsProps>(function ShowCards({ onShowTap }, ref) {
  const [shows, setShowsState] = useState<Show[]>([]);
  const elMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastCamRef = useRef({ x: WORLD_W / 2, y: WORLD_H / 2 });
  const lastZoomRef = useRef(1);
  const showsRef = useRef<Show[]>([]);
  // Track which shows are currently visible — they stay visible until off-screen
  const visibleSetRef = useRef<Set<string>>(new Set());

  // Keep showsRef in sync
  useEffect(() => {
    showsRef.current = shows;
  }, [shows]);

  // When show set changes, reset visible tracking
  useEffect(() => {
    visibleSetRef.current.clear();
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

    interface ScreenShow {
      show: Show;
      sx: number;
      sy: number;
      w: number;
      h: number;
      el: HTMLDivElement;
    }

    const inViewport: ScreenShow[] = [];
    const visibleSet = visibleSetRef.current;

    // Step 1: Compute screen positions, partition into in-viewport vs off-screen
    for (const show of showsRef.current) {
      const el = elMapRef.current.get(show.id);
      if (!el) continue;

      const dx = wrapOffset(cx, show.worldX, WORLD_W) * zoom;
      const dy = wrapOffset(cy, show.worldY, WORLD_H) * zoom;
      const sx = halfW + dx;
      const sy = halfH + dy;

      const dims = ICON_DIMS[show.size] || ICON_DIMS.s;
      const cardW = dims.w;
      const cardH = dims.h;

      // Check if show is within viewport (with margin)
      const inBounds =
        sx + cardW / 2 > -margin &&
        sx - cardW / 2 < vw + margin &&
        sy + cardH / 2 > -margin &&
        sy - cardH / 2 < vh + margin;

      if (inBounds) {
        inViewport.push({ show, sx, sy, w: cardW, h: cardH, el });
      } else {
        // Off-screen: hide and remove from visible set
        el.style.display = "none";
        visibleSet.delete(show.id);
      }
    }

    // Step 2: Separate shows already visible (they stay) from new entrants
    const alreadyVisible: ScreenShow[] = [];
    const newEntrants: ScreenShow[] = [];

    for (const s of inViewport) {
      if (visibleSet.has(s.show.id)) {
        alreadyVisible.push(s);
      } else {
        newEntrants.push(s);
      }
    }

    // Step 3: Position all already-visible shows (they never disappear while in viewport)
    interface Placed { sx: number; sy: number; w: number; h: number }
    const placed: Placed[] = [];

    for (const s of alreadyVisible) {
      s.el.style.display = "block";
      s.el.style.transform = `translate(${s.sx}px, ${s.sy}px) translate(-50%, -50%)`;
      s.el.style.opacity = "1";
      placed.push({ sx: s.sx, sy: s.sy, w: s.w, h: s.h });
    }

    // Step 4: For new entrants, sort by priority desc, check overlap + max cap
    newEntrants.sort((a, b) => b.show.match - a.show.match);

    for (const s of newEntrants) {
      // Don't exceed max shows on screen
      if (placed.length >= MAX_SHOWS_ON_SCREEN) {
        s.el.style.display = "none";
        continue;
      }

      // Check >50% overlap with any currently placed show
      let hasOverlap = false;
      for (const p of placed) {
        const overlapX = Math.max(0, Math.min(p.sx + p.w / 2, s.sx + s.w / 2) - Math.max(p.sx - p.w / 2, s.sx - s.w / 2));
        const overlapY = Math.max(0, Math.min(p.sy + p.h / 2, s.sy + s.h / 2) - Math.max(p.sy - p.h / 2, s.sy - s.h / 2));
        const intersectionArea = overlapX * overlapY;
        const sArea = s.w * s.h;
        if (intersectionArea > sArea * 0.5) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        s.el.style.display = "block";
        s.el.style.transform = `translate(${s.sx}px, ${s.sy}px) translate(-50%, -50%)`;
        s.el.style.opacity = "1";
        placed.push({ sx: s.sx, sy: s.sy, w: s.w, h: s.h });
        visibleSet.add(s.show.id);
      } else {
        s.el.style.display = "none";
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
          }}
        >
          <ShowCard show={show} onTap={handleTap} />
        </div>
      ))}
    </>
  );
});

export default ShowCards;
