# CINEBULA — Full Project Context (Post-Mock) for LLM Continuation

> **How to use this document:** Paste this entire file into any LLM (Claude, ChatGPT, Gemini, etc.) at the start of a new conversation. It contains all decisions, reasoning, constraints, UX spec, component inventory, interaction rules, data models, and current implementation state needed to continue building this product — particularly for a **native mobile (Flutter) implementation**. Tell the LLM: *"This is the full context for a project I'm working on. Read it, then help me with [your task]."*

---

## 0. TL;DR

**Cinebula** is a phone-native TV show discovery app. Instead of list/grid browsing, users explore a living **spherical galaxy** where shows are stars clustered by category. Categories are **dynamic** — determined by movie embeddings and user profiling on the backend (initially seeded as genres). An AI alien companion delivers personalized recommendations. Users build a "Tonight's Queue" and send it to their TV.

**What exists now:** A fully functional **browser mock** (HTML/CSS/JS, 4 files, ~4500 lines) running in a 393×852 phone frame. Every interaction, animation, layout, and algorithm is implemented and working. This document captures everything needed to rebuild it as a **native mobile app (Flutter recommended)**.

**Project origin:** Internal hackathon at LG Ads Solutions (Alphonso Inc). The defensible asset is **ACR data** (Automatic Content Recognition) from ~200M LG TVs — cross-app viewing data no single streaming service can replicate.

---

## 1. Product Identity

| Field | Value |
|-------|-------|
| **Name** | Cinebula (cinema + nebula) |
| **Tagline** | "Explore your mood. Discover your next binge." |
| **Brand positioning** | A *place* you visit to unwind and discover — NOT an engagement-maximization feed |
| **Anti-patterns** | No streaks, no daily-login rewards, no leaderboards, no doom-scrolling |
| **Success metric** | User queues 2-3 shows and closes the app. That's a WIN. |
| **Target platform** | iOS + Android via Flutter (portrait only) |
| **Reference device** | iPhone 14 Pro (393×852 logical points) |

---

## 2. The Problem & Solution

**Problem:** It's 8 PM, user is on the couch, scrolling 20+ minutes through grids they've seen 100 times. Decision fatigue at peak. Every app only knows its own catalog.

**Solution:** Move discovery to **downtime** (commute, breaks, before bed) on the phone. Make it feel like unwinding, not researching. Queue shows → TV already knows what to play at night.

**Two surfaces:**
- **Phone (primary, built now):** Mood galaxy explorer. 3-7 min sessions.
- **TV (future):** Home screen shows "Tonight: [Show]" with one-click play.

---

## 3. Categories (Dynamic, Backend-Driven)

The galaxy is a **spherical world** with **up to 6 category regions** distributed across its surface. Categories are **not hardcoded** — they are a variable populated by querying the backend.

### 3.1 How Categories Work

1. **Backend determines categories** — Movie embeddings cluster content into N categories (up to 6). The system picks the top categories most relevant to the user's profile.
2. **Initial seed = genres** — Before the embedding pipeline is live, categories default to genre-based groupings (e.g., Drama, Comedy, Sci-Fi, Thriller, Horror, Romance).
3. **The frontend receives a list** of category objects at load time and builds the galaxy from them. The UI never assumes a fixed set.

### 3.2 Category Object (from backend)

```
{
  key: string,        // "drama", "sci-fi", etc.
  label: string,      // "DRAMA · EMOTIONAL", "SCI-FI · MIND-BENDING"
  accent: string,     // hex color for this category, e.g. "#b56cff"
  position: {x, y, z} // position on the sphere surface
}
```

### 3.3 Example Categories (Genre-Based Initial Seed)

| Category | Color | Hex | Space |
|----------|-------|-----|-------|
| **Drama · Emotional** | Purple | `#b56cff` | Character depth, relationships |
| **Sci-Fi · Mind-Bending** | Blue | `#6fa8e8` | Futuristic, cerebral, existential |
| **Comedy · Light** | Teal | `#3fb89e` | Fun, breezy, feel-good |
| **Thriller · Gripping** | Coral | `#ff7a6c` | Suspense, tension, edge-of-seat |
| **Romance · Warm** | Gold | `#e6b04a` | Love, coming-of-age, nostalgia |
| **Horror · Dark** | Deep Red | `#c44040` | Fear, supernatural, psychological |

