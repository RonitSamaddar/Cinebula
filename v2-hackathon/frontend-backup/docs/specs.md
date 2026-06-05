# CINEBULA — Product Specification (PWA)

> Progressive Web App targeting iOS Safari "Add to Home Screen" for full-screen native feel.

---

## 1. Product Overview

| Field | Value |
|-------|-------|
| **Name** | Cinebula (cinema + nebula) |
| **Tagline** | "Explore your mood. Discover your next binge." |
| **Platform** | PWA — Safari iOS "Add to Home Screen" (also works in Chrome/Android) |
| **Display mode** | `standalone` (no browser chrome, full-screen app feel) |
| **Orientation** | Portrait only (locked) |
| **Reference device** | iPhone 14 Pro (393×852 logical points) |
| **Offline** | Service Worker caches app shell + show data; poster images cached via Cache API |
| **Install** | Safari → Share → "Add to Home Screen" |

---

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 15 (App Router) | SSR/SSG, file routing, API routes, Vercel deploy |
| **Language** | TypeScript | Type safety across data models |
| **Styling** | Tailwind CSS 4 + CSS Modules for custom animations | Rapid iteration + custom glassmorphism |
| **Rendering** | HTML Canvas (2D) for galaxy/effects, DOM for UI overlays | Performance for particle effects, DOM for accessibility |
| **State** | Zustand | Lightweight, no boilerplate, works with SSR |
| **Audio** | Web Audio API (native) | Ambient drone synth — no library needed |
| **Persistence** | IndexedDB (via idb-keyval) | Queue, session metrics, preferences |
| **Images** | next/image with blur placeholders | Poster loading + caching |
| **Fonts** | `next/font` — Instrument Serif, JetBrains Mono, Inter | Self-hosted, no CLS |
| **PWA** | next-pwa or manual service worker + manifest.json | Installable, offline shell |
| **Deploy** | Vercel | Auto-deploy from GitHub, HTTPS, edge CDN |

---

## 3. PWA Manifest & iOS Meta Tags

### 3.1 manifest.json
```json
{
  "name": "Cinebula",
  "short_name": "Cinebula",
  "description": "Explore your mood. Discover your next binge.",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#07070c",
  "theme_color": "#07070c",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-180.png", "sizes": "180x180", "type": "image/png", "purpose": "apple-touch-icon" }
  ]
}
```

### 3.2 Required iOS `<meta>` Tags
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Cinebula" />
<link rel="apple-touch-icon" href="/icons/icon-180.png" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#07070c" />
```

### 3.3 Safe Areas (iPhone Notch/Dynamic Island)
- Top: `env(safe-area-inset-top)` — status bar / dynamic island
- Bottom: `env(safe-area-inset-bottom)` — home indicator
- All chrome elements respect these insets
- CSS: `padding-top: max(16px, env(safe-area-inset-top))`

---

## 4. Core Experience Flow

### 4.1 Galaxy Exploration (Default State)
- User drags to pan across a spherical world projected to 2D
- Shows appear as poster cards at fixed positions within category regions
- Background shifts color/nebula to match dominant category
- Category pill (top center) shows current category name
- Compass labels show direction to other categories — tappable for fly-to navigation
- "DRAG TO EXPLORE" hint pulses on first load, fades on first drag
- All shows pre-loaded at init (~300 total)

### 4.2 Show Discovery
- Tap any show card → detail popup appears nearby (smart edge avoidance)
- Popup content: poster, title, year, runtime, genres, description, match%, category badge, queue button
- "+ TAP TO QUEUE" adds to tonight's queue (animated fly-chip + count pop)
- Watched shows have gold border + "✓ WATCHED" badge

### 4.3 Zoom (Binary Toggle)

| State | View | Show Density | Purpose |
|-------|------|-------------|----------|
| **Zoomed Out** (default) | Wide galaxy overview | Low — representative shows per category | Orientation, mood browsing |
| **Zoomed In** | Focused on one category | High — ~10 shows per screen-area | Deep exploration |

- "DIVE IN ↓" button triggers zoom-in to current category
- "← GALAXY VIEW" returns to zoomed-out overview
- No intermediate zoom levels — binary toggle

### 4.4 Search & Filter (Menu Drawer)
- Burger menu → left-side drawer (280px)
- Search by genre/mood/theme/title/actor (full-text)
- Language filter (dropdown + free text)
- Actor filter (text + autocomplete)
- Results regenerate galaxy in spiral layout
- "RESET ALL" returns to original layout

### 4.5 Queue Management
- Bottom bar: "TONIGHT'S QUEUE — {n} picks ready — VIEW QUEUE →"
- Opens 75% bottom sheet with ordered list
- "SEND TO TV" → confirmation overlay → clears queue
- Swipe-down to dismiss

### 4.6 AI Alien Companion
- Alien character on spaceship, always visible bottom-right
- Every 10s: speech bubble with recommendation teaser (8 variants)
- Tap "🎬 SHOW RECOMMENDATIONS" → full-screen dialog
- 3-column layout: "SIMILAR TO YOU" / "YOUR CATEGORY" / "WILDCARD"
- Each card: poster, title, year, runtime, description, actors, language, category, match%, reasoning, "+ ADD TO QUEUE"

### 4.7 Alien Personality
- Tap alien → random gesture + space fact
- Idle gestures every 3-5s (blink, wave, bounce, look around)
- Idle states every 8-15s (observing, thinking, sleepy)
- 18 space facts pool

---

## 5. Visual Design System

### 5.1 Color Palette
```css
--base:      #07070c;    /* primary background */
--ink:       #f4ebd9;    /* primary text, warm off-white */
--ink-soft:  #c8bfa8;    /* secondary text */
--ink-dim:   #6a6457;    /* tertiary/captions */

