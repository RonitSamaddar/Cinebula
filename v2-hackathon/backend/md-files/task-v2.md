# Cinebula Backend — Task v2: Movies Proxy Service

## New Endpoint

| Status | Method | Path         | Description                                              |
|--------|--------|--------------|----------------------------------------------------------|
| [x]    | GET    | /api/movies  | Proxy to TKACR external service; returns movies with 2D coords |

---

## Purpose

Adds a dedicated `/api/movies` endpoint that proxies requests from the phone to the
external TKACR movie catalog service at `tkacr-dev5.alphonso.tv:8080`.

The external service pre-computes **2D (x, y) coordinates** for every movie, so
the phone can directly use the `x` and `y` fields to render the spatial movie map.

---

## Module Layout

```
internal/movies/
├── consts.go    # TKACRBaseURL constant ("http://tkacr-dev5.alphonso.tv:8080")
├── model.go     # Movie + MoviesResponse structs matching external API response
├── client.go    # HTTP client (15 s timeout) that calls the upstream /api/movies
└── handler.go   # GET /api/movies handler — reads query params, calls Fetch, writes JSON
```

---

## Query Parameters (all optional)

| Param        | Description                           | Example            |
|--------------|---------------------------------------|--------------------|
| `genre`      | Filter by genre name                  | `genre=action`     |
| `keyword`    | Filter by keyword tag                 | `keyword=heist`    |
| `language`   | Filter by ISO 639-1 language code     | `language=en`      |
| `movie_name` | Filter by title substring             | `movie_name=inception` |

All params are forwarded verbatim to the upstream TKACR service.
Omitting all params returns the full catalog for the requested scope.

---

## Upstream API

```
GET http://tkacr-dev5.alphonso.tv:8080/api/movies?genre=action&keyword=heist&language=en
```

Response envelope:
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
      "synopsis": "...",
      "keywords": ["sci-fi", "dreams", "heist", ...],
      "casts": null,
      "x": -1523730.2,
      "y": -7.81998e-17
    }
  ]
}
```

---

## Phone Usage Flow

### 1. Seed the full space (top-genre-wise)

For each of the user's top genres, the phone calls:
```
GET /api/movies?genre=<genre>
```
Collect all responses → build the full spatial movie map using `x`, `y` coords.

### 2. Filtered queries

```bash
# By genre + keyword
curl 'http://localhost:8080/api/movies?genre=action&keyword=heist'

# By language only
curl 'http://localhost:8080/api/movies?language=en'

# By title substring
curl 'http://localhost:8080/api/movies?movie_name=inception'

# Combined
curl 'http://localhost:8080/api/movies?genre=action&keyword=heist&language=en'
```

---

## Error Responses

| HTTP Status | Condition                                     |
|-------------|-----------------------------------------------|
| 502         | Upstream TKACR service unreachable or error   |

---

## Constants

| Constant       | File                           | Value                                    |
|----------------|--------------------------------|------------------------------------------|
| `TKACRBaseURL` | `internal/movies/consts.go`    | `http://tkacr-dev5.alphonso.tv:8080`     |
