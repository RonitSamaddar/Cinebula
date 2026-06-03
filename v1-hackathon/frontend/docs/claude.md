# CLAUDE.md — AI Assistant Rules for Cinebula

> Rules and conventions for any AI assistant (Claude, Copilot, etc.) working on this codebase.

---

## Project Identity

- **App:** Cinebula — a phone-native TV show discovery PWA
- **Core metaphor:** A living spherical galaxy where shows are stars clustered by category
- **Platform:** Progressive Web App (Next.js), targeting iOS Safari "Add to Home Screen"
- **Brand name is final:** Cinebula. Not Pharia, not Drift.

---

## Tech Stack (Do Not Deviate)

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 + CSS Modules for custom animations |
| State | Zustand |
| Canvas | HTML Canvas 2D (native — no Three.js, no PixiJS) |
| Audio | Web Audio API (native — no Howler, no Tone.js) |
| Persistence | IndexedDB via `idb-keyval` |
| Images | `next/image` with blur placeholders |
| Fonts | `next/font` (self-hosted: Instrument Serif, JetBrains Mono, Inter) |
| PWA | Manual service worker + `manifest.json` |
| Deploy | Vercel |

**Do NOT add** Three.js, PixiJS, Babylon, D3, Framer Motion, GSAP, or any heavy animation/3D library. All rendering is 2D Canvas + CSS transitions/animations.

---

## Code Conventions

### File Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout (fonts, meta, PWA tags)
│   ├── page.tsx            # Single page — the galaxy
│   └── manifest.json       # PWA manifest
├── components/
│   ├── galaxy/             # Galaxy canvas, cards, connections
│   ├── overlays/           # DetailPopup, RecDialog, QueuePanel
│   ├── chrome/             # TopBar, BottomBar, MenuDrawer
│   ├── alien/              # AlienShip, SpeechBubble
│   └── ui/                 # Shared primitives (pills, buttons, chips)
├── canvas/
│   ├── starfield.ts        # Pre-rendered star canvas
│   ├── nebula.ts           # Pre-rendered nebula canvas
│   ├── effects.ts          # 60fps shooting stars, twinkling, dust
│   └── renderer.ts         # Main canvas orchestrator
├── stores/
│   ├── galaxy-store.ts     # Camera position, zoom state, current category
│   ├── queue-store.ts      # Tonight's queue
│   ├── session-store.ts    # Session metrics, clicks, dwell
│   └── ui-store.ts         # Popup state, menu open, dialog open
├── data/
│   ├── shows.ts            # All ~300 shows (static JSON)
│   ├── categories.ts       # Category definitions
│   ├── connections.ts      # Show connection pairs
│   └── alien-content.ts    # Space facts, rec messages
├── lib/
│   ├── sphere.ts           # Spherical geometry math
│   ├── recommendations.ts  # 3 rec algorithms
│   ├── search.ts           # Full-text search + filters
│   ├── audio.ts            # Web Audio ambient drone
│   └── physics.ts          # Pan momentum, fly-to, camera
├── hooks/
│   ├── use-galaxy-pan.ts   # Touch/pointer pan handler
│   ├── use-momentum.ts     # Momentum physics
│   └── use-alien-timer.ts  # Alien state machine timers
├── types/
│   └── index.ts            # All TypeScript interfaces
├── styles/
│   └── animations.css      # Custom keyframe animations
└── public/
    ├── icons/              # PWA icons (192, 512, 180)
    ├── sw.js               # Service worker
    └── manifest.json       # (if not in app/)
