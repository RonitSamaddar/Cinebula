# Cinebula — Phone API Reference

**Base URL:** `http://localhost:8080`

All endpoints return `Content-Type: application/json`.

---

## 1. Register & Get Token

### `POST /auth/login`

Register a new user and receive a JWT for protected endpoints.

**Request body:**
```json
{
  "name": "Pratikesh",
  "age": 22,
  "gender": "male",
  "top_genres": ["Sci-Fi", "Action", "Drama", "Thriller", "Comedy", "Horror", "Crime", "Mystery", "Adventure"]
}
```

| Field        | Type     | Rules                                 |
|--------------|----------|---------------------------------------|
| `name`       | string   | Non-empty                             |
| `age`        | int      | 1 – 120                               |
| `gender`     | string   | Non-empty                             |
| `top_genres` | []string | 3 – 9 valid genre names               |

**Response `200`:**
```json
{ "user_id": 3, "token": "<JWT>" }
```

**Errors:** `400` bad input.

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

### `GET /top-genres?userId=<id>`

Returns the user's top-9 genres with priority weights.
Call this first to know which genres to fetch and in what order.

**Query params:**

| Param    | Type | Required | Description        |
|----------|------|----------|--------------------||
| `userId` | int  | Yes      | User ID from login |

**Response `200`:**
```json
{
  "user_id": 3,
  "genres": [
    { "genre": "Sci-Fi",    "rank": 1, "weight": 1.0   },
    { "genre": "Action",    "rank": 2, "weight": 0.889 },
    { "genre": "Drama",     "rank": 3, "weight": 0.778 },
    { "genre": "Thriller",  "rank": 4, "weight": 0.667 },
    { "genre": "Comedy",    "rank": 5, "weight": 0.556 },
    { "genre": "Horror",    "rank": 6, "weight": 0.444 },
    { "genre": "Crime",     "rank": 7, "weight": 0.333 },
    { "genre": "Mystery",   "rank": 8, "weight": 0.222 },
    { "genre": "Adventure", "rank": 9, "weight": 0.111 }
  ]
}
```

**Errors:** `400` invalid userId, `404` user not found.

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
