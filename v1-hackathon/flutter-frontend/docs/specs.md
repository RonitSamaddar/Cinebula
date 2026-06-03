# Cinebula — Product & Technical Specification

> Cinema + Nebula. A phone-native TV show discovery app where users explore a living spherical galaxy of shows.

---

## 1. Product Overview

**Cinebula** is a mobile-first (Flutter, iOS + Android) TV show discovery app. Instead of scrolling grids, users explore a **spherical galaxy** where shows are stars clustered by category. An AI alien companion delivers personalized recommendations. Users build a "Tonight's Queue" and (future) send it to their TV.

- **Origin:** Internal hackathon at LG Ads Solutions (Alphonso Inc)
- **Defensible asset:** ACR data (~200M LG TVs) — cross-app viewing data no single streaming service can replicate
- **Target session:** 3–7 minutes. User queues 2–3 shows and closes the app. That's a WIN.
- **Anti-patterns:** No streaks, no daily-login rewards, no leaderboards, no doom-scrolling

### 1.1 Surfaces

| Surface | Role | Status |
|---------|------|--------|
| **Phone (primary)** | Mood galaxy explorer, queue builder | Building now |
| **TV (future)** | Home screen shows "Tonight: [Show]" with one-click play | Not in scope |

### 1.2 Reference Device

iPhone 14 Pro — 393×852 logical points, portrait only.

---

## 2. Core Experience Flow

### 2.1 Galaxy Exploration (Default State)
- User drags to pan across the sphere surface
- Shows appear as poster cards at fixed positions within their category region
- Background shifts color/nebula to match dominant category
- Category pill (top center) shows current category name
- Compass labels show direction to other categories — tappable for fly-to navigation
- "DRAG TO EXPLORE" hint pulses on first load, fades on first drag
- **All shows are loaded statically at init** — the entire search space is pre-loaded

### 2.2 Show Discovery
- Tap any show card → detail popup with: poster, title, year, runtime, genres, description, match%, category badge, queue button
- "+ TAP TO QUEUE" adds to tonight's queue (animated fly-chip + count pop)
- Watched shows have gold border + "✓ WATCHED" badge

### 2.3 Zoom (Binary Toggle)

| State | View | Show Density | Purpose |
|-------|------|-------------|----------|
| **Zoomed Out** (default) | Wide galaxy overview | Low — representative shows per category | Orientation, mood browsing |
| **Zoomed In** | Focused on one category | High — ~10 shows per screen-area | Deep exploration |

- "DIVE IN ↓" button triggers zoom-in
- "← GALAXY VIEW" returns to zoomed-out
- No intermediate zoom levels

### 2.4 Search & Filter (Menu Drawer)
- Burger menu → left-side drawer (280px)
- Search by genre/mood/theme/title/actor (full-text across all shows)
- Language filter (dropdown + free text)
- Actor filter (text + autocomplete)
- Results regenerate galaxy in spiral layout
- "RESET ALL" returns to original layout

### 2.5 Queue Management
- Bottom bar: "TONIGHT'S QUEUE — {n} picks ready — VIEW QUEUE →"
- Opens 75% bottom sheet with ordered list
- "SEND TO TV" → confirmation overlay → clears queue
- Swipe-down to dismiss panel

### 2.6 AI Alien Companion
- Alien character on spaceship, always visible bottom-right
- Every 10s: speech bubble with rec teaser (8 message variants)
- Tap "🎬 SHOW RECOMMENDATIONS" → full-screen dialog
- 3-column layout: "SIMILAR TO YOU" / "YOUR CATEGORY" / "WILDCARD"
- Each card: poster, title, year, runtime, description, actors, language, category, match%, reasoning, "+ ADD TO QUEUE"
- Tap alien → random gesture + space fact (18 facts pool)
- Idle gestures every 3–5s, idle states every 8–15s

---

## 3. Categories (Dynamic, Backend-Driven)

The galaxy has **up to 6 category regions** distributed across the sphere surface. Categories are **not hardcoded** — they come from the backend.

### 3.1 Category Object