/* Category accents (dynamic from backend, initial genre seed): */
--cat-drama:    #b56cff;  /* purple */
--cat-scifi:    #6fa8e8;  /* blue */
--cat-comedy:   #3fb89e;  /* teal */
--cat-thriller: #ff7a6c;  /* coral */
--cat-romance:  #e6b04a;  /* gold */
--cat-horror:   #c44040;  /* deep red */

/* Functional: */
--alien-accent: #7fff7f;  /* green */
--queue-accent: #d4a0ff;  /* purple */
--glass-bg:     rgba(14, 12, 24, 0.94);
--glass-border: rgba(255, 255, 255, 0.12);
```

### 5.2 Glassmorphism Pattern
```css
background: rgba(14, 12, 24, 0.94);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.12);
```

### 5.3 Typography

| Family | Role | Sizes |
|--------|------|-------|
| **Instrument Serif** (+ italic) | Display headings, show titles, large numbers | 13-22px |
| **JetBrains Mono** (400/500/700) | UI labels, buttons, metadata, status | 8-12px |
| **Inter** (400/500/600) | Body text, descriptions, form inputs | 12-14px |

- Letter-spacing: 0.08-0.18em for uppercase mono labels
- Line-height: 1.2 for titles, 1.4-1.5 for body

### 5.4 Spacing & Sizing
- Touch targets: minimum 44×44px everywhere
- Border radii: 6px (cards), 10px (buttons/rows), 14px (panels/popups), 18px (bottom sheet), 100px (pills/chips)
- Safe areas: `max(16px, env(safe-area-inset-top))` top, `max(18px, env(safe-area-inset-bottom))` bottom

### 5.5 Elevation
```
Level 0: flat
Level 1: 0 2px 8px rgba(0,0,0,0.4)      — ship hull
Level 2: 0 4px 16px rgba(0,0,0,0.5)      — bubbles, buttons
Level 3: 0 8px 24px rgba(0,0,0,0.5)      — hovered cards
Level 4: 0 12px 40px rgba(0,0,0,0.7)     — detail popup
Level 5: 0 16px 60px rgba(0,0,0,0.7)     — rec dialog
```

---

## 6. Component Inventory

### 6.1 ShowCard
- 4 sizes: L (90×135), M (72×108), S (56×84), XS (48×72, label hidden, 0.7 opacity)
- Poster image with gradient fallback, 6px radius, 1px border
- States: default / active (scale 1.15) / queued (purple glow + check) / watched (gold border + badge) / filtered-out (0.08 opacity, grayscale)
- Distance-based fade: `opacity = max(0.05, 1 - dist/480)`

### 6.2 DetailPopup
- 270px wide, positioned near tapped card (smart edge avoidance)
- Full-width poster (150px height) + body: title, meta, description, match% + category badge, queue CTA
- Close button: 36×36 circle, top-right
- Entry: scale 0.92→1, opacity 0→1, 0.25s

### 6.3 CategoryPill
- Top-center, pill shape, glass background
- Animated 5px dot (pulsing, color = current category accent) + category text (10px mono uppercase)

### 6.4 CompassLabels
- Positioned at screen edges, pill bg with blur
- Dynamic: text = nearest category in that direction, color = that category's accent
- Tap → fly camera 800ms cubic ease-out to that category

### 6.5 QueueBar (Bottom Chrome)
- Persistent, glass background, 14px radius
- Left: "TONIGHT'S QUEUE" + "{n} picks ready"
- Right: "VIEW QUEUE →" (44px height)

### 6.6 QueuePanel (Bottom Sheet)
- 75% height, 18px top-corner radius, slides up
- Drag handle (36×4px, top center)
- Scrollable list: poster thumb, title, meta, remove ×
- Footer: "← BACK" + "SEND TO TV"
- Swipe-down dismisses (>80px threshold)

### 6.7 MenuDrawer
- 280px wide, full-height, from left, blur 24px
- Search input, 8 genre chips, language dropdown, actor text, RESET
- Swipe-left dismisses (>60px threshold)

### 6.8 AlienShip
- Position: bottom 90px, right 8px, z-index 55
- Spaceship: 70×32px (CSS/SVG drawn)
- Alien: 32×34px sprite (CSS/SVG drawn — green head, dark eyes, antenna, body, waving arms)
- Hover animation: 2.5s float ±4px

### 6.9 SpeechBubble
- Bottom 75px, right 0, max-width 260px, green border
- Message + "🎬 SHOW RECOMMENDATIONS" button
- Auto-hides: 8s (rec), 5s (fact)

### 6.10 RecDialog
- Full-screen, backdrop blur
- 3-column scrollable grid with show cards + reasoning

### 6.11 Background Layers (Canvas)
- **Stars Canvas** (pre-rendered): 900 tiny + 300 medium + 100 glow + 20 bright stars, galaxies, planets, nebula. Parallax at 15%.
- **Nebula Canvas** (pre-rendered, blurred): Category-colored radial gradients + wisps. Parallax at 12%.
- **Effects Canvas** (60fps): Shooting stars (max 2), 50 twinkling stars, 20 cosmic dust particles.
- **BG Glow**: Radial gradient, 60px blur, 0.38 opacity, color = blended category.

### 6.12 ConnectionLines (SVG/Canvas)
- Lines between related shows (70+ pairs)
- Pulsing opacity 0.06↔0.22 over 5s

### 6.13 UserRing
- 88×88px centered, dashed outer ring spinning 30s
- "YOU" label below

### 6.14 FilmGrain
- SVG noise overlay, 3% opacity, pointer-events: none

---

## 7. Interaction Physics

### 7.1 Pan & Momentum
- Touch drag rotates camera across sphere surface
- On release: velocity = last delta / dt × 16
- Momentum: `vel *= 0.95` per frame until < 0.1px
- Sphere wraps — no edges

### 7.2 Camera Fly-To
- Duration: 800ms
- Easing: cubic ease-out `1 - (1-p)³`
- Shortest path on sphere

### 7.3 Zoom (Binary Toggle)
- Zoomed out: all categories visible, low density
- Zoomed in: locked to one category, high density (~10 shows/screen)
- Smooth scale + position animation between states
- No additional data fetches — just render changes

### 7.4 Touch Handling (iOS Safari)
- Prevent default on touch events in galaxy area (no bounce scroll)
- `touch-action: none` on galaxy container
- Passive listeners where possible for scroll perf
- Pan ignores UI areas (popups, panels, drawers, alien, chrome)

---

## 8. Data Model

### 8.1 Category
```typescript
interface Category {
  key: string;          // "drama", "sci-fi", etc.
  label: string;        // "DRAMA · EMOTIONAL"
  accent: string;       // "#b56cff"
  position: { x: number; y: number; z: number }; // sphere surface position
}
```

### 8.2 Show
```typescript
interface Show {
  id: string;
  title: string;
  year: number;
  runtime: string;
  genres: string;
  description: string;
  match: number;        // 0-100
  category: string;     // key from Category
  worldX: number;
  worldY: number;
  size: 'l' | 'm' | 's' | 'xs';
  poster: string;       // URL
  gradient: string;     // CSS gradient fallback
  language: string;
  actors: string[];
  tags: string[];
  watched?: boolean;
}
```

### 8.3 Connection
```typescript
interface Connection {
  from: string;  // show id
  to: string;    // show id
}
```

### 8.4 Session Metrics
```typescript
interface SessionMetrics {
  startTime: number;
  categoryDwell: Record<string, number>;
  showClicks: Array<{
    title: string;
    category: string;
    genres: string;
    openedAt: number;
    closedAt: number;
    duration: number;
  }>;
  regionClicks: Record<string, number>;
  genreClicks: Record<string, number>;
  currentCategory: string;
}
```

### 8.5 Data Loading
- All shows + categories loaded at app init (single fetch or bundled JSON)
- ~300 shows total, ~50 per category
- No lazy loading of show data
- Poster images lazy-loaded with blur placeholders

---

## 9. Recommendation Algorithms

### 9.1 "Similar to You"
1. Get user's clicked shows, sort by view duration
2. Seed = longest-viewed show
3. Score: +3 same category, +2 shared genre, +1 shared tag, +1 same language
4. Exclude clicked, pick random from top 5
5. Fallback: random from current category

### 9.2 "Your Category"
1. Category with highest dwell time
2. Filter to that category, exclude clicked
3. Random from top 5

### 9.3 "Wildcard"
1. Category with LOWEST dwell time
2. Genres NOT in user's genreClicks
3. Filter to least-explored category AND novel genre
4. If < 3 candidates, relax to just least-explored category
5. Random from top 8

---

## 10. Behavioral Rules

1. Pan ignores UI areas (popups, panels, drawers, alien, chrome)
2. One popup at a time — closes on drag or tap-away
3. Menu is exclusive — no galaxy interaction while open
4. Rec dialog is exclusive — alien timers paused
5. Alien rec suppressed when dialogs/menus open
6. Queue state persists visually on cards
7. Zoom resets on search/filter
8. Backdrop tap dismisses overlays
9. Search results sort: exact title match first, then match score
10. Dedup everywhere (search, zoom, recs)

---

## 11. Animation Timings

| Animation | Duration | Easing | Loop? |
|-----------|----------|--------|-------|
| Ship hover | 2.5s | ease-in-out | ∞ |
| Antenna pulse | 1.5s | ease-in-out | ∞ |
| Star breathe | 12s | ease-in-out | ∞ |
| Ring spin | 30s | linear | ∞ |
| Mood dot pulse | 2s | ease-in-out | ∞ |
| Connection pulse | 5s | ease-in-out | alternate |
| Popup in | 0.25s | ease | once |
| Panel slide | 0.35s | cubic-bezier(0.4,0,0.2,1) | once |
| Card tap | 0.35s | ease | transition |
| Count pop | 0.4s | ease | once |
| Fly chip | 1.2s | ease-out | once |
| Send confirm | 2.5s | ease | once |

**Reduced motion:** `prefers-reduced-motion: reduce` → all decorative animations disabled, transitions → 0.05s.

---

## 12. Audio (Web Audio API)

- 6 base frequencies × 3 detunings = 18 sine oscillators
- Master gain: 0.15, low-pass 500Hz Q 0.5
- LFO: 0.05Hz modulating filter cutoff ±200Hz
- Init on first user gesture (iOS Safari requirement)
- Toggle: fade gain 0↔0.15 over 0.5s

---

## 13. Performance Targets

| Metric | Target |
|--------|--------|
| FCP | < 1.5s |
| LCP | < 2.5s |
| TTI | < 3s |
| Galaxy pan FPS | 60fps (canvas) |
| Bundle size (JS) | < 200KB gzipped |
| Show data | ~300 shows, ~80KB JSON |

### 13.1 Optimizations
- Pre-render starfield + nebula to offscreen canvas at init
- Only render cards within viewport ± 200px buffer
- `will-change: transform` on animated elements
- `requestAnimationFrame` for all canvas animations
- Poster images: WebP, lazy loaded, blur placeholder
- Service worker: cache-first for app shell, stale-while-revalidate for data

---

## 14. Service Worker Strategy

| Resource | Strategy |
|----------|----------|
| App shell (HTML/CSS/JS) | Cache-first |
| Show data JSON | Stale-while-revalidate |
| Poster images | Cache-first (max 500 entries, LRU eviction) |
| Fonts | Cache-first |
| Icons | Cache-first |

---

## 15. Z-Index Layer Map

| Z | Element |
|---|---------|
| 0 | stars-canvas, nebula-canvas |
| 1 | bg-glow, effects-canvas |
| 2 | connections layer |
| 3 | cards container |
| 20 | fixed overlay (user ring, compass) |
| 25 | pan hint |
| 30 | chrome (top bar, bottom bar) |
| 31 | zoom CTA |
| 40 | detail popup |
| 45 | queue fly chip |
| 50 | film grain |
| 55 | queue panel, alien ship, send confirm |
| 59 | menu backdrop |
| 60 | menu drawer, rec dialog |
