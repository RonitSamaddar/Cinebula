# Cinebula — API Schema

**Base URL:** `http://localhost:8080`

All responses are `Content-Type: application/json`.  
Protected endpoints require `Authorization: Bearer <token>` header.

---

## POST /auth/login

All fields are **optional**. Providing `device_id` links the account to ACR watch-history data.

**Request**

```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "name":       string,
    "age":        number,
    "gender":     string,
    "top_genres": [string],
    "device_id":  string
  }'
```

| Field        | Type     | Required | Rules                                         |
|--------------|----------|----------|-----------------------------------------------|
| `name`       | string   | No       | Defaults to `guest-<id>` if omitted           |
| `age`        | number   | No       | 1 – 120                                       |
| `gender`     | string   | No       |                                               |
| `top_genres` | [string] | No       | If provided: valid genre names                |
| `device_id`  | string   | No       | Links account to ACR data for personalisation |

**Response 200**

```json
{
  "user_id":   number,
  "token":     string,
  "device_id": string
}
```

| Field       | Type   | Description                                             |
|-------------|--------|---------------------------------------------------------|
| `user_id`   | number | Auto-assigned unique user ID                            |
| `token`     | string | JWT — pass as `Authorization: Bearer <token>` header    |
| `device_id` | string | Echoed back only when provided in the request           |

**Errors:** `400` unknown genre name.

---

## GET /user/profile

**Auth:** JWT required

```bash
curl -s http://localhost:8080/user/profile \
  -H "Authorization: Bearer <token>"
```

**Response 200**

```json
{
  "user_id":    number,
  "name":       string,
  "age":        number,
  "gender":     string,
  "top_genres": [string],
  "created_at": string
}
```

| Field        | Type     | Description                              |
|--------------|----------|------------------------------------------|
| `user_id`    | number   | Unique user ID                           |
| `name`       | string   | Display name                             |
| `age`        | number   | Age                                      |
| `gender`     | string   | Gender                                   |
| `top_genres` | [string] | Ordered genre preferences (rank 1 first) |
| `created_at` | string   | ISO 8601 timestamp                       |

**Errors:** `401` missing / invalid token.

---

## GET /top-genres

**Auth:** JWT required

```bash
curl -s "http://localhost:8080/top-genres" \
  -H "Authorization: Bearer <token>"
```

**Query params (all optional)**

| Param      | Type   | Description                                               |
|------------|--------|-----------------------------------------------------------|
| `deviceId` | string | ACR device UUID — overrides the device_id on the account  |

**Resolution order:**
1. `deviceId` query param → ACR watch-history lookup → weighted genres
2. JWT user's `device_id` → ACR lookup
3. No ACR data resolvable → fallback from `genreRankMatrix` (weights 1.0 → 0.2)

**Response 200**

```json
{
  "user_id": number,
  "genres": [
    {
      "genre":  string,
      "rank":   number,
      "weight": number
    }
  ]
}
```

| Field             | Type     | Description                                       |
|-------------------|----------|---------------------------------------------------|
| `user_id`         | number   | User ID                                           |
| `genres`          | [object] | Ordered list, rank 1 = top genre, max 9 entries   |
| `genres[].genre`  | string   | Genre name                                        |
| `genres[].rank`   | number   | Preference rank (1 = highest)                     |
| `genres[].weight` | number   | Normalised watch-time weight (0, 1]; fallback uses fixed steps |

**Errors:** `401` missing / invalid token · `500` data-consts unreadable.

---

## GET /api/movies

**Auth:** Optional (JWT enables `is_watched` enrichment)

All query params are optional. Combine freely.

```bash
curl -s "http://localhost:8080/api/movies?genre=string&keyword=string&language=string&movie_name=string"
```

| Param        | Type   | Description                        |
|--------------|--------|------------------------------------|
| `genre`      | string | Genre name e.g. `action`           |
| `keyword`    | string | Keyword tag e.g. `heist`           |
| `language`   | string | ISO 639-1 code e.g. `en`           |
| `movie_name` | string | Title substring e.g. `inception`   |

**Response 200**

```json
{
  "count": number,
  "movies": [
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
      "priority":     number,
      "is_watched":   boolean
    }
  ]
}
```

