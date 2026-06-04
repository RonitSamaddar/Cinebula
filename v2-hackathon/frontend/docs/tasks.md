# TASKS.md — Cinebula PWA Build Plan

> Ordered task breakdown. Each task is a shippable increment. Build in this order.

---

## Phase 0: Project Scaffold
> Get the skeleton running on a phone in < 1 hour.

- [ ] **0.1** Init Next.js 15 project with TypeScript, Tailwind CSS 4, App Router
- [ ] **0.2** Configure `next/font` — Instrument Serif, JetBrains Mono, Inter
- [ ] **0.3** Set up `manifest.json` + iOS meta tags in root layout (PWA installable)
- [ ] **0.4** Create service worker (`public/sw.js`) — cache app shell
- [ ] **0.5** Set up Tailwind theme — colors, glassmorphism, safe areas
- [ ] **0.6** Create PWA icons (192, 512, 180px)
- [ ] **0.7** Create single-page layout: full-screen dark container with `100dvh`, `overscroll-behavior: none`, `touch-action: none`
- [ ] **0.8** Deploy skeleton to Vercel — verify "Add to Home Screen" on iPhone

**Milestone:** Empty dark screen runs as full-screen PWA on iPhone.

---

## Phase 1: Data Layer
> All show/category data ready for rendering.

- [ ] **1.1** Define TypeScript interfaces in `types/index.ts` (Show, Category, Connection, SessionMetrics)
- [ ] **1.2** Create `data/categories.ts` — 6 genre-based categories with keys, labels, accents, sphere positions
- [ ] **1.3** Create `data/shows.ts` — port all ~300 shows from mock `data.js` (id, title, year, runtime, genres, description, match, category, worldX, worldY, size, poster URL, gradient, language, actors, tags, watched)
- [ ] **1.4** Create `data/connections.ts` — 70+ show connection pairs
- [ ] **1.5** Create `data/alien-content.ts` — 8 rec messages, 18 space facts
- [ ] **1.6** Set up Zustand stores: `galaxy-store`, `queue-store`, `session-store`, `ui-store`

**Milestone:** All data importable, stores functional.

---

## Phase 2: Galaxy Rendering (Canvas)
> The core visual experience — stars, nebula, background.

- [ ] **2.1** Create `canvas/starfield.ts` — pre-render 1400×1800 star canvas (900 tiny, 300 medium, 100 glow, 20 bright, galaxies, planets, nebula objects)
- [ ] **2.2** Create `canvas/nebula.ts` — pre-render 1200×1200 nebula with category-colored gradients + wisps
- [ ] **2.3** Create `canvas/effects.ts` — 60fps loop: shooting stars (max 2), 50 twinkling stars, 20 cosmic dust particles
- [ ] **2.4** Create `canvas/renderer.ts` — orchestrate all canvas layers, handle parallax offsets
- [ ] **2.5** Create background glow component — 600×600 radial gradient, blurred, color blends with camera position
- [ ] **2.6** Add film grain overlay (SVG noise, 3% opacity)
- [ ] **2.7** Integrate all canvas layers into page with proper z-index stacking

**Milestone:** Beautiful animated space background renders at 60fps. No shows yet, just the cosmos.

---

## Phase 3: Galaxy Navigation
> Touch pan + momentum + sphere math + camera.

- [ ] **3.1** Create `lib/sphere.ts` — spherical geometry: positions, distances, great-circle interpolation, inverse-distance color blending
- [ ] **3.2** Create `lib/physics.ts` — camera state, momentum decay (0.95/frame), velocity thresholds
- [ ] **3.3** Create `hooks/use-galaxy-pan.ts` — touch/pointer drag handler, velocity tracking, momentum loop via `requestAnimationFrame`
- [ ] **3.4** Wire pan to canvas parallax offsets — starfield (15%) and nebula (12%) move with camera
- [ ] **3.5** Update background glow color based on camera position (inverse-distance-squared blend of category colors)
- [ ] **3.6** Add "DRAG TO EXPLORE" hint — pulses on load, fades on first drag

**Milestone:** User can drag around the galaxy, background shifts color, momentum feels natural.

---

## Phase 4: Show Cards
> Populate the galaxy with show posters.