> **Note:** The number of active categories (5 or 6) and their labels/colors are determined per-user by the backend. The frontend renders whatever it receives.

### 3.4 Spherical World Geometry

- The search space is a **sphere**, not a flat plane. Categories are distributed as regions on its surface.
- Navigation feels like rotating/panning across a globe — the user can reach any category from any other by panning in any direction.
- There are no edges or boundaries — the sphere wraps naturally.
- Colors blend smoothly as the camera moves between regions using inverse-distance-squared weighting on the sphere surface.

---

## 4. Core Experience Flow

### 4.1 Galaxy Exploration (Default State)
- User drags to pan across the sphere surface
- Shows appear as poster cards at fixed positions within their category region
- Background shifts color/nebula to match dominant category
- Category pill (top center) shows current category name
- Compass labels show direction to other categories — tappable for fly-to navigation
- "DRAG TO EXPLORE" hint pulses on first load, fades on first drag
- **All shows are loaded statically at init** — the entire search space is pre-loaded and distributed on the sphere

### 4.2 Show Discovery
- Tap any show card → detail popup appears nearby with: poster, title, year, runtime, genres, description, match%, category badge, queue button
- "+ TAP TO QUEUE" adds to tonight's queue (animated fly-chip + count pop)
- Watched shows have gold border + "✓ WATCHED" badge

### 4.3 Zoom (Two States)

The galaxy has exactly **two zoom levels:**

| State | View | Show Density | Purpose |
|-------|------|-------------|----------|
| **Zoomed Out** (default) | Wide galaxy overview, see multiple categories | Low — representative shows per category | Orientation, mood browsing, navigation |
| **Zoomed In** | Focused on one category region | High — ~10 shows per screen-area | Deep exploration, actual show discovery |

- **"DIVE IN ↓"** button triggers zoom-in to current category
- Zooming in reveals the full density of shows for that category (~10 per screen-sized area)
- **"← GALAXY VIEW"** returns to zoomed-out overview
- No intermediate zoom levels — it's a binary toggle

### 4.4 Search & Filter (Menu Drawer)
- Burger menu → left-side drawer (280px)
- Search by genre/mood/theme/title/actor (full-text across all 310+ shows)
- Language filter (dropdown + free text)
- Actor filter (text + autocomplete)
- Results regenerate galaxy in spiral layout
- "RESET ALL" returns to original layout

### 4.5 Queue Management
- Bottom bar: "TONIGHT'S QUEUE — {n} picks ready — VIEW QUEUE →"
- Opens 75% bottom sheet with ordered list (poster thumb, title, mood meta, remove ×)
- "SEND TO TV" → confirmation overlay → clears queue
- Swipe-down to dismiss panel

### 4.6 AI Recommendations (Alien Companion)
- Alien character on spaceship, always visible bottom-right
- Every 10s: speech bubble with rec teaser (8 message variants)
- Tap "🎬 SHOW RECOMMENDATIONS" → full-screen dialog
- 3-column layout: "SIMILAR TO YOU" / "YOUR CATEGORY" / "WILDCARD"
- Each card: poster, title, year, runtime, description, actors, language, category, match%, reasoning, "+ ADD TO QUEUE"
### 4.7 Alien Personality
- Tapping alien → random gesture (dance/spin/excited/peek/bounce) + space fact
- Idle gestures every 3-5s (blink, wave, bounce, look around)
- Idle states every 8-15s (observing: head sways; thinking: eyes look up; sleepy: droopy eyes)
- 18 space facts pool

---

## 5. Visual Design System

### 5.1 Colors