| Field          | Type           | Description                                                                                        |
|----------------|----------------|----------------------------------------------------------------------------------------------------|
| `count`        | number         | Number of movies in response                                                                       |
| `movie_name`   | string         | Title                                                                                              |
| `image_link`   | string         | TMDB poster path — prepend `https://image.tmdb.org/t/p/w500`                                      |
| `vote_average` | number         | TMDB rating (0 – 10)                                                                               |
| `vote_count`   | number         | Number of TMDB votes                                                                               |
| `revenue`      | number         | Box-office revenue in USD                                                                          |
| `budget`       | number         | Production budget in USD                                                                           |
| `popularity`   | number         | TMDB popularity score                                                                              |
| `genres`       | [string]       | Genre list                                                                                         |
| `language`     | string         | ISO 639-1 language code                                                                            |
| `imdb_rating`  | number         | IMDb rating; `0` when unavailable                                                                  |
| `synopsis`     | string         | Short plot description                                                                             |
| `keywords`     | [string]       | Semantic keyword tags                                                                              |
| `casts`        | [string]\|null | Cast names; `null` when unavailable                                                                |
| `x`            | number         | Pre-computed 2D space x-coordinate                                                                 |
| `y`            | number         | Pre-computed 2D space y-coordinate                                                                 |
| `priority`     | number         | IMDb weighted rating normalised to **0 – 100**                                                     |
| `is_watched`   | boolean        | `true` if the movie is in the JWT user's ACR watch history; always `false` when no JWT is provided |

**Errors:** `502` upstream unreachable.

---

## GET /api/similar

**Auth:** Optional (JWT enables `is_watched` enrichment)

Returns movies similar to a given title. Proxies `tkacr-dev5.alphonso.tv:8080/api/similar`.

```bash
curl -s "http://localhost:8080/api/similar?movie=string&k=number"
```

| Param   | Type   | Required | Description                                         |
|---------|--------|----------|-----------------------------------------------------|
| `movie` | string | **Yes**  | Title to find similar movies for                    |
| `k`     | number | No       | Max number of results (upstream default if omitted) |

**Response 200:** identical shape to `GET /api/movies` — `count` + `movies[]` with all the same fields (`priority`, `is_watched` included).

```json
{
  "count": number,
  "movies": [ { /* same Movie object as /api/movies */ } ]
}
```

**Errors:** `400` missing `movie` · `502` upstream unreachable.

---

## GET /api/filters

**Auth:** None required

Returns all available filter dimensions for populating UI dropdowns.

```bash
curl -s "http://localhost:8080/api/filters"
```

**Response 200**

```json
{
  "filters": [
    {
      "id":     string,
      "label":  string,
      "values": [string]
    }
  ]
}
```

| Field      | Type     | Description                                                     |
|------------|----------|-----------------------------------------------------------------|
| `id`       | string   | Machine identifier: `"genre"`, `"language"`, or `"cast"`        |
| `label`    | string   | Human-readable label                                            |
| `values`   | [string] | All selectable values for this filter dimension                 |

Available filter IDs and typical value counts:

| `id`       | Values | Example values                        |
|------------|--------|---------------------------------------|
| `genre`    | 19     | `"Action"`, `"Drama"`, `"Sci-Fi"` …   |
| `language` | 35     | `"English"`, `"Hindi"`, `"French"` …  |
| `cast`     | 30     | `"Tom Hanks"`, `"Leonardo DiCaprio"` … |

**Errors:** `500` data-consts unreadable.

---

## GET /search

**Auth:** JWT required

Typo-tolerant full-text search over movie titles via Meilisearch. Returns movie names ranked by relevance.

```bash
curl -s "http://localhost:8080/search?q=string" \
  -H "Authorization: Bearer <token>"
```

| Param | Type   | Required | Description                          |
|-------|--------|----------|--------------------------------------|
| `q`   | string | **Yes**  | Search query (partial or full title) |

**Response 200**

```json
["Inception", "Inception 2", "..."]
```

Returns a JSON array of matching movie name strings, ranked by Meilisearch relevance. Capped at **50** results.

**Errors:** `400` missing `q` · `401` missing / invalid token · `500` Meilisearch unavailable.

---

## Error Responses

All errors return plain text bodies.

| Status | Meaning                              |
|--------|--------------------------------------|
| 400    | Bad request — missing / invalid param |
| 401    | Unauthorized — missing / expired JWT  |
| 404    | User not found                        |
| 500    | Internal server error                 |
| 502    | Upstream data service unreachable     |