```json
{
  "key": "string",
  "label": "string",
  "accent": "#hex",
  "position": {"x": 0, "y": 0, "z": 0}
}
```

### 3.2 Initial Seed (Genre-Based)

| Category | Color | Hex |
|----------|-------|-----|
| Drama · Emotional | Purple | `#b56cff` |
| Sci-Fi · Mind-Bending | Blue | `#6fa8e8` |
| Comedy · Light | Teal | `#3fb89e` |
| Thriller · Gripping | Coral | `#ff7a6c` |
| Romance · Warm | Gold | `#e6b04a` |
| Horror · Dark | Deep Red | `#c44040` |

### 3.3 Sphere Geometry
- Navigation feels like rotating/panning across a globe
- No edges or boundaries — the sphere wraps naturally
- Colors blend smoothly between regions using inverse-distance-squared weighting

---

## 4. Data Model

### 4.1 Show Object

```dart
class Show {
  String id;           // "show-001"
  String title;
  int year;
  String runtime;      // "30 min", "1h"
  String genres;       // "Drama · Comedy"
  String description;  // 1-3 sentences
  int match;           // 0-100
  String category;     // key from backend
  double worldX;       // sphere position
  double worldY;       // sphere position
  String size;         // "l"|"m"|"s"|"xs"
  String poster;       // URL (TVMaze CDN)
  String gradient;     // CSS gradient fallback
  String language;     // "English", "Korean", etc.
  List<String> actors;
  List<String> tags;   // lowercase search terms
  bool watched;        // pre-marked watched flag
}
```

### 4.2 Data Loading
- **All show data loaded at app init** — entire search space fetched once
- ~300 total shows (6 categories × ~50 each)
- 70+ connection pairs between related shows
- No lazy loading — zoom only changes render density

### 4.3 Session Metrics (Passive)

```dart
class SessionMetrics {
  DateTime startTime;
  Map<String, int> categoryDwell;  // seconds per category
  List<ShowClick> showClicks;
  Map<String, int> regionClicks;
  Map<String, int> genreClicks;
  String currentCategory;
}
```

---

## 5. Visual Design System

### 5.1 Colors

| Token | Value | Usage |
|-------|-------|-------|
| `base` | `#07070c` | Primary background |
| `ink` | `#f4ebd9` | Primary text (warm off-white) |
| `inkSoft` | `#c8bfa8` | Secondary text |
| `inkDim` | `#6a6457` | Tertiary/captions |
| `alienAccent` | `#7fff7f` | Alien green |
| `queueAccent` | `#d4a0ff` | Queue/CTA purple |

Category accent colors are dynamic from backend (see §3.2 for initial seed).

Glassmorphism surfaces: `rgba(14,12,24,0.94)` bg + blur(20px) + 1px `rgba(255,255,255,0.12)` border.

### 5.2 Typography

| Family | Role | Sizes |
|--------|------|-------|
| **Instrument Serif** (+ italic) | Display headings, show titles, large numbers | 13–22px |
| **JetBrains Mono** (400/500/700) | UI labels, buttons, metadata, status | 8–12px |
| **Inter** (400/500/600) | Body text, descriptions, form inputs | 12–14px |

Letter-spacing: 0.08–0.18em for uppercase mono labels. Line-height: 1.2 titles, 1.4–1.5 body.

### 5.3 Spacing & Sizing
- Touch targets: minimum **44×44px** everywhere
- Border radii: 6px (cards), 10px (buttons/rows), 14px (panels/popups), 18px (bottom sheet), 100px (pills/chips)
- Safe areas: `max(16px, env(safe-area-inset-top))` top, `max(18px, env(safe-area-inset-bottom))` bottom

### 5.4 Elevation Levels

| Level | Shadow | Usage |
|-------|--------|-------|
| 1 | `0 2px 8px rgba(0,0,0,0.4)` | Ship hull |
| 2 | `0 4px 16px rgba(0,0,0,0.5)` | Bubbles, buttons |
| 3 | `0 8px 24px rgba(0,0,0,0.5)` | Hovered cards |
| 4 | `0 12px 40px rgba(0,0,0,0.7)` | Detail popup |
| 5 | `0 16px 60px rgba(0,0,0,0.7)` | Rec dialog |