- [ ] **4.1** Create `ShowCard` component — 4 sizes (L/M/S/XS), poster image with gradient fallback, distance-based opacity/scale
- [ ] **4.2** Create cards container — positioned shows based on worldX/worldY offset by camera position
- [ ] **4.3** Implement viewport culling — only render cards within screen ± 200px
- [ ] **4.4** Add card states: default, queued (purple glow + check), watched (gold border + badge)
- [ ] **4.5** Create `ConnectionLines` component — SVG/canvas lines between connected shows, pulsing opacity
- [ ] **4.6** Create `UserRing` component — centered 88px ring with spinning dashed border + "YOU" label

**Milestone:** Galaxy filled with show posters that move with pan, connections visible.

---

## Phase 5: Chrome (Top & Bottom Bars)
> Fixed UI elements over the galaxy.

- [ ] **5.1** Create `CategoryPill` — top-center pill showing current category name + animated colored dot
- [ ] **5.2** Create `CompassLabels` — edge-positioned pills pointing to other categories, dynamically computed from camera position
- [ ] **5.3** Implement compass tap → fly-to (800ms cubic ease-out camera animation)
- [ ] **5.4** Create `QueueBar` — bottom persistent bar: "TONIGHT'S QUEUE — {n} picks ready — VIEW QUEUE →"
- [ ] **5.5** Wire queue count to Zustand store, animate number changes

**Milestone:** Category pill updates as user pans, compass labels guide navigation, queue bar shows count.

---

## Phase 6: Detail Popup + Queue
> Tap a show, see details, add to queue.

- [ ] **6.1** Create `DetailPopup` — 270px popup near tapped card with smart edge avoidance
- [ ] **6.2** Popup content: poster, title, year, runtime, genres, description, match%, category badge, queue button
- [ ] **6.3** Implement "+ TAP TO QUEUE" action — add to queue store, animate fly-chip to queue bar, pop count
- [ ] **6.4** Close popup on: close button, tap-away, drag start
- [ ] **6.5** Create `QueuePanel` — 75% bottom sheet, drag handle, scrollable list, poster thumb + title + meta + remove ×
- [ ] **6.6** Implement swipe-down dismiss (>80px threshold)
- [ ] **6.7** Create "SEND TO TV" button → confirmation overlay (2.5s auto-dismiss) → clear queue

**Milestone:** Full show discovery → queue → send flow working.

---

## Phase 7: Zoom
> Binary zoom toggle between galaxy overview and category deep-dive.

- [ ] **7.1** Create "DIVE IN ↓" button — appears at bottom, triggers zoom-in to current category
- [ ] **7.2** Implement zoom-in: smooth animation, camera locks to category region, show density increases (~10 per screen)
- [ ] **7.3** Create "← GALAXY VIEW" button — visible when zoomed, triggers zoom-out
- [ ] **7.4** Hide connection lines during zoom
- [ ] **7.5** Fade user ring to 0.3 opacity when zoomed

**Milestone:** Two distinct exploration modes working smoothly.

---

## Phase 8: Menu Drawer + Search
> Search, filter, and discovery tools.

- [ ] **8.1** Create burger menu button (top-left)
- [ ] **8.2** Create `MenuDrawer` — 280px left drawer with blur backdrop
- [ ] **8.3** Add search input + GO button (full-text across all shows)
- [ ] **8.4** Add 8 genre filter chips (Romance, Thriller, Comedy, Sci-Fi, Crime, Drama, Fantasy, Horror)
- [ ] **8.5** Add language dropdown + text filter
- [ ] **8.6** Add actor text filter with autocomplete
- [ ] **8.7** Create `lib/search.ts` — full-text search across title, genres, description, actors, tags
- [ ] **8.8** Implement search results → regenerate galaxy in spiral layout
- [ ] **8.9** Add "RESET ALL" button — return to original layout
- [ ] **8.10** Swipe-left dismiss (>60px threshold)

**Milestone:** Users can search and filter the entire show catalog.

---

## Phase 9: Alien Companion
> The personality of the app.

- [ ] **9.1** Create `AlienShip` component — CSS/SVG spaceship (70×32) + alien character (32×34) with hover animation
- [ ] **9.2** Implement alien idle gestures (3-5s cycle): blink, wave, bounce, look around
- [ ] **9.3** Implement idle states (8-15s cycle): observing (head sway), thinking (eyes up), sleepy (droopy eyes)
- [ ] **9.4** Create `SpeechBubble` — green border, auto-hide, rec teaser messages
- [ ] **9.5** Implement 10s rec bubble cycle (8 message variants, 8s display)
- [ ] **9.6** Implement tap → random gesture (dance/spin/excited/peek/bounce) + space fact (5s display)
- [ ] **9.7** Suppress rec bubbles when overlays open

