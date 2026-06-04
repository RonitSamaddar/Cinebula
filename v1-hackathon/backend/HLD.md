# Cinebula Backend — High-Level Design

## Overview

Go modular monolith. Single deployable binary. Internal module separation mirrors service boundaries from the AGENT spec.

All content data and user profiles are stored as JSON files committed to git. No external database for MVP. All data is loaded into memory at startup.

### 2D Semantic Space

An external algorithm pre-computes **18 per-genre 2D coordinate spaces**, one per genre (Action, Drama, Sci-Fi, Comedy, etc.). Each space normalises all titles in that genre to a `[-1, +1]` unit square. Files live at `../2D-space/genres/{genre}.json`. The backend does not generate them.

On each session the **ACR-data-processor** derives the user's **top-5 genres** from their ACR watch history (watch-time-weighted genre ranking). The **space-stitcher** loads those 5 genre files and stitches them into a single merged coordinate space using fixed cardinal offsets (`D = 2.0` between genre centres). The phone navigates this stitched space via a sliding viewport — it sends viewport dimensions `l × b` and current centre `(cx, cy)`, and the backend returns titles inside that rectangle.

---

## Architecture Diagram

```
Phone Client
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│                     Go HTTP Server                        │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐  │
│  │   Auth   │  │  Search  │  │  ACR-Data-Processor    │  │
│  │ Module   │  │ Module   │  │  Module                │  │
│  └────┬─────┘  └────┬─────┘  └───────────┬────────────┘  │
│       │             │                    │               │
│  ┌────▼─────────────▼────────────────────▼────────────┐  │
│  │              Space-Stitcher Module                  │  │
│  │  (top-5 genre spaces → merged coords → tile API)   │  │
│  └────────────────────────┬───────────────────────────┘  │
│                            │                              │
│  ┌─────────────────────────▼──────────────────────────┐  │
│  │                 Content Module                      │  │
│  │   (in-memory catalog, batch metadata fetch)         │  │
│  └─────────────────────────┬──────────────────────────┘  │
│                             │                             │
│  ┌──────────────────────────▼─────────────────────────┐  │
│  │                 User Module                         │  │
│  │   (in-memory profiles + JSON file store)            │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
            │                            │
       global-data/                  ../users/
       movies.json                   {userId}.json
       shows.json

       2D-space/genres/
       {genre}.json    ← 18 files, produced by external algo
```

---

