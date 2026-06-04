# Cinebula — Phone API Reference

**Base URL:** `http://localhost:8080`

All endpoints return `Content-Type: application/json`.

---

## 1. Register & Get Token

### `POST /auth/login`

Register a new user and receive a JWT for protected endpoints.
**All fields are optional.** Providing `device_id` links the account to ACR watch-history data, enabling personalised top-genres.

**Minimal request (anonymous guest):**
```json
{}
```

**With device ID only (links to ACR data):**
```json
{
  "device_id": "46426f9c-ssss-4593-9399-21798b0d1148"
}
```

**Full request:**
```json
{
  "name": "Pratikesh",
  "age": 22,
  "gender": "male",
  "top_genres": ["Sci-Fi", "Action", "Drama", "Thriller", "Comedy", "Horror", "Crime", "Mystery", "Adventure"],
  "device_id": "46426f9c-ssss-4593-9399-21798b0d1148"
}
```

| Field        | Type     | Required | Notes                                          |
|--------------|----------|----------|------------------------------------------------|
| `name`       | string   | No       | Defaults to `guest-<id>` if omitted            |
| `age`        | int      | No       |                                                |
| `gender`     | string   | No       |                                                |
| `top_genres` | []string | No       | If provided, must be valid genre names         |
| `device_id`  | string   | No       | Links account to ACR data for personalisation  |

**Response `200`:**
```json
{ "user_id": 3, "token": "<JWT>", "device_id": "46426f9c-ssss-4593-9399-21798b0d1148" }
```

> `device_id` is echoed back only when provided in the request.

**Errors:** `400` unknown genre name.

---

## 2. User Profile

### `GET /user/profile`

Returns the profile of the authenticated user.

**Header:** `Authorization: Bearer <JWT>`

**Response `200`:**
```json
{
  "user_id": 3,
  "name": "Pratikesh",
  "age": 22,
  "gender": "male",
  "top_genres": ["Sci-Fi", "Action", "Drama", "Thriller", "Comedy", "Horror", "Crime", "Mystery", "Adventure"],
  "created_at": "2026-06-04T10:00:00Z"
}
```

**Errors:** `401` missing / invalid token.

---

## 3. Data Service — Movie Catalog

Proxies requests to the TKACR external data service (`tkacr-dev5.alphonso.tv:8080`).
Returns movies with pre-computed **2D (x, y) coordinates** for spatial rendering.

### `GET /api/movies`

All query parameters are **optional**. Combine freely.

| Param        | Description                       | Example                    |
|--------------|-----------------------------------|----------------------------|
| `genre`      | Filter by genre name              | `genre=action`             |
| `keyword`    | Filter by keyword tag             | `keyword=heist`            |
| `language`   | ISO 639-1 language code           | `language=en`              |
| `movie_name` | Title substring (case-insensitive)| `movie_name=inception`     |

**Example requests:**
```bash
# Full catalog for a genre (use for seeding the space)
curl 'http://localhost:8080/api/movies?genre=action'

# Keyword filter
curl 'http://localhost:8080/api/movies?genre=action&keyword=heist&language=en'

# Title search
curl 'http://localhost:8080/api/movies?movie_name=inception'

# Language only
curl 'http://localhost:8080/api/movies?language=en'
```

**Response `200`:**
```json
{
  "count": 2,
  "movies": [
    {
      "movie_name": "Inception",
      "image_link": "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
      "vote_average": 8.364,
      "vote_count": 34495,
      "revenue": 825532764,
      "budget": 160000000,
      "popularity": 83.952,
      "genres": ["Action", "Science Fiction", "Adventure"],
      "language": "en",
      "imdb_rating": 0,
      "synopsis": "Cobb, a skilled thief...",
      "keywords": ["sci-fi", "dreams", "heist", "mind", "..."],
      "casts": null,
      "x": -1523730.2,
      "y": -7.81998e-17
    }
  ]
}
```

