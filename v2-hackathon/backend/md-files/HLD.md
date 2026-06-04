# Cinebula Backend — High-Level Design (v2)

## Overview

Go modular monolith. Single deployable binary. No external database — user profiles stored in `databases/users.csv`. Movie catalog and 2D coordinates are served by the external TKACR data service (`tkacr-dev5.alphonso.tv:8080`); the backend proxies and enriches those responses.

The **space-stitching and tile navigation** logic has moved to the frontend. The backend's job is:
1. Auth — register users, issue JWTs.
2. Top-genres — return a user's ranked genres with priority weights (JWT required).
3. Data service — proxy `/api/movies` to TKACR and append a computed `priority` score to every movie.
4. Filters — return available filter dimensions (genre, language, cast) from static config.
5. Search — typo-tolerant title search via Meilisearch (JWT required).
6. Priority — IMDb Bayesian weighted rating, normalised 0–100, computed per response.

---

## Architecture Diagram

```
Phone Client
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│                   Go HTTP Server (localhost:8080)          │
│                                                            │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────┐  │
│  │   Auth   │  │  Top-Genres  │  │ Data-Service │  │ User │  │
│  │  Module  │  │   Module     │  │   Module     │  │      │  │
│  └──────────┘  └─────────────┘  └─────┬──────┘  └──────┘  │
│                                        │                   │
│                              ┌─────────┴────────┐            │
│                              │  Priority Module   │            │
│                              │ (IMDb weighted     │            │
│                              │  rating, 0–100)    │            │
│                              └───────────────────┘            │
└──────────────────────────────────────────────────────────┘
          │                              │
   databases/users.csv     tkacr-dev5.alphonso.tv:8080
                            (external data service)
```

---

## Module Structure

```
backend/
├── cmd/server/main.go              # wires all modules, starts HTTP server
│
├── internal/
│   ├── auth/
│   │   ├── handler.go           # POST /auth/login
│   │   ├── middleware.go        # JWT validation
│   │   └── service.go           # issue / verify JWT tokens
│   │
│   ├── user/
│   │   ├── handler.go           # GET /user/profile  [JWT]
│   │   ├── model.go             # User struct
│   │   └── store.go             # read databases/users.csv
│   │
│   ├── top-genres/
│   │   ├── handler.go           # GET /top-genres  [JWT]
│   │   └── model.go             # TopGenresResponse, GenreWeight
│   │
│   ├── data-service/
│   │   ├── consts.go            # TKACRBaseURL constant
│   │   ├── model.go             # Movie, MoviesResponse structs
│   │   ├── client.go            # HTTP client → tkacr-dev5.alphonso.tv:8080
│   │   └── handler.go           # GET /api/movies (calls priority.Compute)
│   │
│   ├── filter/
│   │   ├── handler.go           # GET /api/filters  (public)
│   │   └── model.go             # FilterOption, FiltersResponse
│   │
│   ├── search/
│   │   ├── handler.go           # GET /search  [JWT]
│   │   └── client.go            # Meilisearch client
│   │
│   └── priority/
│       ├── model.go             # Score struct
│       └── service.go           # Compute(voteAverages, voteCounts) []float64
│
├── databases/users.csv             # user store (CSV)
├── data-dirs/
│   ├── data-consts.json         # genres, languages, cast, weights
│   ├── ACR-data/acr-data.json   # ACR watch-history by device_id
│   └── titles/                  # Meilisearch index source
├── md-files/                       # documentation
├── integration-tests/              # Go integration test suite
├── go.mod
└── run.sh
```

---

## Priority Module

### Formula (IMDb Bayesian weighted rating)

```
raw = (v / (v + m)) * R + (m / (v + m)) * C

R = movie vote_average
v = movie vote_count
C = mean vote_average across the catalog (from this response)
m = 75th-percentile vote_count across the catalog (from this response)
```

Normalised to [0, 100]:
```
priority = (raw - min) / (max - min) * 100
```

### Priority → UI zoom mapping

| Priority range | Visibility          |
|----------------|---------------------|
| 80 – 100       | Large — visible zoomed out |
| 50 – 79        | Medium              |
| 20 – 49        | Small               |
| 0 – 19         | Deep cuts — visible only zoomed in |

### Future: personalised priority

```
final = (1 - alpha) * global_priority + alpha * user_match
alpha ≈ 0.4
```

---

## API Endpoints

| Method | Path            | Auth | Description                                               |
|--------|-----------------|------|-----------------------------------------------------------|
| POST   | /auth/login     | —    | Register user → JWT                                       |
| GET    | /user/profile   | JWT  | Return authenticated user's profile                       |
| GET    | /top-genres     | JWT  | User's top-9 genres with priority weights (ACR or fallback) |
| GET    | /api/movies     | —    | Proxy TKACR catalog + append priority score               |
| GET    | /api/filters    | —    | Available filter dimensions: genre, language, cast        |
| GET    | /search         | JWT  | Typo-tolerant title search via Meilisearch                |

---

## Data Models

### User (databases/users.csv)

```
user_id, name, age, gender, top_genres (JSON array), created_at
```

### Movie (from /api/movies)

```json
{
  "movie_name":   string,
  "image_link":   string,
  "vote_average": number,
  "vote_count":   number,
  "revenue":      number,
  "budget":       number,
  "popularity":   number,
  "genres":       [string],
  "language":     string,
  "imdb_rating":  number,
  "synopsis":     string,
  "keywords":     [string],
  "casts":        [string] | null,
  "x":            number,
  "y":            number,
  "priority":     number
}
```

---

## Request Flow: Full Example

```
1. POST /auth/login { device_id: "..." }
   → returns JWT + user_id

2. GET /api/filters
   → returns { filters: [ genre, language, cast ] }
   → phone populates filter dropdowns (no token needed)

3. GET /top-genres  [Bearer JWT]
   → ACR lookup by device_id → returns top-9 ranked genres

4. For each top genre:
   GET /api/movies?genre=<genre>
   → returns movies with (x, y) coords + priority score
   → phone places each movie on the spatial canvas

5. [User filters]
   GET /api/movies?genre=action&language=en&cast=Tom+Hanks
   → filtered movie list with coords

6. [User searches]
   GET /search?q=inception  [Bearer JWT]
   → returns matching titles from Meilisearch
   → phone highlights results on the canvas
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Runtime | Go | Performance, single deployable binary |
| Architecture | Modular monolith | Simple to deploy, no distributed overhead for MVP |
| Storage | CSV + JSON files | Zero infra, all data in repo, fast iteration |
| Auth | JWT (HS256) | Stateless; identity flows through token, not query params |
| Movie catalog | Proxied from TKACR external service | Backend has zero responsibility for 2D coordinates |
| Priority scoring | IMDb Bayesian weighted rating, normalised 0–100 | Per-response, no caching needed |
| Filters | Static values from `data-consts.json` | No DB query needed; values change rarely |
| ACR data | Used only for `top_genres` ranking | Clean separation from content delivery |
| Search | Meilisearch (local, pre-indexed) | Typo-tolerant, fast, no external dependency at query time |
