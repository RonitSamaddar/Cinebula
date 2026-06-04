"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import GalaxyBackground from "@/components/galaxy/GalaxyBackground";
import CategoryLabels from "@/components/galaxy/CategoryLabels";
import ShowCards, { type ShowCardsHandle } from "@/components/galaxy/ShowCards";
import UserRing from "@/components/galaxy/UserRing";
import CategoryPill, { type CategoryPillHandle } from "@/components/chrome/CategoryPill";
import CompassLabels, { type CompassLabelsHandle } from "@/components/chrome/CompassLabels";
import DetailPopup from "@/components/chrome/DetailPopup";
import QueuePanel from "@/components/chrome/QueuePanel";
import MenuDrawer from "@/components/chrome/MenuDrawer";
import AlienCompanion from "@/components/chrome/AlienCompanion";
import RecDialog from "@/components/chrome/RecDialog";
import { initAudio, toggleAudio, isAudioPlaying } from "@/lib/audio";
import type { Show, Category } from "@/types";
import { CATEGORIES } from "@/data/categories";
import { WORLD_W, WORLD_H, ZOOM_IN_SCALE, ZOOM_OUT_SCALE } from "@/config/galaxy";
import { searchShows, spiralLayout, hasActiveFilters as checkFilters, type SearchFilters } from "@/lib/search";

const wrap = (v: number, max: number) => ((v % max) + max) % max;