```

### Naming
- Components: PascalCase (`ShowCard.tsx`, `DetailPopup.tsx`)
- Hooks: camelCase with `use` prefix (`useGalaxyPan.ts`)
- Stores: kebab-case (`galaxy-store.ts`)
- Utils/lib: kebab-case (`sphere.ts`, `recommendations.ts`)
- Types: PascalCase interfaces (`Show`, `Category`, `SessionMetrics`)
- CSS modules: camelCase class names

### TypeScript Rules
- Strict mode enabled
- No `any` — use proper types or `unknown`
- All component props typed with interfaces (not inline)
- Data models defined in `types/index.ts`
- Prefer `const` over `let`

### Component Rules
- Functional components only (no class components)
- Use `'use client'` directive on components that need browser APIs (Canvas, touch events, Web Audio)
- Keep components focused — one responsibility per file
- Extract canvas rendering logic to `canvas/` directory, not inside React components
- Use `useRef` for canvas elements, never put canvas logic in `useEffect` cleanup

### State Management (Zustand)
- One store per domain: galaxy, queue, session, ui
- No derived state in stores — compute in components or selectors
- Actions defined inside the store
- Persist queue store to IndexedDB

### Canvas Rules
- Pre-render static layers (stars, nebula) to offscreen canvases at init
- Effects canvas runs at 60fps via `requestAnimationFrame`
- Only render cards within viewport ± 200px buffer
- Use `Transform.translate` positioning, not `left/top`
- `will-change: transform` on animated card elements

### CSS Rules
- Tailwind for layout, spacing, colors
- CSS Modules for custom animations and glassmorphism
- All glassmorphism: `backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);`
- Safe areas: always use `env(safe-area-inset-*)` for top/bottom chrome
- Touch targets: minimum 44×44px — never smaller
- `touch-action: none` on galaxy container

---

## iOS Safari Gotchas (ALWAYS Follow)

1. **`-webkit-backdrop-filter`** — Always include the `-webkit-` prefix alongside `backdrop-filter`
2. **100vh is wrong** — Use `100dvh` (dynamic viewport height) or `100svh`, never `100vh`
3. **Touch events** — Call `e.preventDefault()` on touchmove in galaxy to prevent bounce scroll
4. **Audio autoplay blocked** — Initialize Web Audio on first user gesture only
5. **Service worker** — iOS Safari supports SW but has quirks: max 7 days cache without user visit
6. **No Web App Manifest prompt** — iOS has no install prompt; users must manually "Add to Home Screen"
7. **`standalone` display** — Check `window.navigator.standalone` to detect PWA mode on iOS
8. **Status bar** — Use `black-translucent` for status bar to extend content behind it
9. **Overscroll** — Set `overscroll-behavior: none` on body to prevent pull-to-refresh
10. **Font loading** — Use `next/font` to avoid FOUT/FOIT on iOS Safari

---

## Performance Rules

- **No heavy dependencies.** Total JS bundle < 200KB gzipped.
- **Show data** (~300 shows) bundled as static JSON import, not fetched at runtime for now.
- **Poster images:** Use `next/image` with `loading="lazy"`, WebP format, blur placeholders.
- **Canvas:** Never allocate objects inside the render loop. Pre-allocate arrays/objects.
- **DOM overlays:** Use `transform` for animations, never animate `width`/`height`/`top`/`left`.
- **Debounce** category pill updates (100ms) to avoid thrashing during fast pan.

---

## Data Rules

- All show data is **hardcoded/static** for the hackathon demo
- Categories are genre-based initially (Drama, Sci-Fi, Comedy, Thriller, Romance, Horror)
- Show posters use TVMaze CDN URLs (static.tvmaze.com)
- Match percentages are pre-computed (not real ML)
- Connection pairs are pre-defined (not computed)
- Queue persists in IndexedDB between sessions

---

## Behavioral Rules (Business Logic)

1. Pan ignores UI areas — no drag starts on popups, panels, drawers, alien, chrome
2. One popup at a time — detail popup closes on drag or tap-away
3. Menu is exclusive — no galaxy interaction while open
4. Rec dialog is exclusive — no galaxy interaction, alien timers paused
5. Alien rec suppressed when any overlay is open
6. Queue state persists visually (purple glow on queued cards)
7. Zoom resets on search/filter
8. Backdrop tap dismisses overlays
9. Search results: exact title match first, then match score
10. Dedup everywhere (search, zoom, recs)

---

## Anti-Patterns (NEVER Do)

- **No engagement farming:** No streaks, no daily-login rewards, no leaderboards, no doom-scrolling mechanics
- **No infinite scroll:** The galaxy has finite, pre-loaded content
- **No external analytics SDKs** in the demo
- **No user accounts/auth** in the demo
- **No real API calls** — all data is static
- **No SSR for the galaxy** — the galaxy page is fully client-rendered (`'use client'`)
- **No React Server Components** for interactive content — only for layout/metadata

---

## Git Conventions

- Branch: feature branches off `main`
- Commits: conventional commits (`feat:`, `fix:`, `style:`, `refactor:`, `chore:`)
- No force pushes to `main`

---

## Testing (Minimal for Hackathon)

- Manual testing on iPhone Safari (primary)
- Chrome DevTools mobile emulation (secondary)
- No unit tests required for hackathon scope
- Validate: PWA install, offline shell, touch interactions, safe areas