```
--base:      #07070c    (primary background)
--ink:       #f4ebd9    (primary text, warm off-white)
--ink-soft:  #c8bfa8    (secondary text)
--ink-dim:   #6a6457    (tertiary/captions)
// Category accent colors are dynamic — fetched from backend per-category.
// Example initial set (genre-based seed):
--cat-1:     #b56cff    (purple — Drama)
--cat-2:     #6fa8e8    (blue — Sci-Fi)
--cat-3:     #3fb89e    (teal — Comedy)
--cat-4:     #ff7a6c    (coral — Thriller)
--cat-5:     #e6b04a    (gold — Romance)
--cat-6:     #c44040    (deep red — Horror)
```

Surfaces use glassmorphism: `rgba(14,12,24,0.94)` backgrounds + `backdrop-filter: blur(20px)` + `1px solid rgba(255,255,255,0.12)` borders.

Alien accent: `#7fff7f` (green). Queue/CTA accent: `#d4a0ff` / `rgba(181,108,255,*)` (purple).

### 5.2 Typography

| Family | Role | Sizes Used |
|--------|------|------------|
| **Instrument Serif** (+ italic) | Display headings, show titles, large numbers | 13-22px |
| **JetBrains Mono** (400/500/700) | UI labels, buttons, metadata, status | 8-12px |
| **Inter** (400/500/600) | Body text, descriptions, form inputs | 12-14px |

Letter-spacing: 0.08-0.18em for uppercase mono labels. Line-height: 1.2 for titles, 1.4-1.5 for body.

### 5.3 Spacing & Sizing

- Touch targets: minimum **44×44px** everywhere
- Border radii: 6px (cards), 10px (buttons/rows), 14px (panels/popups), 18px (bottom sheet), 100px (pills/chips)
- Safe areas: `max(16px, env(safe-area-inset-top))` top, `max(18px, env(safe-area-inset-bottom))` bottom

### 5.4 Elevation

```
Level 0: flat
Level 1: 0 2px 8px rgba(0,0,0,0.4)      — ship hull
Level 2: 0 4px 16px rgba(0,0,0,0.5)      — bubbles, buttons
Level 3: 0 8px 24px rgba(0,0,0,0.5)      — hovered cards
Level 4: 0 12px 40px rgba(0,0,0,0.7)     — detail popup
Level 5: 0 16px 60px rgba(0,0,0,0.7)     — rec dialog
```

---

## 6. Component Inventory (Every UI Element)

### 6.1 Show Card
- 4 sizes: L (90×135), M (72×108), S (56×84), XS (48×72, label hidden, 0.7 opacity)
- Poster image over gradient fallback, 6px radius, 1px border
- States: default / hovered (scale 1.15) / queued (purple glow + check) / watched (gold border + badge) / filtered-out (0.08 opacity, grayscale)
- Distance-based fade: `opacity = max(0.05, 1 - dist/480)`; `scale = 0.7 + 0.3 × (1 - dist/480)`

### 6.2 Detail Popup
- 270px wide, positioned near tapped card (smart edge avoidance)
- Full-width poster (150px height) + body: title (18px serif), meta (9px mono), description (12px), match% + category badge, queue CTA (44px min-height)
- Close button: 36×36 circle, top-right
- Entry: scale 0.92→1, opacity 0→1, 0.25s

### 6.3 Category Pill
- Top-center, pill shape, `rgba(7,7,12,0.9)` bg
- Animated 5px dot (pulsing, color = current category accent) + category text (10px mono uppercase)
- Updates dynamically from camera position on the sphere

### 6.4 Compass Labels
- Positioned at screen edges, pill background with blur
- Dynamic: text = nearest category in that direction on the sphere, color = that category's accent
- Number of labels adapts to number of active categories (up to 6)
- Tap → fly camera 800ms cubic ease-out to that category's region

### 6.5 Queue Bar (Bottom Chrome)
- Persistent, blur glass, 14px radius
- Left: "TONIGHT'S QUEUE" label + "{n} picks ready" (number = 18px serif italic, pops on change)
- Right: "VIEW QUEUE →" button (44px height)
- Pulse glow on add

### 6.6 Queue Panel (Bottom Sheet)
- 75% height, 18px top-corner radius, slides up with cubic-bezier
- Drag handle (36×4px, top center)
- Scrollable list: poster thumb (36×54), title (12px), category-colored meta (9px), remove × (36px circle)
- Footer: "← BACK" + "SEND TO TV" (44px each)
- Swipe-down dismisses (>80px threshold)

