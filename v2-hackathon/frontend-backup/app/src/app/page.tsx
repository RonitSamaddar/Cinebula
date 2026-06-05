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
  const zoomLevelRef = useRef(0);
  const pinchActiveRef = useRef(false);
  const pinchStartDistRef = useRef(0);
  const pinchStartZoomRef = useRef(1);
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
  const dustRef = useRef<import("@/services/backend").DustParticle[]>([]);

  // Connection flow states
  const [connected, setConnected] = useState(true); // skip QR — go straight to galaxy
  const [loading, setLoading] = useState(true);     // start loading immediately
  const [scannerOpen, setScannerOpen] = useState(false);

  // Init audio context on first render
  useEffect(() => {
    initAudio();
  }, []);

  // Auto-load galaxy data on mount (bypasses QR flow)
  useEffect(() => {
    (async () => {
      const deviceId = "direct-access"; // skip QR
      const session = await loginAndFetchGenres(deviceId);
      if (!session || session.topGenres.length === 0) {
        setLoading(false);
        return;
      }

      const { topGenres, token } = session;
      const categories = buildCategories(topGenres.map(g => g.genre));
      categoriesRef.current = categories;

      const moviesByGenre: Record<string, import("@/services/backend").MoviesResponse> = {};

      const rebuildShows = () => {
        const data = backendMoviesToShows(topGenres, moviesByGenre, categories);
        z0ShowsRef.current = data.z0;
        z1ShowsRef.current = data.z1;
        z2ShowsRef.current = data.z2;
        allShowsRef.current = data.z0;
        dustRef.current = data.dust;
        cardsRef.current?.setShows(data.z0, data.dust);
      };

      const loadingStart = Date.now();
      const LOADING_DURATION = 15000;

      // Phase 1: center
      const centerIdx = Math.min(LOAD_ORDER_CENTER, topGenres.length - 1);
      const centerGenre = topGenres[centerIdx];
      if (centerGenre) {
        const result = await fetchGenreMovies(centerGenre.genre, token);
        if (result?.movies?.length) moviesByGenre[centerGenre.genre] = result;
      }
      rebuildShows();

      // Phase 2: sides
      for (const idx of LOAD_ORDER_SIDES) {
        if (idx >= topGenres.length) continue;
        const g = topGenres[idx];
        const result = await fetchGenreMovies(g.genre, token);
        if (result?.movies?.length) {
          moviesByGenre[g.genre] = result;
          rebuildShows();
        }
      }

      // Phase 3: remaining
      for (const idx of LOAD_ORDER_REMAINING) {
        if (idx >= topGenres.length) continue;
        const g = topGenres[idx];
        const result = await fetchGenreMovies(g.genre, token);
        if (result?.movies?.length) {
          moviesByGenre[g.genre] = result;
          rebuildShows();
        }
      }

      const elapsed = Date.now() - loadingStart;
      if (elapsed < LOADING_DURATION) {
        await new Promise((r) => setTimeout(r, LOADING_DURATION - elapsed));
      }
      setLoading(false);
    })();
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

    if (!hasDraggedRef.current) {
      hasDraggedRef.current = true;
      setHasDragged(true);
      if (hintRef.current) hintRef.current.style.display = "none";
    }
  }, [pushCamera]);

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

  // Continuous zoom — adjusts camera so the focal screen point stays fixed
  const applyZoom = useCallback((newZoom: number, focalScreenX?: number, focalScreenY?: number) => {
    const oldZoom = zoomRef.current;
    const clamped = Math.max(1, Math.min(5, newZoom));
    if (Math.abs(clamped - oldZoom) < 0.001) return;

    // Adjust camera so the world point under the focal stays in place
    if (focalScreenX !== undefined && focalScreenY !== undefined) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const fx = focalScreenX - vw / 2;
      const fy = focalScreenY - vh / 2;
      cameraRef.current.x += fx * (1 / oldZoom - 1 / clamped);
      cameraRef.current.y += fy * (1 / oldZoom - 1 / clamped);
    }

    zoomRef.current = clamped;

    // Determine show-set level from continuous zoom value
    let newLevel: number;
    if (clamped < 1.75) newLevel = 0;
    else if (clamped < 3.75) newLevel = 1;
    else newLevel = 2;

    // Switch show set when crossing a threshold
    if (newLevel !== zoomLevelRef.current) {
      zoomLevelRef.current = newLevel;
      const showSet = newLevel === 0 ? z0ShowsRef.current : newLevel === 1 ? z1ShowsRef.current : z2ShowsRef.current;
      if (showSet.length > 0) cardsRef.current?.setShows(showSet);
      setZoomLevel(newLevel);
    }

    pushCamera(cameraRef.current.x, cameraRef.current.y);
  }, [pushCamera]);

  // Load data + trigger initial position for all layers
  useEffect(() => {
    // Position background/labels/pill immediately
    pushCamera(cameraRef.current.x, cameraRef.current.y);
    // Set categories for labels (no mock shows — wait for backend)
    categoriesRef.current = CATEGORIES;
  }, [pushCamera]);

  // rAF-throttled drag: accumulate pointer deltas, apply once per frame
  const pendingDragRef = useRef<{ dx: number; dy: number; clientX: number; clientY: number } | null>(null);
  const dragRafRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const isDraggingRef = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (selectedShow || queueOpen || pinchActiveRef.current) return;
    cancelAnimationFrame(momentumRef.current);
    cancelAnimationFrame(flyAnimRef.current);
    cancelAnimationFrame(dragRafRef.current);
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, lastT: performance.now(), startX: e.clientX, startY: e.clientY };
    velRef.current = { x: 0, y: 0 };
    pendingDragRef.current = null;
    // Use ref to avoid re-render during drag
    if (dragIdleTimer.current) clearTimeout(dragIdleTimer.current);
    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
      setIsDragging(true);
    }
  }, [selectedShow, queueOpen]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.active || pinchActiveRef.current) return;
    const rawDx = e.clientX - d.lastX;
    const rawDy = e.clientY - d.lastY;
    // Scale drag by inverse zoom so card movement matches finger movement
    const z = zoomRef.current;
    const dx = rawDx / z;
    const dy = rawDy / z;
    const now = performance.now();
    const dt = Math.max(8, now - d.lastT); // clamp to ~120fps minimum to prevent velocity spikes
    // Exponential smoothing on velocity (0.3 new, 0.7 old) to prevent jitter
    const rawVx = -dx / dt * 16;
    const rawVy = -dy / dt * 16;
    velRef.current = {
      x: velRef.current.x * 0.7 + rawVx * 0.3,
      y: velRef.current.y * 0.7 + rawVy * 0.3,
    };
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    d.lastT = now;

    // Accumulate delta — only push to camera once per rAF
    if (pendingDragRef.current) {
      pendingDragRef.current.dx += dx;
      pendingDragRef.current.dy += dy;
      pendingDragRef.current.clientX = e.clientX;
      pendingDragRef.current.clientY = e.clientY;
    } else {
      pendingDragRef.current = { dx, dy, clientX: e.clientX, clientY: e.clientY };
      dragRafRef.current = requestAnimationFrame(() => {
        const p = pendingDragRef.current;
        if (!p) return;
        const z = zoomRef.current || 1;
        pushCamera(cameraRef.current.x - p.dx / z, cameraRef.current.y - p.dy / z);

        if (!hasDraggedRef.current && (Math.abs(p.clientX - d.startX) > 10 || Math.abs(p.clientY - d.startY) > 10)) {
          hasDraggedRef.current = true;
          setHasDragged(true);
          if (hintRef.current) hintRef.current.style.display = "none";
        }
        pendingDragRef.current = null;
      });
    }
  }, [pushCamera]);

  const onPointerUp = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    cancelAnimationFrame(dragRafRef.current);
    // Flush any pending drag
    if (pendingDragRef.current) {
      const z = zoomRef.current || 1;
      pushCamera(cameraRef.current.x - pendingDragRef.current.dx / z, cameraRef.current.y - pendingDragRef.current.dy / z);
      pendingDragRef.current = null;
    }
    // Mark idle after momentum settles
    if (dragIdleTimer.current) clearTimeout(dragIdleTimer.current);
    dragIdleTimer.current = setTimeout(() => { isDraggingRef.current = false; setIsDragging(false); }, 600);
    const decay = 0.95;
    const tick = () => {
      velRef.current.x *= decay;
      velRef.current.y *= decay;
      if (Math.abs(velRef.current.x) < 0.1 && Math.abs(velRef.current.y) < 0.1) return;
      const z = zoomRef.current || 1;
      pushCamera(cameraRef.current.x + velRef.current.x / z, cameraRef.current.y + velRef.current.y / z);
      momentumRef.current = requestAnimationFrame(tick);
    };
    momentumRef.current = requestAnimationFrame(tick);
  }, [pushCamera]);

  useEffect(() => () => {
    cancelAnimationFrame(momentumRef.current);
    cancelAnimationFrame(flyAnimRef.current);
    cancelAnimationFrame(zoomAnimRef.current);
    cancelAnimationFrame(dragRafRef.current);
  }, []);

  // ── Pinch-to-zoom (touch) ──────────────────────────────────────────
  useEffect(() => {
    const el = galaxyContainerRef.current;
    if (!el) return;

    const getTouchDist = (t: TouchList) => {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        // Cancel any active drag — pinch takes over
        dragRef.current.active = false;
        cancelAnimationFrame(momentumRef.current);
        cancelAnimationFrame(dragRafRef.current);
        pinchActiveRef.current = true;
        pinchStartDistRef.current = getTouchDist(e.touches);
        pinchStartZoomRef.current = zoomRef.current;
        e.preventDefault();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && pinchActiveRef.current) {
        const dist = getTouchDist(e.touches);
        const ratio = dist / pinchStartDistRef.current;
        const newZoom = pinchStartZoomRef.current * ratio;
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        applyZoom(newZoom, midX, midY);
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchActiveRef.current = false;
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [applyZoom]);

  // ── Wheel-to-zoom (desktop) ────────────────────────────────────────
  useEffect(() => {
    const el = galaxyContainerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Multiplicative factor so zoom speed feels natural
      const factor = e.deltaY > 0 ? 0.94 : 1.06;
      applyZoom(zoomRef.current * factor, e.clientX, e.clientY);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

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
        {/* CategoryLabels and CategoryPill removed — compass center label replaces them */}
        {zoomLevel === 0 && <CompassLabels ref={compassRef} onNavigate={flyTo} visible={true} />}

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

      {/* Initial connect dialog — COMMENTED OUT (QR bypassed)
      {!connected && !loading && !scannerOpen && (
        <ConnectDialog onConnect={() => setScannerOpen(true)} />
      )}
      */}

      {/* QR Scanner — COMMENTED OUT (direct load)
      {!connected && scannerOpen && (
        <QRScanner
          onScan={(deviceId) => {
            setScannerOpen(false);
            setLoading(true);
            setConnected(true);
            (async () => {
              try {
                const session = await loginAndFetchGenres(deviceId);
                if (!session || !session.topGenres || session.topGenres.length === 0) {
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
              } catch (err) {
                console.error("[backend] QR scan loading failed:", err);
              } finally {
                setLoading(false);
              }
              const { topGenres, token } = session;
              const categories = buildCategories(topGenres.map(g => g.genre));
              categoriesRef.current = categories;
              const moviesByGenre: Record<string, import("@/services/backend").MoviesResponse> = {};
              const rebuildShows = () => {
                const data = backendMoviesToShows(topGenres, moviesByGenre, categories);
                z0ShowsRef.current = data.z0;
                z1ShowsRef.current = data.z1;
                z2ShowsRef.current = data.z2;
                allShowsRef.current = data.z0;
                cardsRef.current?.setShows(data.z0);
              };
              const loadingStart = Date.now();
              const LOADING_DURATION = 15000;
              const centerIdx = Math.min(LOAD_ORDER_CENTER, topGenres.length - 1);
              const centerGenre = topGenres[centerIdx];
              if (centerGenre) {
                const result = await fetchGenreMovies(centerGenre.genre, token);
                if (result?.movies?.length) moviesByGenre[centerGenre.genre] = result;
              }
              rebuildShows();
              for (const idx of LOAD_ORDER_SIDES) {
                if (idx >= topGenres.length) continue;
                const g = topGenres[idx];
                const result = await fetchGenreMovies(g.genre, token);
                if (result?.movies?.length) { moviesByGenre[g.genre] = result; rebuildShows(); }
              }
              for (const idx of LOAD_ORDER_REMAINING) {
                if (idx >= topGenres.length) continue;
                const g = topGenres[idx];
                const result = await fetchGenreMovies(g.genre, token);
                if (result?.movies?.length) { moviesByGenre[g.genre] = result; rebuildShows(); }
              }
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
      */}

      {/* Loading screen — while fetching genres/shows */}
      {loading && <LoadingScreen />}
    </div>
  );
}
