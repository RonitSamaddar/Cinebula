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
import ConnectDialog from "@/components/chrome/ConnectDialog";
import LoadingScreen from "@/components/chrome/LoadingScreen";
import QRScanner from "@/components/chrome/QRScanner";
import { loginAndFetchGenres, fetchGenreMovies, backendMoviesToShows, LOAD_ORDER_CENTER, LOAD_ORDER_SIDES, LOAD_ORDER_REMAINING } from "@/services/backend";
import { buildCategories } from "@/data/categories";
import { initAudio, toggleAudio, isAudioPlaying } from "@/lib/audio";
import type { Show, Category } from "@/types";
import { CATEGORIES } from "@/data/categories";
import { WORLD_W, WORLD_H } from "@/config/galaxy";
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
  const [zoomLevel, setZoomLevel] = useState(0); // 0, 1, 2
  const zoomRef = useRef(1);
  const zoomAnimRef = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const galaxyContainerRef = useRef<HTMLDivElement>(null);
  const z0ShowsRef = useRef<Show[]>([]);
  const z1ShowsRef = useRef<Show[]>([]);
  const z2ShowsRef = useRef<Show[]>([]);
  const allShowsRef = useRef<Show[]>([]);

  // Connection flow states
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

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

  // Zoom in at current camera position (to 3× scale)
  const zoomIn = useCallback(() => {
    cancelAnimationFrame(momentumRef.current);
    cancelAnimationFrame(flyAnimRef.current);
    cancelAnimationFrame(zoomAnimRef.current);

    const cx = cameraRef.current.x;
    const cy = cameraRef.current.y;
    const startZoom = zoomRef.current;
    const newLevel = Math.min(2, zoomLevel + 1);
    const targetZoom = newLevel === 0 ? 1 : newLevel === 1 ? 2.5 : 5;
    const duration = 600;
    const startT = performance.now();

    setZoomLevel(newLevel);

    // Switch to appropriate show set for this zoom level
    const showSet = newLevel === 0 ? z0ShowsRef.current : newLevel === 1 ? z1ShowsRef.current : z2ShowsRef.current;
    cardsRef.current?.setShows(showSet);

    const tick = (now: number) => {
      const t = Math.min(1, (now - startT) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      zoomRef.current = startZoom + (targetZoom - startZoom) * ease;
      pushCamera(cx, cy);
      if (t < 1) zoomAnimRef.current = requestAnimationFrame(tick);
    };
    zoomAnimRef.current = requestAnimationFrame(tick);
  }, [pushCamera, zoomLevel]);

  // Zoom out (decrease zoom level)
  const zoomOut = useCallback(() => {
    cancelAnimationFrame(momentumRef.current);
    cancelAnimationFrame(flyAnimRef.current);
    cancelAnimationFrame(zoomAnimRef.current);

    const startZoom = zoomRef.current;
    const newLevel = Math.max(0, zoomLevel - 1);
    const targetZoom = newLevel === 0 ? 1 : newLevel === 1 ? 2.5 : 5;
    const duration = 600;
    const startT = performance.now();
    const cx = cameraRef.current.x;
    const cy = cameraRef.current.y;

    // Switch to appropriate show set for this zoom level
    const showSet = newLevel === 0 ? z0ShowsRef.current : newLevel === 1 ? z1ShowsRef.current : z2ShowsRef.current;
    cardsRef.current?.setShows(showSet);

    const tick = (now: number) => {
      const t = Math.min(1, (now - startT) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      zoomRef.current = startZoom + (targetZoom - startZoom) * ease;
      pushCamera(cx, cy);
      if (t < 1) {
        zoomAnimRef.current = requestAnimationFrame(tick);
      } else {
        setZoomLevel(newLevel);
      }
    };
    zoomAnimRef.current = requestAnimationFrame(tick);
  }, [pushCamera, zoomLevel]);

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
        <ShowCards ref={cardsRef} onShowTap={(show, sx, sy) => setSelectedShow({ show, sx, sy })} />
        <CategoryLabels ref={labelsRef} />
        <UserRing />
        {zoomLevel === 0 && <CategoryPill ref={pillRef} visible={isDragging} />}
        {zoomLevel === 0 && <CompassLabels ref={compassRef} onNavigate={flyTo} visible={!isDragging} />}

        {/* Alien companion */}
        <AlienCompanion
          suppressBubbles={!!selectedShow || queueOpen || menuOpen || recOpen}
          onRecTap={() => setRecOpen(true)}
        />

        {/* Burger menu button */}
        {zoomLevel === 0 && (
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

        {/* Zoom +/- buttons */}
        <div
          className="pointer-events-auto absolute flex flex-col gap-2"
          style={{
            bottom: "max(calc(env(safe-area-inset-bottom, 12px) + 16px), 28px)",
            right: 16,
            zIndex: 20,
          }}
        >
          <button
            className="flex items-center justify-center rounded-full active:scale-90 transition-all duration-200"
            style={{
              width: 52,
              height: 52,
              background: zoomLevel >= 2
                ? "rgba(30, 25, 50, 0.5)"
                : "linear-gradient(135deg, rgba(100, 80, 220, 0.9), rgba(140, 100, 255, 0.8))",
              border: zoomLevel >= 2
                ? "1px solid rgba(255,255,255,0.08)"
                : "2px solid rgba(180, 160, 255, 0.6)",
              backdropFilter: "blur(12px)",
              opacity: zoomLevel >= 2 ? 0.35 : 1,
              boxShadow: zoomLevel >= 2 ? "none" : "0 0 20px rgba(140, 100, 255, 0.4), 0 4px 12px rgba(0,0,0,0.4)",
            }}
            disabled={zoomLevel >= 2}
            onClick={() => { if (zoomLevel < 2) zoomIn(); }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button
            className="flex items-center justify-center rounded-full active:scale-90 transition-all duration-200"
            style={{
              width: 52,
              height: 52,
              background: zoomLevel <= 0
                ? "rgba(30, 25, 50, 0.5)"
                : "linear-gradient(135deg, rgba(100, 80, 220, 0.9), rgba(140, 100, 255, 0.8))",
              border: zoomLevel <= 0
                ? "1px solid rgba(255,255,255,0.08)"
                : "2px solid rgba(180, 160, 255, 0.6)",
              backdropFilter: "blur(12px)",
              opacity: zoomLevel <= 0 ? 0.35 : 1,
              boxShadow: zoomLevel <= 0 ? "none" : "0 0 20px rgba(140, 100, 255, 0.4), 0 4px 12px rgba(0,0,0,0.4)",
            }}
            disabled={zoomLevel <= 0}
            onClick={() => { if (zoomLevel > 0) zoomOut(); }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
        </div>

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
          onBackendShows={(data, categories) => {
            categoriesRef.current = categories;
            z0ShowsRef.current = data.z0;
            z1ShowsRef.current = data.z1;
            z2ShowsRef.current = data.z2;
            allShowsRef.current = data.z0;
            cardsRef.current?.setShows(data.z0);
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

      {/* Initial connect dialog — shown before QR scan */}
      {!connected && !loading && !scannerOpen && (
        <ConnectDialog onConnect={() => setScannerOpen(true)} />
      )}

      {/* QR Scanner (initial flow) */}
      {!connected && scannerOpen && (
        <QRScanner
          onScan={(deviceId) => {
            setScannerOpen(false);
            setLoading(true);
            setConnected(true); // Show galaxy underneath loading screen

            // Progressive loading runs underneath the opaque loading screen
            (async () => {
              const session = await loginAndFetchGenres(deviceId);
              if (!session || session.topGenres.length === 0) {
                setLoading(false);
                return;
              }

              const { topGenres, token } = session;
              const categories = buildCategories(topGenres.map(g => g.genre));
              categoriesRef.current = categories;

              const moviesByGenre: Record<string, import("@/services/backend").MoviesResponse> = {};

              // Helper: rebuild shows from whatever we have so far
              const rebuildShows = () => {
                const data = backendMoviesToShows(topGenres, moviesByGenre, categories);
                z0ShowsRef.current = data.z0;
                z1ShowsRef.current = data.z1;
                z2ShowsRef.current = data.z2;
                allShowsRef.current = data.z0;
                cardsRef.current?.setShows(data.z0);
              };

              // Start 10s loading timer — loading screen stays for exactly 10s
              const loadingStart = Date.now();
              const LOADING_DURATION = 15000;

              // Phase 1: Load center genre (position index 3)
              const centerIdx = Math.min(LOAD_ORDER_CENTER, topGenres.length - 1);
              const centerGenre = topGenres[centerIdx];
              if (centerGenre) {
                const result = await fetchGenreMovies(centerGenre.genre, token);
                if (result?.movies?.length) moviesByGenre[centerGenre.genre] = result;
              }
              rebuildShows();

              // Phase 2: Load 4 side genres one by one
              for (const idx of LOAD_ORDER_SIDES) {
                if (idx >= topGenres.length) continue;
                const g = topGenres[idx];
                const result = await fetchGenreMovies(g.genre, token);
                if (result?.movies?.length) {
                  moviesByGenre[g.genre] = result;
                  rebuildShows();
                }
              }

              // Phase 3: Load remaining genres
              for (const idx of LOAD_ORDER_REMAINING) {
                if (idx >= topGenres.length) continue;
                const g = topGenres[idx];
                const result = await fetchGenreMovies(g.genre, token);
                if (result?.movies?.length) {
                  moviesByGenre[g.genre] = result;
                  rebuildShows();
                }
              }

              // Wait until 10s have passed since loading started
              const elapsed = Date.now() - loadingStart;
              if (elapsed < LOADING_DURATION) {
                await new Promise((r) => setTimeout(r, LOADING_DURATION - elapsed));
              }
              setLoading(false);
            })();
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* Loading screen — while fetching genres/shows */}
      {loading && <LoadingScreen />}
    </div>
  );
}