### 6.7 Menu Drawer
- 280px wide, full-height, from left, blur 24px
- Backdrop: `rgba(0,0,0,0.5)` + blur 4px, tappable
- Sections: search (input + GO), 8 genre chips, language dropdown + text, actor text + datalist, RESET (44px)
- Swipe-left dismisses (>60px threshold)

### 6.8 Alien Ship
- Position: bottom 90px, right 8px, z-index 55
- Spaceship: 70×32px (dome, hull, wings, 3 thrusters with fire flicker)
- Alien: 32×34px sprite (green gradient head 26×22, dark eyes 8×10 with white highlight, pink cheeks, smile, antenna with glowing orb, body, waving arms)
- Hover animation: 2.5s float ±4px

### 6.9 Speech Bubble
- Bottom 75px, right 0, max-width 260px, green border, pointer triangle
- Message (11px mono green) + "🎬 SHOW RECOMMENDATIONS" button (purple, 44px)
- Auto-hides: 8s (rec), 5s (fact)

### 6.10 Recommendation Dialog
- Full-screen, `rgba(2,2,6,0.8)` backdrop + blur 6px
- 3-column grid: poster (72×108), title (13px serif), meta, 3-line description, actors, tags, category+match%, reason (italic), queue button (38px)

### 6.11 Background Layers
- **Stars Canvas** (1400×1800, rendered once): 14 layers — 900 tiny stars, 300 medium, 100 visible with glow, 20 bright with cross-spikes, 12 distant galaxies, 1 prominent spiral galaxy, 1 ringed planet, 1 nebula pillar, 1 Jupiter-like gas giant, 1 supernova remnant, 1 moon, 1 comet, 1 star cluster, dust lanes. Parallax at 15% camera speed. Breathing opacity 0.85↔1.0 over 12s.
- **Nebula Canvas** (1200×1200, rendered once, 30px blur): N category-colored radial gradients (one per active category) + filamentary wisps + inter-category bridges. Parallax at 12%.
- **Effects Canvas** (393×852, 60fps): Shooting stars (max 2, 3-8s spawns), 50 twinkling stars (sinusoidal), 20 cosmic dust particles (slow drift).
- **BG Glow**: 600×600 radial gradient, 60px blur, 0.38 opacity, color = blended category.

### 6.12 Connection Lines
- SVG lines between related shows (70+ pairs)
- Color from midpoint category blend, 0.5px, pulsing opacity 0.06↔0.22 over 5s
- Hidden during zoom/search

### 6.13 User Ring
- 88×88px centered, dashed outer ring spinning 30s, solid inner ring
- "YOU" label below (6px mono)
- Fades to 0.3 opacity when zoomed

### 6.14 Film Grain
- SVG fractalNoise, 3% opacity, full-screen overlay, pointer-events: none

---

## 7. Interaction Physics

### 7.1 Pan & Momentum
- Pointer/finger drag rotates the camera across the sphere surface
- On release: velocity = last delta / dt × 16
- Momentum loop: `vel *= 0.95` per frame until < 0.1px
- Sphere wraps naturally — no edges in any direction

### 7.2 Camera Fly-To
- Duration: 800ms
- Easing: cubic ease-out `1 - (1-p)³`
- Wraps delta through shortest path

### 7.3 Zoom (Binary Toggle)
- **Two states only:** zoomed-out (galaxy overview) and zoomed-in (category deep-dive)
- **Zoomed out:** All categories visible, low show density, shows spread across sphere
- **Zoomed in:** Camera locks to one category region, high density (~10 shows per screen-area), all shows for that category visible
- Transition: smooth scale + position animation between states
- All show data is **pre-loaded** — zoom does not trigger additional data fetches, only changes which shows are rendered and at what density

### 7.4 Spherical Geometry
- The world is a sphere, not a plane. Positions are internally represented on a spherical surface.
- All distance calculations and camera movements respect great-circle paths.
- Navigation wraps naturally — there is no boundary or edge.
- For 2D rendering, the sphere is projected to screen space; shows beyond a hemisphere fade out by distance.

