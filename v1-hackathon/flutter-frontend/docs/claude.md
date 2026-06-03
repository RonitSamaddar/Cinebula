# Cinebula — Claude Development Guide

> Instructions and context for AI-assisted development of the Cinebula Flutter app.

---

## Project Overview

Cinebula is a phone-native TV show discovery app built with **Flutter**. Users explore a spherical galaxy where shows are stars clustered by category. An alien companion delivers recommendations. Users build a queue and send it to their TV.

**Current state:** Default Flutter counter template. All Cinebula features need to be built from scratch. Directory structure (`lib/canvas/`, `lib/screens/`, `lib/theme/`) exists but is empty.

---

## Tech Stack

| Component | Choice | Notes |
|-----------|--------|-------|
| **Framework** | Flutter (Dart) | Cross-platform, portrait only |
| **State Management** | `flutter_riverpod` | Providers for galaxy state, queue, metrics, alien |
| **Image Caching** | `cached_network_image` | Poster images from TVMaze CDN |
| **Fonts** | `google_fonts` | Instrument Serif, JetBrains Mono, Inter |
| **Local Storage** | `hive` | Queue persistence, session metrics |
| **Audio** | `just_audio` | Ambient drone (or raw AudioContext for web) |
| **Animations** | Built-in Flutter + `CustomPainter` | Tickers for 60fps effects |
| **Target** | iOS + Android (deploy via Flutter web for dev testing) |

---

## Development & Testing Commands

```bash
# Build for web (release)
flutter build web --release

# Run on web server (accessible from other devices on network)
flutter run -d web-server --web-hostname 0.0.0.0 --web-port 8080

# Serve pre-built web app
cd build/web && python3 -m http.server 80 --bind 0.0.0.0

# Run on Chrome
flutter run -d chrome

# Run tests
flutter test

# Analyze code
flutter analyze
```

---

## Project Structure

```
lib/
├── main.dart                    # App entry point, MaterialApp, routes
├── canvas/                      # CustomPainter canvases
│   ├── starfield_painter.dart   # Pre-rendered starfield (14 layers)
│   ├── nebula_painter.dart      # Category-colored nebula gradients
│   ├── effects_painter.dart     # 60fps shooting stars, twinkling, dust
│   ├── connection_painter.dart  # Lines between related shows
│   └── film_grain_painter.dart  # Noise overlay
├── screens/                     # Screen-level widgets
│   └── galaxy_screen.dart       # Main (and only) screen — Stack of all layers
├── theme/                       # Design system
│   ├── app_theme.dart           # ThemeData, colors, text styles
│   └── app_colors.dart          # Color constants
├── models/                      # Data classes
│   ├── show_model.dart          # Show data class
│   ├── category_model.dart      # Category data class
│   └── session_metrics.dart     # Analytics tracking
├── data/                        # Static data (hardcoded for hackathon)
│   ├── shows_data.dart          # ~300 shows with metadata
│   ├── categories_data.dart     # 6 category definitions
│   └── connections_data.dart    # 70+ show connection pairs
├── providers/                   # Riverpod state providers
│   ├── galaxy_provider.dart     # Camera position, zoom state, momentum
│   ├── queue_provider.dart      # Tonight's queue state
│   ├── search_provider.dart     # Search/filter state
│   ├── alien_provider.dart      # Alien state machine
│   └── metrics_provider.dart    # Session tracking
├── widgets/                     # Reusable UI components
│   ├── show_card.dart           # Show poster card (4 sizes)
│   ├── detail_popup.dart        # Show detail overlay
│   ├── category_pill.dart       # Top-center category indicator
│   ├── compass_label.dart       # Edge category direction labels
│   ├── queue_bar.dart           # Bottom chrome bar
│   ├── queue_panel.dart         # Bottom sheet queue list
│   ├── menu_drawer.dart         # Left-side search/filter drawer
│   ├── alien_ship.dart          # Alien + spaceship widget
│   ├── speech_bubble.dart       # Alien speech bubble
│   ├── rec_dialog.dart          # Full-screen recommendation dialog
│   ├── zoom_controls.dart       # Dive In / Galaxy View buttons
│   ├── user_ring.dart           # Center "YOU" ring
│   ├── pan_hint.dart            # "DRAG TO EXPLORE" hint
│   └── send_confirmation.dart   # "Sent to TV" overlay
└── utils/                       # Helpers
    ├── sphere_math.dart         # Spherical geometry, great-circle distance
    └── recommendation_engine.dart # 3 recommendation algorithms
```