## Module Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # wires all modules, starts HTTP server
│
├── internal/
│   ├── auth/
│   │   ├── handler.go           # POST /auth/login, POST /auth/refresh
│   │   ├── middleware.go        # JWT validation middleware
│   │   └── service.go           # issue / verify JWT tokens
│   │
│   ├── content/
│   │   ├── handler.go           # POST /content/batch, GET /content/:id, GET /content/:id/similar
│   │   ├── model.go             # Content struct
│   │   └── store.go             # load + index global-data JSON files into memory at startup
│   │
│   ├── search/
│   │   ├── handler.go           # GET /search?q=&type=&limit=
│   │   └── service.go           # prefix match, fuzzy match, semantic fallback
│   │
│   ├── user/
│   │   ├── handler.go           # GET /user/profile, PUT /user/profile, POST /user/action
│   │   ├── model.go             # UserProfile struct
│   │   ├── service.go           # update watch_history on action
│   │   └── store.go             # read/write ../users/{userId}.json files
│   │
│   ├── acr-data-processor/
│   │   ├── handler.go           # POST /acr/ingest (internal)
│   │   ├── ingester.go          # parse raw ACR sessions → structured watched-content list
│   │   ├── matcher.go           # match ACR show_id/title against content catalog → content IDs
│   │   └── service.go           # accumulate watch time per genre → produce ranked top_genres list
│   │
│   └── space-stitcher/
│       ├── handler.go           # GET /space/tile
│       ├── stitcher.go          # load top-5 genre spaces → apply cardinal offsets → merged map
│       ├── popularity.go        # compute adjusted_popularity (base + WATCH_BOOST if in watch_history)
│       └── tile.go              # spatial filter of merged map to requested viewport rectangle
│
├── scripts/
│   └── derive_clusters.py       # reads ../2D-space/space.json → computes cluster centroids → clusters_2d.json
│
# ── outside backend/, shared across the monorepo ──
# ../global-data/
#     movies.json                # content catalog (movies)
#     shows.json                 # content catalog (shows)
#
# ../2D-space/genres/
#     {genre}.json               # 18 per-genre coordinate files (external algo)
#
# ../users/
#     {userId}.json              # one file per user
│
├── go.mod
└── go.sum
```

---

## Data Models

### Content (movies.json / shows.json)

```json
{
  "id": "ALP-MOVIE-001",
  "title": "Inception",
  "type": "movie",
  "year": 2010,
  "genres": ["Action", "Sci-Fi", "Thriller"],
  "semantic_tags": ["Cerebral", "Dark", "Mind-bending", "Spectacle", "Hopefulness"],
  "actors": ["Leonardo DiCaprio", "Joseph Gordon-Levitt"],
  "director": "Christopher Nolan",
  "language": "English",
  "runtime_mins": 148,
  "ott": ["Netflix", "Prime Video"],
  "poster_url": "...",
  "synopsis": "..."
}
```

### Per-Genre 2D Space (../2D-space/genres/{genre}.json) — produced by external algorithm

One file per genre, 18 total. Each file contains only titles belonging to that genre, coordinates normalised to `[-1, +1]`.

```json
{
  "ALP-MOVIE-001": { "x": 0.42,  "y": -0.18 },
  "ALP-MOVIE-002": { "x": -0.31, "y":  0.55 }
}
```

### Stitched Space (in-memory, built at request time by space-stitcher)

Genre centres in the stitched space (`D = 2.0`):

| Rank | Position | Offset |
|------|----------|---------|
| 1st (top genre) | Centre | `(0, 0)` |
| 2nd | Right    | `(+D, 0)` |
| 3rd | Left     | `(-D, 0)` |
| 4th | Up       | `(0, +D)` |
| 5th | Down     | `(0, -D)` |

Each title's stitched coordinate = its per-genre `(x, y)` + genre centre offset.

### User Profile ({userId}.json)

```json
{
  "userId": 1,
  "top_genres": ["Sci-Fi", "Action", "Thriller", "Drama", "Comedy"],
  "acr_content_ids": ["ALP-MOVIE-107", "ALP-SHOW-110"],
  "liked": ["ALP-MOVIE-001"],
  "disliked": [],
  "watch_history": [
    { "content_id": "ALP-MOVIE-107", "watched_at": "2026-05-04T00:13:40Z" }
  ]
}
```

`top_genres` is the user's watch-time-weighted genre ranking, computed by ACR-data-processor. The stitching layout is derived from this array. Every session starts at `(cx=0, cy=0)` — no `focus_point` is stored.

---

## API Endpoints

### Auth

| Method | Path              | Description                        |
|--------|-------------------|------------------------------------|
| POST   | /auth/login       | phone number → mock OTP → JWT      |
| POST   | /auth/refresh     | refresh access token               |

### Search

| Method | Path     | Query Params                  | Description                              |
|--------|----------|-------------------------------|------------------------------------------|
| GET    | /search  | q, type (movie/show/all), limit | prefix + fuzzy + metadata search      |

### Space (tile navigation)

| Method | Path          | Query Params          | Description                                                                 |
|--------|---------------|-----------------------|-----------------------------------------------------------------------------|
| GET    | /space/tile   | userId, cx, cy, l, b  | Returns titles in viewport `[cx±l/2, cy±b/2]`. Response: `{ id, x, y, adjusted_popularity }[]` |

`l` and `b` are the viewport width and height in 2D space units, sent by the phone. The phone adjusts `l` and `b` for the current zoom level using fixed constants (`ZOOM_IN_FACTOR`, `ZOOM_OUT_FACTOR`) before making the request.

### Content

| Method | Path                    | Description                                                       |
|--------|-------------------------|-------------------------------------------------------------------|
| POST   | /content/batch          | Phone sends list of IDs → returns full metadata + poster_url for each |
| GET    | /content/:id            | Full detail for one title including synopsis                      |
| GET    | /content/:id/similar    | Nearest titles by 2D Euclidean distance in stitched space         |

### User

| Method | Path            | Description                                              |
|--------|-----------------|----------------------------------------------------------|
| GET    | /user/profile   | Get user profile (includes current `focus_point`)        |
| PUT    | /user/profile   | Update preferences                                       |
| POST   | /user/action    | Record like / dislike / watch → update `focus_point`     |

### ACR (internal)

| Method | Path            | Description                                                    |
|--------|-----------------|----------------------------------------------------------------|
| POST   | /acr/ingest     | Ingest raw ACR session data → compute + persist `top_genres`   |

---

## Navigation Model

### Viewport Tiling

The stitched 2D space is navigated via a sliding rectangular viewport. The phone sends viewport dimensions (`l` = width, `b` = height in 2D space units) with every tile request. The backend returns all titles whose stitched `(x, y)` falls within:

```
x ∈ [cx - l/2 , cx + l/2]
y ∈ [cy - b/2 , cy + b/2]
```

Response per title: `{ id, x, y, adjusted_popularity }`.

### Starting Position

Every session begins at `(cx=0, cy=0)` — the centre of the top-genre space.

### Swipe Navigation

Each swipe moves the viewport centre by exactly one viewport dimension:

| Gesture     | New centre            |
|-------------|-----------------------|
| Swipe right | `(cx + l, cy)`        |
| Swipe left  | `(cx - l, cy)`        |
| Swipe up    | `(cx, cy + b)`        |
| Swipe down  | `(cx, cy - b)`        |

The phone pre-fetches the 4 adjacent tiles immediately after each move to minimise latency.

### Zoom Levels

All three zoom levels use the same swipe mechanics. The phone manages which `l` and `b` to send per request, based on fixed zoom constants:

| Level    | Phone sends                                          |
|----------|------------------------------------------------------|
| Normal   | base `l`, base `b`                                   |
| Zoom-in  | `l × ZOOM_IN_FACTOR`, `b × ZOOM_IN_FACTOR`           |
| Zoom-out | `l × ZOOM_OUT_FACTOR`, `b × ZOOM_OUT_FACTOR`         |

`ZOOM_IN_FACTOR` (< 1.0) and `ZOOM_OUT_FACTOR` (> 1.0) are fixed constants agreed between phone and backend. Zoom-in supports exactly one depth level.

---

## Popularity Model

Each title has a `base_popularity` field in the content catalog. When serving a tile, the space-stitcher computes `adjusted_popularity`:

```
adjusted_popularity = base_popularity + WATCH_BOOST   (if content_id ∈ user.watch_history)
adjusted_popularity = base_popularity                  (otherwise)
```

`WATCH_BOOST` is a fixed constant. Titles the user has already watched surface more prominently in the tile, blending familiarity with discovery.

ACR data is **not** used for popularity boosting — it is used only for `top_genres` ranking.

---

## Space-Stitcher Module

Owns the construction of the per-user merged coordinate space and all tile serving.

**Inputs:**
- `../2D-space/genres/{genre}.json` — coordinate files for top-5 genres
- User profile (`top_genres`, `watch_history`)
- Tile request params: `cx, cy, l, b`

**Pipeline (`stitcher.go` → `popularity.go` → `tile.go`):**

```
user.top_genres[:5]
  ↓  stitcher.go
