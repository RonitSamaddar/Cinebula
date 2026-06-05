# Cinebula v2-hackathon — Agent Context

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│  LG TV Mock     │         │  Frontend (Next)  │         │  Backend (Go :8080) │
│  :8020 (static) │◄─QR────▶│  :8010            │         │                     │
│  Shows QR code  │  scan   │  /api/proxy ──────┼────────▶│  /auth/login        │
│                 │         │  /api/log         │  HTTP   │  /top-genres        │
└─────────────────┘         │                   │────────▶│  /api/movies        │
                            └──────────────────┘         │  /api/similar       │
                                                         │  /api/filters       │
                                                         │  /search            │
                                                         │  /user/profile      │
                                                         │         │           │
                                                         │         ▼           │
                                                         │  Meilisearch :7700  │
                                                         │         │           │
                                                         │         ▼           │
                                                         │  TKACR upstream     │
                                                         │  (external API)     │
                                                         └─────────────────────┘
```

## Services

| Service | Port | Tech Stack | Directory |
|---------|------|------------|-----------|
| Backend | 8080 | Go + Meilisearch | `backend/` |
| Frontend | 8010 | Next.js 16 + React 19 + Tailwind | `frontend/app/` |
| LG Homescreen Mock | 8020 | Static HTML (python http.server) | `lg-homescreen-mock/` |

---

## Backend (Go :8080)

### Dependencies
- Go 1.26.2
- Meilisearch (local, port 7700) — typo-tolerant search
- TKACR upstream API (`tkacr-dev5.alphonso.tv:8080`) — movie catalog, 2D coords, similarity

### API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/auth/login` | None | Register/login user. Body: `{name?, age?, gender?, top_genres?, device_id?}`. Returns JWT + user_id |
| `GET` | `/top-genres` | JWT | User's ranked top genres with priority weights |
| `GET` | `/api/movies` | Optional JWT | Movies filtered by `?genre=`, `?keyword=`, `?language=`, `?movie_name=`. Adds priority + `is_watched` |
| `GET` | `/api/similar` | Optional JWT | Similar movies: `?movie=<title>&k=<max>` |
| `GET` | `/api/filters` | None | Available filter dimensions (genre, language, cast) |
| `GET` | `/search` | JWT | Typo-tolerant title search. `?q=<query>`, returns up to 50 matches |
| `GET` | `/user/profile` | JWT | Authenticated user's profile |

### Internal Packages
- `internal/auth` — JWT issuance, validation, middleware
- `internal/search` — Meilisearch client + handler
- `internal/data-service` — Proxies to TKACR upstream
- `internal/filter` — Filter values from JSON
- `internal/top-genres` — Computes top genres from ACR watch data
- `internal/acr-data-processor` — ACR viewing data → genre weights + watched titles
- `internal/space-stitcher` — Stitches 9 genre 2D spaces into 900×900 grid (3×3 of 300×300)
- `internal/priority` — IMDb-style weighted rating scores (0–100)
- `internal/user` — User CRUD

### Startup Sequence
1. Kill existing procs on :8080 and :7700
2. Start Meilisearch on 127.0.0.1:7700
3. Run `cmd/indexer` — indexes titles into Meilisearch (skips if already done)
4. Run `cmd/server` — HTTP server on :8080

---

## Frontend (Next.js :8010)

### Tech Stack
- Next.js 16.2.7 (App Router), React 19.2.4, Zustand, Tailwind CSS 4, TypeScript 5
- `jsqr` for QR code scanning

### Key Structure
- `src/app/` — Pages + API routes (`/api/proxy`, `/api/log`)
- `src/canvas/` — Galaxy/canvas visualization
- `src/components/` — React components
- `src/services/backend.ts` — Backend API client (proxies via `/api/proxy` → `localhost:8080`)
- `src/stores/` — Zustand stores
- `src/types/` — TypeScript types

### User Flow
QR scan → gets `device_id` → login → fetch top genres → fetch movies per genre → render galaxy UI

---

## LG Homescreen Mock (:8020)

Static HTML simulating an LG webOS TV home screen:
- Left sidebar navigation, hero banner, category buttons, app launcher row
- Content card rows with "Cinebula" app card (NEW badge)
- QR code generation (`qrcode-generator` CDN lib)

No build step — served as static file via `python3 -m http.server`.

---

## Service Interactions

1. **TV → Phone:** QR code on TV encodes `device_id`; phone scans to pair
2. **Frontend → Backend:** All requests via Next.js `/api/proxy` route → `localhost:8080`
3. **Backend → Meilisearch:** Local search index for titles
4. **Backend → TKACR:** External upstream for movie catalog, coordinates, similarity

---

## Running

```bash
./run.sh   # Starts all 3 services (backend:8080, frontend:8010, lg-mock:8020)
```