**Milestone:** Alien feels alive — idle animations, gestures, speech bubbles cycling.

---

## Phase 10: Recommendation Dialog
> AI-powered show recommendations.

- [ ] **10.1** Create `RecDialog` — full-screen overlay with backdrop blur
- [ ] **10.2** Implement 3-column layout: "SIMILAR TO YOU" / "YOUR CATEGORY" / "WILDCARD"
- [ ] **10.3** Create `lib/recommendations.ts` — implement all 3 algorithms (similar, mood, wildcard)
- [ ] **10.4** Rec card content: poster, title, year, runtime, description, actors, tags, category + match%, reasoning text, "+ ADD TO QUEUE"
- [ ] **10.5** Wire recs to session metrics (category dwell, show clicks, genre clicks)
- [ ] **10.6** Pause alien timers while dialog open

**Milestone:** Tap alien rec bubble → see personalized recommendations → add to queue.

---

## Phase 11: Audio
> Ambient space drone.

- [ ] **11.1** Create `lib/audio.ts` — 18 sine oscillators (6 freqs × 3 detunings), low-pass filter, LFO
- [ ] **11.2** Init on first user gesture (iOS requirement)
- [ ] **11.3** Add audio toggle button (top-right near category pill)
- [ ] **11.4** Fade gain 0↔0.15 over 0.5s on toggle

**Milestone:** Immersive ambient audio that initializes correctly on iOS.

---

## Phase 12: Session Metrics
> Passive tracking for recommendation quality.

- [ ] **12.1** Track category dwell time (tick every 1s based on camera position)
- [ ] **12.2** Track show clicks (title, category, genres, open/close timestamps, duration)
- [ ] **12.3** Track region clicks and genre clicks
- [ ] **12.4** Store in session store, persist to IndexedDB

**Milestone:** Recommendations improve as user explores.

---

## Phase 13: Polish & iOS Hardening
> Make it feel native.

- [ ] **13.1** Verify all safe areas (Dynamic Island, home indicator) on real iPhone
- [ ] **13.2** Add haptic feedback via `navigator.vibrate()` on card tap, queue add, compass nav (where supported)
- [ ] **13.3** Test and fix `overscroll-behavior`, bounce prevention
- [ ] **13.4** Verify service worker caching — app loads offline (shell)
- [ ] **13.5** Test "Add to Home Screen" → full-screen standalone mode
- [ ] **13.6** Add `prefers-reduced-motion` — disable all decorative animations
- [ ] **13.7** Performance audit — verify 60fps pan, bundle size < 200KB gzipped
- [ ] **13.8** Add splash screen / loading state while canvases pre-render
- [ ] **13.9** Test on multiple iPhones (SE, 14, 15 Pro, 16 Pro Max)

**Milestone:** Feels like a native iOS app. Smooth, polished, installable.

---

## Phase 14: Demo Prep
> Ready for hackathon presentation.

- [ ] **14.1** Record backup demo video (screen recording on iPhone)
- [ ] **14.2** Pre-populate queue with 2-3 great shows for demo start state
- [ ] **14.3** Verify "magic moment": queue on phone → SEND TO TV → confirmation
- [ ] **14.4** Test the full flow: open → pan → discover → tap → queue → alien rec → send
- [ ] **14.5** Deploy final version to Vercel, share URL

**Milestone:** Demo-ready. Backup video recorded. URL live.

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 0 | 8 | Scaffold + PWA + Deploy |
| 1 | 6 | Data Layer |
| 2 | 7 | Galaxy Background (Canvas) |
| 3 | 6 | Navigation (Pan + Momentum) |
| 4 | 6 | Show Cards |
| 5 | 5 | Chrome (Top/Bottom Bars) |
| 6 | 7 | Detail Popup + Queue |
| 7 | 5 | Zoom |
| 8 | 10 | Menu + Search |
| 9 | 7 | Alien Companion |
| 10 | 6 | Recommendation Dialog |
| 11 | 4 | Audio |
| 12 | 4 | Session Metrics |
| 13 | 9 | Polish + iOS Hardening |
| 14 | 5 | Demo Prep |
| **Total** | **95** | |

**Critical path:** Phases 0→1→2→3→4→6 get a functional galaxy with show discovery. Everything after that is additive.