---

## 8. Data Model

### 8.1 Show Object
```
{
  id: string,           // "show-001"
  title: string,
  year: number,
  runtime: string,      // "30 min", "1h"
  genres: string,       // "Drama · Comedy"
  description: string,  // 1-3 sentences
  match: number,        // 0-100
  category: string,     // dynamic key from backend, e.g. "drama"|"sci-fi"|"comedy"|"thriller"|"romance"|"horror"
  worldX: number,       // position on sphere (or projected 2D x)
  worldY: number,       // position on sphere (or projected 2D y)
  size: string,         // "l"|"m"|"s"|"xs"
  poster: string,       // URL (TVMaze CDN)
  gradient: string,     // CSS gradient fallback
  language: string,     // "English", "Korean", etc.
  actors: string[],     // ["Actor A", "Actor B"]
  tags: string[],       // lowercase search terms
  watched?: boolean     // pre-marked watched flag
}
```

### 8.2 Data Loading

**All show data is loaded statically at app init.** The entire search space is fetched once from the backend and distributed on the sphere by category.

| Data | Source | When |
|------|--------|------|
| Categories | Backend API (`GET /categories`) | App init |
| All shows | Backend API (`GET /shows`) | App init |
| Connections | Backend API or embedded | App init |

**Show density target:** ~10 shows per screen-area when zoomed in. The total show count depends on number of categories × shows per category. With 6 categories and ~50 shows each = ~300 total.

**No lazy loading of shows.** The sphere is fully populated at startup. Zoom only changes which subset is rendered and at what scale — it does not fetch more data.

### 8.3 Session Metrics (Tracked Passively)
```
{
  startTime: timestamp,
  categoryDwell: { [categoryKey]: seconds, ... },  // ticked every 1s
  showClicks: [{ title, category, genres, openedAt, closedAt, duration }],
  regionClicks: { [categoryKey]: count, ... },
  genreClicks: { "Drama": count, "Comedy": count, ... },
  currentCategory: string
}
```

---

## 9. Recommendation Algorithms

### 9.1 "Similar to You"
1. Get user's clicked shows, sort by view duration
2. Use longest-viewed as "seed"
3. Score all shows: +3 same category, +2 per shared genre, +1 per shared tag, +1 same language
4. Exclude already-clicked, pick random from top 5
5. Fallback (no clicks): random from current camera category

### 9.2 "Your Category"
1. Find category with highest dwell time
2. Filter to that category, exclude clicked
3. Random from top 5

### 9.3 "Wildcard"
1. Find category with LOWEST dwell time
2. Find genres NOT in user's genreClicks
3. Filter to least-category AND novel-genre shows
4. If < 3 candidates, relax to just least-category
5. Random from top 8

All three columns guarantee distinct shows.

---

## 10. Alien State Machine

```
IDLE (always visible, hovering)
  ├── [3-5s] → Quick Gesture (blink/wave/bounce/look) → back to IDLE
  ├── [8-15s] → Persistent State (observing/thinking/sleepy, lasts 6-10s) → back to IDLE
  ├── [10s] → Rec Bubble (shows 8s, auto-hides) → back to IDLE
  └── [user tap] → Click Gesture (dance/spin/excited/peek/bounce) + Space Fact (5s) → back to IDLE
  
Rec Bubble → [user taps button] → Rec Dialog (full screen)
Rec Dialog → [user closes] → back to IDLE, restart 10s timer
```

---

## 11. Animation Inventory (Key Timings)

| Animation | Duration | Easing | Loop? |
|-----------|----------|--------|-------|
| Ship hover | 2.5s | ease-in-out | ∞ |
| Antenna pulse | 1.5s | ease-in-out | ∞ |
| Arm wave | 1.8s | ease-in-out | ∞ |
| Star breathe | 12s | ease-in-out | ∞ |
| Ring spin | 30s | linear | ∞ |
| Mood dot pulse | 2s | ease-in-out | ∞ |
| Connection pulse | 5s | ease-in-out | alternate |
| Popup in | 0.25s | ease | once |
| Panel slide | 0.35s | cubic-bezier(0.4,0,0.2,1) | once |
| Card hover | 0.35s | ease | transition |
| Count pop | 0.4s | ease | once |
| Fly chip | 1.2s | ease-out | once |
| Send confirm | 2.5s | ease | once (auto-dismiss) |
| Regen flash | 0.6s | ease-out | once |