---

## 6. Component Inventory

### 6.1 Show Card
- 4 sizes: L (90×135), M (72×108), S (56×84), XS (48×72, label hidden, 0.7 opacity)
- Poster image over gradient fallback, 6px radius, 1px border
- States: default / hovered (scale 1.15) / queued (purple glow + check) / watched (gold border + badge) / filtered-out (0.08 opacity, grayscale)
- Distance-based fade: `opacity = max(0.05, 1 - dist/480); scale = 0.7 + 0.3 × (1 - dist/480)`

### 6.2 Detail Popup
- 270px wide, positioned near tapped card (smart edge avoidance)
- Full-width poster (150px height) + title (18px serif), meta (9px mono), description (12px), match% + category badge, queue CTA (44px)
- Close button: 36×36 circle, top-right
- Entry: scale 0.92→1, opacity 0→1, 0.25s

### 6.3 Category Pill
- Top-center, pill shape, `rgba(7,7,12,0.9)` bg
- Pulsing 5px dot (color = current category accent) + category text (10px mono uppercase)

### 6.4 Compass Labels
- Positioned at screen edges, pill bg with blur
- Dynamic: text = nearest category in that direction, color = category accent
- Tap → fly camera 800ms cubic ease-out

### 6.5 Queue Bar (Bottom Chrome)
- Persistent, blur glass, 14px radius
- Left: "TONIGHT'S QUEUE" + "{n} picks ready"
- Right: "VIEW QUEUE →" button (44px height)

### 6.6 Queue Panel (Bottom Sheet)
- 75% height, 18px top-corner radius, drag handle
- Scrollable list: poster thumb (36×54), title, category meta, remove ×
- Footer: "← BACK" + "SEND TO TV" (44px each)

### 6.7 Menu Drawer
- 280px wide, full-height, from left, blur 24px
- Sections: search input + GO, 8 genre chips, language dropdown, actor text, RESET

### 6.8 Alien Ship
- Position: bottom 90px, right 8px
- Spaceship: 70×32px, alien: 32×34px sprite
- Hover animation: 2.5s float ±4px

### 6.9 Speech Bubble
- Bottom 75px, right 0, max-width 260px, green border
- Message + "🎬 SHOW RECOMMENDATIONS" button

### 6.10 Recommendation Dialog
- Full-screen, backdrop blur 6px
- 3-column grid: poster (72×108), title, meta, description, actors, tags, match%, reason, queue button

### 6.11 Background Layers
- **Stars Canvas** (1400×1800, pre-rendered): 14 layers — 900 tiny, 300 medium, 100 with glow, 20 bright with cross-spikes, galaxies, nebula, planets. Parallax 15%.
- **Nebula Canvas** (1200×1200, pre-rendered, 30px blur): Category-colored radial gradients + wisps + bridges. Parallax 12%.
- **Effects Canvas** (screen-size, 60fps): Shooting stars (max 2), 50 twinkling stars, 20 cosmic dust particles.
- **BG Glow**: 600×600 radial gradient, 60px blur, 0.38 opacity, blended category color.

### 6.12 Connection Lines
- Lines between related shows (70+ pairs)
- Pulsing opacity 0.06↔0.22 over 5s, 0.5px

### 6.13 User Ring
- 88×88px centered, dashed outer ring spinning 30s, "YOU" label

### 6.14 Film Grain
- Noise overlay, 3% opacity, full-screen, pointer-events: none

---

## 7. Interaction Physics

### 7.1 Pan & Momentum
- Finger drag rotates camera across sphere surface
- On release: velocity = last delta / dt × 16
- Momentum: `vel *= 0.95` per frame until < 0.1px
- Sphere wraps — no edges

### 7.2 Camera Fly-To
- Duration: 800ms, easing: cubic ease-out `1 - (1-p)³`
- Wraps through shortest path

### 7.3 Spherical Projection
- Positions on spherical surface, great-circle distance calculations
- 2D projection: shows beyond hemisphere fade by distance

---

## 8. Recommendation Algorithms