Load ../2D-space/genres/{genre}.json for each of top-5
Apply cardinal offsets (D = 2.0):
  rank 1 → centre  (0,  0)
  rank 2 → right   (+D, 0)
  rank 3 → left    (-D, 0)
  rank 4 → up      (0, +D)
  rank 5 → down    (0, -D)
Merged map: contentId → { x_stitched, y_stitched }
  ↓  popularity.go
For each title in merged map:
  adjusted_popularity = base_popularity + WATCH_BOOST  if id ∈ watch_history
  ↓  tile.go
Filter merged map to viewport [cx±l/2, cy±b/2]
Return []TileEntry{ id, x, y, adjusted_popularity }
```

**What each file does:**

| File | Responsibility |
|---|---|
| `stitcher.go` | Load top-5 genre JSON files, translate coordinates by cardinal offsets, build merged in-memory map |
| `popularity.go` | Apply `WATCH_BOOST` to titles present in user's `watch_history` |
| `tile.go` | Spatial filter of merged map to the requested viewport rectangle |
| `handler.go` | HTTP handler for `GET /space/tile` — parse params, call stitcher, return JSON |

---

## ACR-Data-Processor Module

Owns everything related to turning raw ACR session data into a ranked genre list.

**Input:** Raw ACR session JSON (from `../ACR-data/acr-data.json` or the ingest endpoint)

**Pipeline (`ingester.go` → `matcher.go` → `service.go`):**

```
Raw ACR sessions (show_id, show_title, session timestamps, genres)
  ↓  ingester.go
Structured watch events: { show_id, show_title, duration_seconds }
  ↓  matcher.go
Resolved content IDs: match show_id or fuzzy-match title against global-data catalog
  ↓  service.go