**Reduced motion:** All decorative animations disabled, transitions → 0.05s.

---

## 12. Audio

- **Ambient drone:** 6 base frequencies (55, 82.41, 110, 146.83, 164.81, 220 Hz) × 3 detunings (-8, 0, +8 cents) = 18 sine oscillators
- Master gain: 0.15, through low-pass filter (500Hz, Q 0.5)
- LFO: 0.05Hz modulating filter cutoff ±200Hz
- Init: on first user gesture (platform requirement)
- Toggle: fade gain 0↔0.15 over 0.5s

---

## 13. Z-Index Layer Map

| Z | Element |
|---|---------|
| 0 | stars-canvas, nebula-canvas |
| 1 | bg-glow, effects-canvas |
| 2 | connections-svg |
| 3 | cards-container |
| 20 | fixed-overlay (user ring, compass) |
| 25 | pan-hint |
| 30 | chrome-top, chrome-bottom |
| 31 | zoom-cta |
| 40 | detail-popup |
| 45 | queue-fly-chip |
| 50 | film-grain |
| 55 | queue-panel, alien-ship, send-confirm |
| 59 | menu-backdrop |
| 60 | menu-drawer, rec-dialog |

---

## 14. Key Behavioral Rules

1. **Pan ignores UI areas:** No drag starts on popups, panels, drawers, alien, chrome, zoom buttons.
2. **One popup at a time:** Detail popup closes when dragging starts or tapping elsewhere.
3. **Menu is exclusive:** No galaxy interaction while menu open.
4. **Rec dialog is exclusive:** No galaxy interaction while dialog open; alien timers paused.
5. **Alien rec suppressed when:** Rec dialog open, detail popup open, or menu open.
6. **Queue state persists:** Queued cards keep purple glow even after popup closes.
7. **Zoom resets on search/filter:** Entering search exits zoom mode.
8. **Backdrop dismisses:** Tapping menu backdrop or outside drawer closes menu.
9. **Cards sort by relevance:** Search results → exact title match first, then by match score.
10. **Dedup everywhere:** Search results, zoom shows, and rec picks all deduplicate by title.

---

## 15. What Changed from Original Spec

| Original (pharia_llm_context.md) | Current (post-mock) |
|---|---|
| Name: Pharia | Name: **Cinebula** |
| UX: "Combo 01 — Galaxy + Daily Card" | UX: **Galaxy only** (Daily Card dropped — galaxy IS the front door) |
| Tech: Next.js + Tailwind + Vercel | Mock: **Pure HTML/CSS/JS** (4 files). Real build: **Flutter** |
| Team of 4 division | **Solo build** (mock by one person + AI) |
| "Fake the ACR data" | **All data hardcoded** (110+75+125 shows with real TVMaze posters) |
| Alien companion: not in original spec | **Fully designed & implemented** — character, gestures, idle states, rec delivery |
| Recommendation engine: "LLM API can BE the recommender" | **Three algorithms** (similar/mood/wildcard) with scoring — no LLM needed |
| Geek Stats: was in mock | **Removed** — dropped for real implementation |
| Audio: mentioned in passing | **Full ambient drone** — 18 oscillators, LFO, filter |
| Zoom: not specified | **Binary zoom** (zoomed-out overview ↔ zoomed-in category, ~10 shows/screen) |
| Connections between shows: not specified | **70+ connection pairs** rendered as pulsing SVG lines |
| TV handoff: "mock it" | **"SEND TO TV" button** with confirmation (visual only) |
| Film grain, effects canvas: not specified | **Implemented** — shooting stars, twinkling, cosmic dust, grain overlay |

---