---

## Architecture Principles

### Single Screen App
Cinebula is a **single-screen app**. `GalaxyScreen` is the only route. All UI (popups, panels, drawers, dialogs) are overlays in a `Stack`.

### Widget Tree

```
CinebulaApp (MaterialApp)
└── GalaxyScreen
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
        ├── ChromeTop (CategoryPill)
        ├── ChromeBottom (QueueBar)
        ├── ZoomControls
        ├── DetailPopup (AnimatedPositioned)
        ├── QueueFlyChip (animation)
        ├── AlienShip
        ├── QueuePanel (DraggableScrollableSheet)
        ├── SendConfirmation
        ├── MenuBackdrop + MenuDrawer
        └── RecDialog (full screen overlay)
```

### State Management (Riverpod)

Key providers:
- **GalaxyState**: camera position (spherical coords), zoom level (binary), momentum velocity, current category
- **QueueState**: list of queued show IDs, ordered
- **SearchState**: active query, genre filters, language filter, actor filter, filtered show IDs
- **AlienState**: current state (idle/gesture/rec_bubble/dialog), timers, current message
- **MetricsState**: session start, category dwell map, click log

### Performance Rules
1. Pre-render starfield and nebula to `ui.Image` at init (expensive once, free to draw after)
2. Only render cards within viewport ± 200px buffer (cull off-screen)
3. Use `Transform.translate` for card movement, NOT `Positioned` (avoids relayout)
4. Wrap each `ShowCard` in `RepaintBoundary`
5. Effects canvas: `CustomPainter` with `shouldRepaint: true`, driven by `Ticker`
6. Momentum physics: use `Ticker` not `Timer` for frame sync

---

## Design System Quick Reference

### Colors
```dart
static const base = Color(0xFF07070C);
static const ink = Color(0xFFF4EBD9);
static const inkSoft = Color(0xFFC8BFA8);
static const inkDim = Color(0xFF6A6457);
static const alienGreen = Color(0xFF7FFF7F);
static const queuePurple = Color(0xFFD4A0FF);
// Category accents are dynamic — see categories_data.dart
```

### Fonts
- **Instrument Serif** — display headings, show titles (13–22px)
- **JetBrains Mono** — UI labels, buttons, metadata (8–12px, letter-spacing 0.08–0.18em)
- **Inter** — body text, descriptions (12–14px)

### Glassmorphism
```dart
// Standard glass surface
Container(
  decoration: BoxDecoration(
    color: Color(0xFF0E0C18).withOpacity(0.94),
    borderRadius: BorderRadius.circular(14),
    border: Border.all(color: Colors.white.withOpacity(0.12)),
  ),
  child: ClipRRect(
    borderRadius: BorderRadius.circular(14),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
      child: content,
    ),
  ),
)
```

---

## Data Strategy

All data is **hardcoded** for the hackathon. No backend API calls.

- **Shows:** ~300 show objects with real metadata and TVMaze poster URLs
- **Categories:** 6 genre-based categories with colors and sphere positions
- **Connections:** 70+ pairs of related shows
- **Recommendations:** Calculated client-side using 3 scoring algorithms

Future: Replace hardcoded data with backend API calls (`GET /categories`, `GET /shows`).

---

## Key Behavioral Rules

1. **Pan ignores UI areas** — no drag starts on popups, panels, drawers, alien, chrome
2. **One popup at a time** — detail popup closes on drag or tap-away
3. **Menu is exclusive** — no galaxy interaction while open
4. **Rec dialog is exclusive** — alien timers paused
5. **Alien rec suppressed** when rec dialog, detail popup, or menu is open
6. **Queue state persists** — queued cards keep purple glow
7. **Zoom resets on search/filter**
8. **Dedup everywhere** — search results, zoom shows, rec picks

---

## Important Context

- This is a **hackathon project** (June 3–5, 2025). Speed > perfection.
- The **browser mock** (HTML/CSS/JS, ~4500 lines) is the source of truth for visual behavior. Ref docs capture everything from it.
- **TVMaze CDN** is used for poster images — these are public API URLs, no auth needed.
- The app is **portrait-only**, no landscape support needed.
- **Film grain, ambient audio, and effects** are polish — build core galaxy + cards + queue first.
- Brand name changed from **Pharia** to **Cinebula** (cinema + nebula).