For each resolved content ID:
  → look up genres[] from content catalog
  → accumulate watch_duration per genre
Compute ranked genre list:
  → top_genres = genres sorted descending by total accumulated watch_duration
Persist top_genres[:5] to ../users/{userId}.json
```

**What each file does:**

| File | Responsibility |
|---|---|
| `ingester.go` | Parse raw ACR JSON, extract session list, compute watch duration per session |
| `matcher.go` | Match ACR `show_id` / `show_title` against the in-memory content catalog. Exact ID match first, fuzzy title match as fallback |
| `service.go` | Accumulate watch time per genre across resolved content IDs → produce sorted `top_genres` list → write to user profile |
| `handler.go` | HTTP handler for `POST /acr/ingest` — receives ACR payload, calls service, returns updated profile |

**Output written to user profile:**
```json
{
  "userId": 1,
  "top_genres": ["Sci-Fi", "Action", "Thriller", "Drama", "Comedy"],
  "acr_content_ids": ["ALP-MOVIE-107", "ALP-SHOW-110"]
}
```

This module does **not** boost popularity, compute coordinates, or serve tiles. Its only job is ACR → `top_genres` ranking.

---

## Request Flow: Full Example

```
1. POST /auth/login
   → JWT

2. POST /acr/ingest
   → acr-data-processor computes top_genres from ACR watch history

3. GET /space/tile?userId=1&cx=0&cy=0&l=2.0&b=3.5
   → space-stitcher loads top-5 genre spaces, stitches them
   → returns titles in opening viewport with adjusted_popularity

4. [User swipes right]
   GET /space/tile?userId=1&cx=2.0&cy=0&l=2.0&b=3.5
   → titles in next viewport tile
   (phone pre-fetches 4 adjacent tiles in background)

5. [User zooms in — phone applies ZOOM_IN_FACTOR=0.5]
   GET /space/tile?userId=1&cx=2.0&cy=0&l=1.0&b=1.75
   → denser set of nearby titles in smaller viewport
   (same swipe mechanics at this zoom level)

6. [User taps a title]
   POST /content/batch { ids: [...] }  → full metadata + poster_url
   GET  /content/:id                   → detail + synopsis
   POST /user/action { action: "watch", content_id: "..." }
   → adds to watch_history; future tiles boost this title's adjusted_popularity

7. [User searches]
   GET /search?q=nolan        → returns matches with (x, y) in stitched space
   → phone jumps viewport centre to (x, y)
   GET /space/tile?...&cx={x}&cy={y}&l=2.0&b=3.5
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Runtime | Go | Performance, concurrency, single binary |
| Architecture | Modular monolith | Simple to deploy, avoids distributed overhead for MVP |
| Storage | JSON files in git | Zero infra, all data in repo, fast iteration |
| 2D semantic space | 18 per-genre static spaces, external algo | Backend has zero responsibility for embedding quality; clean boundary |
| Genre stitching | Cardinal placement, D=2.0, top genre at origin | Simple, deterministic; `(0,0)` always maps to user's top genre |
| Navigation | Server-side viewport tiling; `l × b` sent by phone | Phone sends zoom-adjusted dimensions; backend is fully stateless |
| Zoom | Fixed constants `ZOOM_IN_FACTOR` / `ZOOM_OUT_FACTOR` | Agreed between phone and backend; single depth level for zoom-in |
| Popularity | `base_popularity + WATCH_BOOST` for watched titles | Surfaces familiar content without complex real-time scoring |
| ACR data | Used only for `top_genres` ranking, not popularity | Clean separation of concerns between ACR processor and space-stitcher |
| Session origin | Always `(cx=0, cy=0)` | Consistent, predictable entry point into top-genre space |
| Content delivery | `/space/tile` (coords+popularity) → `/content/batch` (metadata) | Phone fetches lightweight tile first, then metadata only for visible titles |
| Auth | JWT (HS256), phone-number mock OTP for MVP | Stateless, easy to extend to real OTP later |

---

## What is NOT in HLD (deferred)

- Real OTP / SMS (mock for MVP)
- Generation of genre space files — owned by separate algo team
- TV QR pairing / WebSocket sync — future phase
- TMDB / IMDb live data fetch — manual JSON enrichment for MVP
- Rate limiting, distributed caching — post-MVP
- Pivot / space regeneration on user action — future phase
- Personalised `WATCH_BOOST` magnitude — fixed constant for MVP