| Field         | Type      | Description                                   |
|---------------|-----------|-----------------------------------------------|
| `movie_name`  | string    | Title of the movie                            |
| `image_link`  | string    | Poster path (append to TMDB image base URL)   |
| `vote_average`| float     | TMDB average rating                           |
| `vote_count`  | int       | Number of votes                               |
| `revenue`     | int       | Box-office revenue (USD)                      |
| `budget`      | int       | Production budget (USD)                       |
| `popularity`  | float     | TMDB popularity score                         |
| `genres`      | []string  | Genre list                                    |
| `language`    | string    | ISO 639-1 language code                       |
| `imdb_rating` | float     | IMDb rating (0 if unavailable)                |
| `synopsis`    | string    | Short description                             |
| `keywords`    | []string  | Semantic keyword tags                         |
| `casts`       | []string  | Cast list (null if unavailable)               |
| `x`           | float     | Pre-computed 2D space x-coordinate            |
| `y`           | float     | Pre-computed 2D space y-coordinate            |
| `priority`    | float     | IMDb-weighted rating score, normalised 0–100  |
| `is_watched`  | bool      | `true` if the movie appears in the authenticated user's ACR watch history; always `false` when no valid JWT is sent |

> **`is_watched` enrichment:** send `Authorization: Bearer <JWT>` with any `/api/movies` request to get per-movie watch-history annotations. The endpoint remains public — omitting the token simply leaves every `is_watched` as `false`.

**Errors:** `502` if the upstream data service is unreachable.

**With JWT (is_watched enrichment):**
```bash
curl 'http://localhost:8080/api/movies?genre=action' \
  -H 'Authorization: Bearer $TOKEN'
```
Movies the user has previously watched will have `"is_watched": true`.

---

### `GET /api/similar`

Returns movies similar to a given title, with pre-computed **(x, y)** coordinates.
Proxies `tkacr-dev5.alphonso.tv:8080/api/similar`.

| Param   | Required | Description                              |
|---------|----------|------------------------------------------|
| `movie` | **Yes**  | Title to find similar movies for         |
| `k`     | No       | Max number of results (upstream default if omitted) |

**Example requests:**
```bash
# Find similar to Inception (default count)
curl 'http://localhost:8080/api/similar?movie=Inception'

# Cap to 10 results
curl 'http://localhost:8080/api/similar?movie=Inception&k=10'

# With JWT for is_watched annotations
curl 'http://localhost:8080/api/similar?movie=Inception&k=10' \
  -H 'Authorization: Bearer $TOKEN'
```

**Response `200`:** same structure as `/api/movies` — `count` + `movies[]` with all fields including `priority` and `is_watched`.

```json
{
  "count": 10,
  "movies": [
    {
      "movie_name": "Interstellar",
      "x": -1498200.4,
      "y": 12.3,
      "priority": 82.4,
      "is_watched": true
    }
  ]
}
```

**Errors:** `400` missing `movie` param · `502` upstream unreachable.

---

#### Phone Space-Seeding Flow

For each of the user's top genres call `GET /api/movies?genre=<genre>` and collect all responses.
Use the returned `x` and `y` fields to render the full spatial movie map:

```
top_genres = ["Sci-Fi", "Action", "Drama", ...]
for genre in top_genres:
    movies = GET /api/movies?genre=<genre>
    place each movie at (movie.x, movie.y) on the canvas
```

---

## 4. Top Genres

### `GET /top-genres`

Returns the authenticated user's top-9 genres with priority weights.  
Call this first to know which genres to fetch and in what order.

**Header:** `Authorization: Bearer <JWT>`

**Optional query param:**

| Param      | Type   | Description                                              |
|------------|--------|----------------------------------------------------------|
| `deviceId` | string | ACR device UUID — overrides the device_id on the account |

**Resolution order:**
1. `deviceId` query param provided → ACR watch-history lookup → weighted genres
2. No `deviceId` param → resolve `device_id` from the JWT user's record → ACR lookup
3. No `device_id` resolvable (or no ACR data found) → **fallback**: top-9 from `genreRankMatrix`, weights `1.0 → 0.2`

**Response `200` — ACR-derived (cases 1 & 2):**
```json
{
  "user_id": 2,
  "genres": [
    { "genre": "Action",    "rank": 1, "weight": 0.3521 },
    { "genre": "Adventure", "rank": 2, "weight": 0.2134 },
    { "genre": "Sci-Fi",    "rank": 3, "weight": 0.1847 },
    ...
  ]
}
```

**Response `200` — Fallback (case 3, no device_id / no ACR data):**
```json
{
  "user_id": 0,
  "genres": [
    { "genre": "Drama",       "rank": 1, "weight": 1.0 },
    { "genre": "Documentary", "rank": 2, "weight": 0.9 },
    { "genre": "Comedy",      "rank": 3, "weight": 0.8 },
    { "genre": "Animation",   "rank": 4, "weight": 0.7 },
    { "genre": "Romance",     "rank": 5, "weight": 0.6 },
    { "genre": "Action",      "rank": 6, "weight": 0.5 },
    { "genre": "Family",      "rank": 7, "weight": 0.4 },
    { "genre": "Sci-Fi",      "rank": 8, "weight": 0.3 },
    { "genre": "War",         "rank": 9, "weight": 0.2 }
  ]
}
```

