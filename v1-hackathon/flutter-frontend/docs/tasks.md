# Cinebula — Build Tasks

> Ordered task list for building the Cinebula Flutter app. Tasks are grouped by phase and ordered by dependency.

---

## Phase 0: Project Setup
> Get the project buildable with all dependencies and the design system in place.

- [ ] **T0.1** — Update `pubspec.yaml`: add dependencies (`flutter_riverpod`, `cached_network_image`, `google_fonts`, `hive`, `hive_flutter`), declare fonts and assets
- [ ] **T0.2** — Create `lib/theme/app_colors.dart`: all color constants (base, ink, inkSoft, inkDim, alienGreen, queuePurple, category accents)
- [ ] **T0.3** — Create `lib/theme/app_theme.dart`: ThemeData with dark theme, text styles (Instrument Serif, JetBrains Mono, Inter), glassmorphism helpers
- [ ] **T0.4** — Rewrite `lib/main.dart`: CinebulaApp with ProviderScope, single route to GalaxyScreen, portrait-only lock, theme
- [ ] **T0.5** — Verify build: `flutter build web --release` succeeds with blank GalaxyScreen

---

## Phase 1: Data Layer
> Hardcoded show data, categories, and models.

- [ ] **T1.1** — Create `lib/models/category_model.dart`: Category class (key, label, accent color, position)
- [ ] **T1.2** — Create `lib/models/show_model.dart`: Show class (all fields from spec §4.1)
- [ ] **T1.3** — Create `lib/data/categories_data.dart`: 6 genre-based categories with colors and sphere positions
- [ ] **T1.4** — Create `lib/data/shows_data.dart`: ~300 shows with real metadata, TVMaze poster URLs, category assignments, world positions
- [ ] **T1.5** — Create `lib/data/connections_data.dart`: 70+ connection pairs between related shows
- [ ] **T1.6** — Create `lib/utils/sphere_math.dart`: spherical coordinate math, great-circle distance, 2D projection

---

## Phase 2: Galaxy Core (Canvas + Camera)
> The interactive spherical galaxy — background, cards, and pan navigation.

- [ ] **T2.1** — Create `lib/providers/galaxy_provider.dart`: camera position (spherical), zoom state (binary), momentum, current category
- [ ] **T2.2** — Create `lib/canvas/starfield_painter.dart`: CustomPainter with 14 star layers, pre-rendered to ui.Image, parallax
- [ ] **T2.3** — Create `lib/canvas/nebula_painter.dart`: category-colored radial gradients, wisps, blurred, parallax
- [ ] **T2.4** — Create `lib/canvas/effects_painter.dart`: 60fps ticker-driven shooting stars, twinkling, cosmic dust
- [ ] **T2.5** — Create `lib/screens/galaxy_screen.dart`: Stack with background canvases + GestureDetector for pan
- [ ] **T2.6** — Implement pan & momentum physics: drag → rotate camera, release → momentum decay (vel *= 0.95), sphere wrapping
- [ ] **T2.7** — Implement background glow: 600×600 radial gradient, color = blended category accent from camera position
- [ ] **T2.8** — Verify: can pan across sphere, backgrounds shift color, momentum works

---

## Phase 3: Show Cards
> Display shows as poster cards on the galaxy, with distance-based effects.

- [ ] **T3.1** — Create `lib/widgets/show_card.dart`: 4 sizes (L/M/S/XS), poster image with gradient fallback, RepaintBoundary
- [ ] **T3.2** — Render all show cards on galaxy: position via Transform.translate, viewport culling (±200px buffer)
- [ ] **T3.3** — Distance-based fade/scale: `opacity = max(0.05, 1 - dist/480)`, `scale = 0.7 + 0.3 × (1 - dist/480)`
- [ ] **T3.4** — Card states: default, queued (purple glow + check), watched (gold border + badge)
- [ ] **T3.5** — Create `lib/canvas/connection_painter.dart`: lines between related shows, pulsing opacity
- [ ] **T3.6** — Verify: shows visible on galaxy, fade by distance, connections visible

---

## Phase 4: Galaxy Chrome (Category Pill, Compass, Zoom)
> Fixed UI elements overlaid on the galaxy.

- [ ] **T4.1** — Create `lib/widgets/category_pill.dart`: top-center pill with pulsing dot + category name, updates from camera position
- [ ] **T4.2** — Create `lib/widgets/compass_label.dart`: edge labels showing nearest categories, tappable for fly-to
- [ ] **T4.3** — Implement fly-to navigation: 800ms cubic ease-out camera animation to target category
- [ ] **T4.4** — Create `lib/widgets/zoom_controls.dart`: "DIVE IN ↓" / "← GALAXY VIEW" toggle
- [ ] **T4.5** — Implement binary zoom: zoomed-out (low density) ↔ zoomed-in (high density, ~10 shows/screen)
- [ ] **T4.6** — Create `lib/widgets/user_ring.dart`: 88×88px centered, dashed spinning ring, "YOU" label
- [ ] **T4.7** — Create `lib/widgets/pan_hint.dart`: "DRAG TO EXPLORE" hint, pulses, fades on first drag
- [ ] **T4.8** — Verify: pill updates, compass navigates, zoom works, hint appears

