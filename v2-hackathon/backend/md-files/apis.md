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

**Errors:** `502` if the upstream data service is unreachable.

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

Returns the user's top-9 genres with priority weights.
Call this first to know which genres to fetch and in what order.

**Query params (all optional):**

| Param      | Type   | Description                                              |
|------------|--------|----------------------------------------------------------|
| `userId`   | int    | User ID from login — looks up device_id from users.csv   |
| `deviceId` | string | ACR device UUID — takes priority over userId             |

**Resolution order:**
1. `deviceId` provided → ACR watch-history lookup → weighted genres
2. `userId` provided → resolve `device_id` from user record → ACR lookup
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

**Errors:** `500` if `data-consts.json` cannot be read.

---

## 5. Movie Search (Meilisearch)

### `GET /search`

Typo-tolerant, ranked full-text search over all 1,907 movie titles.
Returns matching movies with their stitched **(x, y)** coordinates inside the user's genre space.

**Query params:**

| Param    | Type   | Required | Description                                |
|----------|--------|----------|-----------------------------------------|
| `q`      | string | **Yes**  | Search query (partial or full title)    |
| `userId` | int    | **Yes**  | User ID — used to resolve genre space   |

**Example requests:**
```bash
# Basic search
curl 'http://localhost:8080/search?q=inception&userId=2'

# Typo-tolerant — still finds "Inception"
curl 'http://localhost:8080/search?q=inceptoin&userId=2'

# Prefix match
curl 'http://localhost:8080/search?q=dark+knight&userId=2'
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

**Errors:** `400` missing `q` or invalid `userId` · `404` user not found · `500` Meilisearch unavailable.

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