export default function Home() {
  // Raw unwrapped camera — accumulates freely, never jumps
  const cameraRef = useRef({ x: WORLD_W / 2, y: WORLD_H / 2 });
  const velRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0, lastT: 0, startX: 0, startY: 0 });
  const momentumRef = useRef(0);
  const galaxyRef = useRef<{ update: (x: number, y: number) => void } | null>(null);
  const labelsRef = useRef<{ update: (x: number, y: number, zoom?: number) => void } | null>(null);
  const cardsRef = useRef<ShowCardsHandle | null>(null);
  const pillRef = useRef<CategoryPillHandle | null>(null);
  const compassRef = useRef<CompassLabelsHandle | null>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const flyAnimRef = useRef(0);
  const categoriesRef = useRef<Category[]>([]);
  const [hasDragged, setHasDragged] = useState(false);
  const [selectedShow, setSelectedShow] = useState<{ show: Show; sx: number; sy: number } | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const zoomRef = useRef(1);
  const zoomAnimRef = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const galaxyContainerRef = useRef<HTMLDivElement>(null);
  const allShowsRef = useRef<Show[]>([]); // current visible set
  const zoomOutShowsRef = useRef<Show[]>([]); // 5 per region
  const zoomInShowsRef = useRef<Show[]>([]); // 100 per region

  // Init audio context on first render
  useEffect(() => {
    initAudio();
  }, []);

  // Full camera push — updates all layers
  const pushCamera = useCallback((x: number, y: number) => {
    cameraRef.current = { x, y };
    galaxyRef.current?.update(x, y);
    const wx = wrap(x, WORLD_W);
    const wy = wrap(y, WORLD_H);
    const z = zoomRef.current;
    labelsRef.current?.update(wx, wy, z);
    cardsRef.current?.update(wx, wy, z);
    pillRef.current?.update(wx, wy);
    compassRef.current?.update(wx, wy);
  }, []);

  // Fly-to animation — 800ms cubic ease-out to target world coords
  const flyTo = useCallback((worldX: number, worldY: number) => {
    cancelAnimationFrame(momentumRef.current);
    cancelAnimationFrame(flyAnimRef.current);

    const startX = cameraRef.current.x;
    const startY = cameraRef.current.y;
    // Compute shortest wrapped delta
    let dx = worldX - wrap(startX, WORLD_W);
    let dy = worldY - wrap(startY, WORLD_H);
    if (dx > WORLD_W / 2) dx -= WORLD_W;
    if (dx < -WORLD_W / 2) dx += WORLD_W;
    if (dy > WORLD_H / 2) dy -= WORLD_H;
    if (dy < -WORLD_H / 2) dy += WORLD_H;

    const duration = 800;
    const startT = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - startT) / duration);
      // Cubic ease-out: 1 - (1-t)^3
      const ease = 1 - Math.pow(1 - t, 3);
      pushCamera(startX + dx * ease, startY + dy * ease);
      if (t < 1) flyAnimRef.current = requestAnimationFrame(tick);
    };
    flyAnimRef.current = requestAnimationFrame(tick);

    if (!hasDragged) {
      setHasDragged(true);
      if (hintRef.current) hintRef.current.style.display = "none";
    }
  }, [pushCamera, hasDragged]);

  // Find nearest category to current camera
  const getNearestCategory = useCallback(() => {
    const wx = wrap(cameraRef.current.x, WORLD_W);
    const wy = wrap(cameraRef.current.y, WORLD_H);
    let best: Category | null = null;
    let bestDist = Infinity;
    for (const cat of CATEGORIES) {
      const cx = cat.position.x * WORLD_W;
      const cy = cat.position.y * WORLD_H;
      let dx = cx - wx;
      let dy = cy - wy;
      if (dx > WORLD_W / 2) dx -= WORLD_W;
      if (dx < -WORLD_W / 2) dx += WORLD_W;
      if (dy > WORLD_H / 2) dy -= WORLD_H;
      if (dy < -WORLD_H / 2) dy += WORLD_H;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) { bestDist = dist; best = cat; }
    }
    return best;
  }, []);

  // Zoom in at current camera position
  const zoomIn = useCallback(() => {
    cancelAnimationFrame(momentumRef.current);
    cancelAnimationFrame(flyAnimRef.current);
    cancelAnimationFrame(zoomAnimRef.current);

    const cx = cameraRef.current.x;
    const cy = cameraRef.current.y;
    const startZoom = zoomRef.current;
    const targetZoom = 2.5;
    const duration = 600;
    const startT = performance.now();

    setZoomed(true);

    // Use all backend shows (already loaded)
    cardsRef.current?.setShows(allShowsRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - startT) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      zoomRef.current = startZoom + (targetZoom - startZoom) * ease;
      pushCamera(cx, cy);
      if (t < 1) zoomAnimRef.current = requestAnimationFrame(tick);
    };
    zoomAnimRef.current = requestAnimationFrame(tick);
  }, [pushCamera]);

  // Zoom out to galaxy view
  const zoomOut = useCallback(() => {
    cancelAnimationFrame(momentumRef.current);
    cancelAnimationFrame(flyAnimRef.current);
    cancelAnimationFrame(zoomAnimRef.current);

    const startZoom = zoomRef.current;
    const targetZoom = 1;
    const duration = 600;
    const startT = performance.now();
    const cx = cameraRef.current.x;
    const cy = cameraRef.current.y;

    // Restore shows for galaxy view (use whatever is currently loaded)
    cardsRef.current?.setShows(allShowsRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - startT) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      zoomRef.current = startZoom + (targetZoom - startZoom) * ease;
      pushCamera(cx, cy);
      if (t < 1) {
        zoomAnimRef.current = requestAnimationFrame(tick);
      } else {
        setZoomed(false);
      }
    };
    zoomAnimRef.current = requestAnimationFrame(tick);
  }, [pushCamera]);

  // Load data + trigger initial position for all layers
  useEffect(() => {
    // Position background/labels/pill immediately
    pushCamera(cameraRef.current.x, cameraRef.current.y);
    // Set categories for labels (no mock shows — wait for backend)
    categoriesRef.current = CATEGORIES;
  }, [pushCamera]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (selectedShow || queueOpen) return;
    cancelAnimationFrame(momentumRef.current);
    cancelAnimationFrame(flyAnimRef.current);
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, lastT: performance.now(), startX: e.clientX, startY: e.clientY };
    velRef.current = { x: 0, y: 0 };
    // Mark dragging
    if (dragIdleTimer.current) clearTimeout(dragIdleTimer.current);
    setIsDragging(true);
  }, [selectedShow, queueOpen]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    velRef.current = { x: -dx / dt * 16, y: -dy / dt * 16 };
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    d.lastT = now;
    pushCamera(cameraRef.current.x - dx, cameraRef.current.y - dy);

    if (!hasDragged && (Math.abs(e.clientX - d.startX) > 10 || Math.abs(e.clientY - d.startY) > 10)) {
      setHasDragged(true);
      if (hintRef.current) hintRef.current.style.display = "none";
    }
  }, [pushCamera, hasDragged]);

  const onPointerUp = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    // Mark idle after momentum settles
    if (dragIdleTimer.current) clearTimeout(dragIdleTimer.current);
    dragIdleTimer.current = setTimeout(() => setIsDragging(false), 600);
    const decay = 0.95;
    const tick = () => {
      velRef.current.x *= decay;
      velRef.current.y *= decay;
      if (Math.abs(velRef.current.x) < 0.1 && Math.abs(velRef.current.y) < 0.1) return;
      pushCamera(cameraRef.current.x + velRef.current.x, cameraRef.current.y + velRef.current.y);
      momentumRef.current = requestAnimationFrame(tick);
    };
    momentumRef.current = requestAnimationFrame(tick);
  }, [pushCamera]);

  useEffect(() => () => {
    cancelAnimationFrame(momentumRef.current);
    cancelAnimationFrame(flyAnimRef.current);
    cancelAnimationFrame(zoomAnimRef.current);
  }, []);

  // Pinch-to-zoom via native touch events
  useEffect(() => {
    const el = galaxyContainerRef.current;
    if (!el) return;

    const getTouchDist = (e: TouchEvent) => {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = { startDist: getTouchDist(e), active: true };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current.active) {
        e.preventDefault(); // prevent browser zoom
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!pinchRef.current.active) return;
      if (e.touches.length < 2) {
        // Pinch ended — check direction
        const endDist = e.changedTouches.length > 0 && e.touches.length === 1
          ? Math.sqrt(
              Math.pow(e.touches[0].clientX - e.changedTouches[0].clientX, 2) +
              Math.pow(e.touches[0].clientY - e.changedTouches[0].clientY, 2)
            )
          : 0;
        // Use the last known distance from move events
        pinchRef.current.active = false;
      }
    };

    // Track last distance during move for final comparison
    let lastDist = 0;
    const onTouchMoveTrack = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current.active) {
        lastDist = getTouchDist(e);
        e.preventDefault();
      }
    };

    const onTouchEndFinal = (e: TouchEvent) => {
      if (!pinchRef.current.active) return;
      if (e.touches.length < 2) {
        const ratio = lastDist / pinchRef.current.startDist;
        pinchRef.current.active = false;
        if (ratio > 1.3) {
          // Pinch out (spread) → zoom in
          if (zoomRef.current < 2) zoomIn();
        } else if (ratio < 0.7) {
          // Pinch in (pinch) → zoom out
          if (zoomRef.current > 1.5) zoomOut();
        }
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMoveTrack, { passive: false });
    el.addEventListener("touchend", onTouchEndFinal, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMoveTrack);
      el.removeEventListener("touchend", onTouchEndFinal);
    };
  }, [zoomIn, zoomOut]);

  // Search: filter shows + spiral layout
  const handleSearch = useCallback((filters: SearchFilters) => {
    setMenuOpen(false);
    const hasFilters = checkFilters(filters);
    setActiveFilters(hasFilters);
    if (!hasFilters) {
      // No filters → restore original
      cardsRef.current?.setShows(allShowsRef.current);
      return;
    }
    // Run search on all loaded shows
    const matched = searchShows(allShowsRef.current, filters);
    const cx = wrap(cameraRef.current.x, WORLD_W);
    const cy = wrap(cameraRef.current.y, WORLD_H);
    const laid = spiralLayout(matched, cx, cy);
    cardsRef.current?.setShows(laid);
    // Push camera to center so spiral is visible
    pushCamera(cx, cy);
  }, [pushCamera]);

  const handleReset = useCallback(() => {
    setMenuOpen(false);
    setActiveFilters(false);
    cardsRef.current?.setShows(allShowsRef.current);
  }, []);

  return (
    <div className="flex h-dvh w-full flex-col bg-[#07070c]">
      {/* Galaxy area — fills remaining space above queue bar */}
      <div
        ref={galaxyContainerRef}
        className="relative flex-1 overflow-hidden"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <GalaxyBackground ref={galaxyRef} />
        <ShowCards ref={cardsRef} onShowTap={(show, sx, sy) => setSelectedShow({ show, sx, sy })} edgeFade={!isDragging} />
        <CategoryLabels ref={labelsRef} />
        <UserRing />
        {!zoomed && <CategoryPill ref={pillRef} visible={isDragging} />}
        {!zoomed && <CompassLabels ref={compassRef} onNavigate={flyTo} visible={!isDragging} />}

        {/* Alien companion */}
        <AlienCompanion
          suppressBubbles={!!selectedShow || queueOpen || menuOpen || recOpen}
          onRecTap={() => setRecOpen(true)}
        />

        {/* Burger menu button */}
        {!zoomed && (
          <button
            className="pointer-events-auto absolute flex flex-col items-center justify-center gap-[4px] rounded-full active:scale-90"
            style={{
              top: "max(calc(env(safe-area-inset-top, 12px) + 8px), 20px)",
              left: 16,
              zIndex: 20,
              width: 36,
              height: 36,
              background: "rgba(14, 12, 24, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(8px)",
            }}
            onClick={() => setMenuOpen(true)}
          >
            <span className="block h-[1.5px] w-[14px] rounded-full bg-white/70" />
            <span className="block h-[1.5px] w-[14px] rounded-full bg-white/70" />
            <span className="block h-[1.5px] w-[14px] rounded-full bg-white/70" />
          </button>
        )}

        {/* Drag hint */}
        {!hasDragged && (
          <div
            ref={hintRef}
            className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#6a6457]"
            style={{ zIndex: 10, animation: "breathe 3s ease-in-out infinite" }}
          >
            DRAG TO EXPLORE
          </div>
        )}
      </div>

      {/* Overlays — rendered at root level for full-screen coverage */}
      {queueOpen && <QueuePanel onClose={() => setQueueOpen(false)} />}

      {menuOpen && (
        <MenuDrawer
          onClose={() => setMenuOpen(false)}
          onSearch={handleSearch}
          onReset={handleReset}
          hasActiveFilters={activeFilters}
          audioOn={audioOn}
          onAudioToggle={() => {
            const playing = toggleAudio();
            setAudioOn(playing);
          }}
          onViewQueue={() => { setMenuOpen(false); setQueueOpen(true); }}
          onBackendShows={(shows, categories) => {
            categoriesRef.current = categories;
            allShowsRef.current = shows;
            cardsRef.current?.setShows(shows);
          }}
        />
      )}

      {selectedShow && (
        <DetailPopup
          show={selectedShow.show}
          screenX={selectedShow.sx}
          screenY={selectedShow.sy}
          onClose={() => setSelectedShow(null)}
        />
      )}

      {recOpen && (
        <RecDialog
          shows={allShowsRef.current}
          onClose={() => setRecOpen(false)}
        />
      )}
    </div>
  );
}