> Fallback genres are ranked by TMDB content volume (rarest genres are boosted via `genreWeightMatrix`).

**Errors:** `401` missing / invalid token · `500` if `data-consts.json` cannot be read.

---

## 5. Filters

### `GET /api/filters`

Returns all available filter dimensions and their values. Use these to populate filter UI dropdowns.
No authentication required — values are static and sourced from `data-consts.json`.

**Response `200`:**
```json
{
  "filters": [
    {
      "id": "genre",
      "label": "Genre",
      "values": ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "..."]
    },
    {
      "id": "language",
      "label": "Language",
      "values": ["Arabic", "Bengali", "Chinese", "English", "French", "Hindi", "Japanese", "..."]
    },
    {
      "id": "cast",
      "label": "Cast",
      "values": ["Bruce Willis", "Matt Damon", "Tom Cruise", "Tom Hanks", "Brad Pitt", "..."]
    }
  ]
}
```

| Field    | Type     | Description                                      |
|----------|----------|--------------------------------------------------|
| `id`     | string   | Machine identifier for the filter (`genre`, `language`, `cast`) |
| `label`  | string   | Human-readable label for the filter              |
| `values` | []string | All available selectable values for this filter  |

**Errors:** `500` if `data-consts.json` cannot be read.

---

## 6. Movie Search (Meilisearch)

### `GET /search`

Typo-tolerant, ranked full-text search over all 1,907 movie titles.
Returns matching movies with their stitched **(x, y)** coordinates inside the user's genre space.

**Header:** `Authorization: Bearer <JWT>`

**Query params:**

| Param | Type   | Required | Description                          |
|-------|--------|----------|--------------------------------------|
| `q`   | string | **Yes**  | Search query (partial or full title) |

**Example requests:**
```bash
# Basic search
curl 'http://localhost:8080/search?q=inception' -H 'Authorization: Bearer $TOKEN'

# Typo-tolerant — still finds "Inception"
curl 'http://localhost:8080/search?q=inceptoin' -H 'Authorization: Bearer $TOKEN'

# Prefix match
curl 'http://localhost:8080/search?q=dark+knight' -H 'Authorization: Bearer $TOKEN'
```

**Response `200`:**
```json
{
  "count": 3,
  "results": [
    {
      "id": "inception",
      "title": "Inception",
      "genre": "Action",
      "rank": 2,
      "x": 300.0,
      "y": 0.0
    }
  ]
}
```

| Field   | Type   | Description                                          |
|---------|--------|------------------------------------------------------|
| `id`    | string | Unique content identifier                            |
| `title` | string | Movie title                                          |
| `genre` | string | Genre space the movie belongs to (user's top genre)  |
| `rank`  | int    | Rank of the genre in the user's top-genres list      |
| `x`     | float  | Stitched 2D x-coordinate in the user's genre space   |
| `y`     | float  | Stitched 2D y-coordinate in the user's genre space   |

> Results are capped at **50** Meilisearch hits. When a movie appears in multiple genre spaces the entry from the user's **highest-ranked** genre is returned.

**Powered by:** Meilisearch v1.45.2 — index is populated at server startup from `data-dirs/titles/titles.json` (1,907 documents, ~1–2 MB on disk).

**Errors:** `400` missing `q` · `401` missing / invalid token · `500` Meilisearch unavailable.

---

## Error Reference

| Status | Meaning                                      |
|--------|----------------------------------------------|
| 400    | Bad request — missing or invalid param       |
| 401    | Unauthorized — missing or expired JWT        |
| 404    | Resource not found (user, content)           |
| 500    | Internal server error                        |
| 502    | Upstream data service unreachable            |
rank 7 (−D, +D)  │  rank 4 ( 0, +D)  │  rank 6 (+D, +D)
─────────────────┼────────────────────┼─────────────────
rank 3 (−D,  0)  │  rank 1 ( 0,  0)  │  rank 2 (+D,  0)
─────────────────┼────────────────────┼─────────────────
rank 9 (−D, −D)  │  rank 5 ( 0, −D)  │  rank 8 (+D, −D)
```

`D = 300`. Rank 1 = user's top genre, centred at `(0, 0)`.