---

## Phase 5: Show Detail & Queue
> Tap a show → detail popup → add to queue → manage queue.

- [ ] **T5.1** — Create `lib/widgets/detail_popup.dart`: 270px popup near tapped card, poster + metadata + match% + queue CTA
- [ ] **T5.2** — Smart popup positioning: edge avoidance, entry animation (scale 0.92→1, 0.25s)
- [ ] **T5.3** — Create `lib/providers/queue_provider.dart`: queue state (ordered list of show IDs), add/remove
- [ ] **T5.4** — Create `lib/widgets/queue_bar.dart`: bottom chrome bar, "TONIGHT'S QUEUE — {n} picks ready — VIEW QUEUE →"
- [ ] **T5.5** — Queue add animation: fly-chip from card to queue bar (1.2s ease-out), count number pops
- [ ] **T5.6** — Create `lib/widgets/queue_panel.dart`: 75% bottom sheet, scrollable list, poster thumb + title + remove ×, drag handle
- [ ] **T5.7** — Create `lib/widgets/send_confirmation.dart`: "SEND TO TV" → 2.5s confirmation overlay → clear queue
- [ ] **T5.8** — Verify: tap card → popup → queue → panel → send flow works end-to-end

---

## Phase 6: Search & Filter
> Menu drawer with search, genre chips, language/actor filters.

- [ ] **T6.1** — Create `lib/providers/search_provider.dart`: query text, active genre filters, language filter, actor filter, filtered show IDs
- [ ] **T6.2** — Create `lib/widgets/menu_drawer.dart`: 280px left drawer, blur backdrop, search input, 8 genre chips, language dropdown, actor text, RESET
- [ ] **T6.3** — Implement search logic: full-text across title, genres, description, actors, tags
- [ ] **T6.4** — Search result rendering: filtered shows in spiral layout, relevance sort (exact title first, then match score)
- [ ] **T6.5** — Verify: drawer opens, search filters galaxy, reset restores

---

## Phase 7: Alien Companion
> The AI alien character with idle states, gestures, and recommendations.

- [ ] **T7.1** — Create `lib/providers/alien_provider.dart`: state machine (idle/gesture/rec_bubble/fact/dialog), timers
- [ ] **T7.2** — Create `lib/widgets/alien_ship.dart`: spaceship (70×32px) + alien sprite (32×34px), hover animation (2.5s float ±4px)
- [ ] **T7.3** — Alien idle system: quick gestures every 3–5s (blink/wave/bounce/look), persistent states every 8–15s
- [ ] **T7.4** — Create `lib/widgets/speech_bubble.dart`: green border, message + "🎬 SHOW RECOMMENDATIONS" button, auto-hide (8s/5s)
- [ ] **T7.5** — Alien tap interaction: random gesture (dance/spin/excited/peek/bounce) + space fact
- [ ] **T7.6** — Create `lib/utils/recommendation_engine.dart`: 3 algorithms (Similar to You, Your Category, Wildcard)
- [ ] **T7.7** — Create `lib/providers/metrics_provider.dart`: category dwell time, show click tracking
- [ ] **T7.8** — Create `lib/widgets/rec_dialog.dart`: full-screen, 3-column grid, poster + metadata + reason + queue button
- [ ] **T7.9** — Verify: alien idles, speaks, tappable, rec dialog shows smart picks

---

## Phase 8: Polish & Effects
> Visual polish, film grain, audio, accessibility.

- [ ] **T8.1** — Create `lib/canvas/film_grain_painter.dart`: noise overlay, 3% opacity
- [ ] **T8.2** — Star breathing animation: opacity 0.85↔1.0 over 12s cycle
- [ ] **T8.3** — Ambient audio: 18-oscillator drone, LFO, toggle on/off (stretch goal — may skip for web)
- [ ] **T8.4** — Haptic feedback: card tap, queue add, compass nav, alien gesture (mobile only)
- [ ] **T8.5** — Reduced motion support: detect `MediaQuery.disableAnimations`, simplify all animations
- [ ] **T8.6** — Safe area handling: respect notch/home indicator insets
- [ ] **T8.7** — Final performance pass: profile on web, fix any jank, verify 60fps

---

## Phase 9: Testing & Deploy
> Validate and ship.

- [ ] **T9.1** — Widget tests: GalaxyScreen renders, show cards display, queue add/remove, search filters
- [ ] **T9.2** — Integration test: full flow — pan → tap card → queue → send
- [ ] **T9.3** — Web build & test: `flutter build web --release`, test on mobile browser
- [ ] **T9.4** — Record backup demo video
- [ ] **T9.5** — Final bug fixes and polish

---

## Priority Notes

**Must-have for demo (Phases 0–5):**
- Galaxy with pannable sphere, show cards, backgrounds
- Detail popup + queue flow
- Basic zoom toggle

**Should-have (Phases 6–7):**
- Search/filter drawer
- Alien companion with recommendations

**Nice-to-have (Phase 8):**
- Film grain, ambient audio, haptics
- Reduced motion, advanced effects

**Build order rationale:** Each phase builds on the previous. The galaxy core must exist before cards can be placed on it. Cards must exist before detail popups. Queue must work before the alien can recommend shows to queue. Polish comes last.