## 16. Flutter Implementation Architecture

### 16.1 Suggested Widget Tree
```
CinebulaApp
└── CinebulaScreen (single screen, all overlays)
    └── Stack
        ├── StarfieldCanvas (CustomPainter, pre-rendered to ui.Image)
        ├── NebulaCanvas (CustomPainter, pre-rendered, blurred)
        ├── BackgroundGlow (AnimatedContainer)
        ├── EffectsCanvas (CustomPainter, Ticker-driven 60fps)
        ├── ConnectionLines (CustomPainter)
        ├── GestureDetector (pan/momentum)
        │   └── ShowCards (Stack of positioned ShowCard widgets)
        ├── FilmGrainOverlay
        ├── FixedOverlay (UserRing, CompassLabels)
        ├── PanHint
        ├── ChromeTop (StatusBar, MoodPill)
        ├── ChromeBottom (QueueBar)
        ├── ZoomControls
        ├── DetailPopup (AnimatedPositioned)
        ├── QueueFlyChip (animation)
        ├── AlienShip (Rive/Lottie for character)
        ├── QueuePanel (DraggableScrollableSheet)
        ├── SendConfirmation
        ├── MenuBackdrop + MenuDrawer
        └── RecDialog (full screen overlay)
```

### 16.2 Key Packages
| Package | Purpose |
|---------|---------|
| `flutter_riverpod` | State management |
| `cached_network_image` | Poster caching |
| `rive` | Alien character animations |
| `just_audio` | Ambient audio |
| `hive` | Local queue/metrics persistence |
| `google_fonts` | Inter, JetBrains Mono, Instrument Serif |

### 16.3 Performance Rules
- Only render cards within viewport ± 200px buffer
- Pre-render starfield/nebula to `ui.Image` at init
- Use `Transform.translate` (not `Positioned`) for card movement
- Use `RepaintBoundary` around each card
- Effects canvas: `CustomPainter` with `shouldRepaint: true`
- Momentum: `Ticker` not `Timer`

---

## 17. Content Inventory

| Type | Count |
|------|-------|
| Total shows | ~300 (statically loaded, distributed across all categories) |
| Connections | 70+ pairs |
| Category regions | Up to 6 (dynamic from backend, initially genre-based) |
| Alien rec messages | 8 |
| Space facts | 18 |
| Search genre chips | 8 (Romance, Thriller, Comedy, Sci-Fi, Crime, Drama, Fantasy, Horror) |
| Languages represented | 6 (English, Korean, Japanese, German, Spanish, Italian) |

---

## 18. Open Decisions / Next Steps

1. **Backend API contracts** — Need endpoints: `GET /categories` (returns N category objects with key/label/accent/position), `GET /shows` (returns all shows with category assignments), `POST /queue`, user auth, watch history, ACR integration.
2. **TV surface:** The "SEND TO TV" currently just shows a confirmation. Real implementation needs Chromecast/AirPlay or webOS integration.
3. **Onboarding:** No mood quiz or intro currently. First-time user drops directly into galaxy.
4. **Daily Card front door:** Dropped from mock. Could be re-added as an optional "tonight's pick" overlay on app launch.
5. **Offline support:** All show data could be bundled; poster images need caching strategy.
6. **Haptics:** Not in mock. Add on card tap, queue add, compass nav, alien gesture.
7. **Accessibility:** Touch targets are 44px+. Need semantic labels, focus traversal, screen reader support, reduced motion.

---

## 19. File Reference (Mock Codebase)

All at `/vscode-mock/`:
- **`data.js`** (1313 lines) — SHOWS, EXTRA_SHOWS, DENSE_TEMPLATES, CONNECTIONS, MOODS, CARD_SIZES, world constants
- **`galaxy.js`** (~2350 lines) — all interaction logic, rendering, algorithms, audio, alien system, event binding
- **`styles.css`** (~1200 lines) — every visual style, animation keyframe, responsive rule
- **`index.html`** (~220 lines) — full DOM structure

---

*End of context. When continuing: reference this document for any question about what Cinebula is, how it works, what it looks like, or how to build it.*