### 8.1 "Similar to You"
1. Get user's clicked shows, sort by view duration
2. Longest-viewed as "seed"
3. Score: +3 same category, +2 per shared genre, +1 per shared tag, +1 same language
4. Exclude already-clicked, pick random from top 5

### 8.2 "Your Category"
1. Category with highest dwell time
2. Filter to that category, exclude clicked
3. Random from top 5

### 8.3 "Wildcard"
1. Category with LOWEST dwell time
2. Genres NOT in user's genreClicks
3. Random from top 8

All three columns guarantee distinct shows.

---

## 9. Alien State Machine

```
IDLE (always visible, hovering)
  ├── [3-5s] → Quick Gesture (blink/wave/bounce/look) → IDLE
  ├── [8-15s] → Persistent State (observing/thinking/sleepy, 6-10s) → IDLE
  ├── [10s] → Rec Bubble (shows 8s, auto-hides) → IDLE
  └── [user tap] → Click Gesture (dance/spin/excited/peek/bounce) + Space Fact (5s) → IDLE
```

---

## 10. Animation Inventory

| Animation | Duration | Easing | Loop |
|-----------|----------|--------|------|
| Ship hover | 2.5s | ease-in-out | ∞ |
| Antenna pulse | 1.5s | ease-in-out | ∞ |
| Star breathe | 12s | ease-in-out | ∞ |
| Ring spin | 30s | linear | ∞ |
| Connection pulse | 5s | ease-in-out | alternate |
| Popup in | 0.25s | ease | once |
| Panel slide | 0.35s | cubic-bezier(0.4,0,0.2,1) | once |
| Fly chip | 1.2s | ease-out | once |
| Send confirm | 2.5s | ease | once |

**Reduced motion:** All decorative animations disabled, transitions → 0.05s.

---

## 11. Audio

- Ambient drone: 6 base frequencies × 3 detunings = 18 sine oscillators
- Master gain: 0.15, low-pass filter (500Hz, Q 0.5)
- LFO: 0.05Hz modulating filter cutoff ±200Hz
- Init: on first user gesture
- Toggle: fade gain 0↔0.15 over 0.5s

---

## 12. Z-Index Layer Map

| Z | Element |
|---|---------|
| 0 | Stars canvas, Nebula canvas |
| 1 | BG glow, Effects canvas |
| 2 | Connection lines |
| 3 | Cards container |
| 20 | Fixed overlay (user ring, compass) |
| 25 | Pan hint |
| 30 | Chrome top, Chrome bottom |
| 31 | Zoom CTA |
| 40 | Detail popup |
| 45 | Queue fly chip |
| 50 | Film grain |
| 55 | Queue panel, Alien ship, Send confirm |
| 59 | Menu backdrop |
| 60 | Menu drawer, Rec dialog |

---

## 13. Behavioral Rules

1. Pan ignores UI areas — no drag starts on popups, panels, drawers, alien, chrome, zoom buttons
2. One popup at a time — detail popup closes when dragging or tapping elsewhere
3. Menu is exclusive — no galaxy interaction while open
4. Rec dialog is exclusive — alien timers paused
5. Alien rec suppressed when rec dialog, detail popup, or menu is open
6. Queue state persists — queued cards keep purple glow
7. Zoom resets on search/filter
8. Backdrop dismisses menus
9. Cards sort by relevance in search results
10. Dedup everywhere — search results, zoom shows, rec picks

---

## 14. Performance Requirements

- Pre-render starfield/nebula to `ui.Image` at init
- Only render cards within viewport ± 200px buffer
- Use `Transform.translate` (not `Positioned`) for card movement
- `RepaintBoundary` around each card
- Effects canvas: `CustomPainter` with `shouldRepaint: true`
- Momentum via `Ticker`, not `Timer`
- Target: 60fps on mid-range devices

---

## 15. Content Inventory

| Type | Count |
|------|-------|
| Total shows | ~300 |
| Connections | 70+ pairs |
| Categories | Up to 6 |
| Alien rec messages | 8 |
| Space facts | 18 |
| Search genre chips | 8 |
| Languages | 6 |
