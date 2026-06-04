# Cinebula — API Schema

**Base URL:** `http://localhost:8080`

---

## POST /auth/login

```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "name":       string,
    "age":        number,
    "gender":     string,
    "top_genres": [string]
  }'
```

**Request body**

| Field        | Type     | Rules                        |
|--------------|----------|------------------------------|
| `name`       | string   | non-empty                    |
| `age`        | number   | 1 – 120                      |
| `gender`     | string   | non-empty                    |
| `top_genres` | [string] | 3 – 9 valid genre names      |

**Response 200**

```json
{
  "user_id": number,
  "token":   string
}
```

| Field     | Type   | Description                                          |
|-----------|--------|------------------------------------------------------|
| `user_id` | number | Auto-assigned unique user ID                         |
| `token`   | string | JWT — pass as `Authorization: Bearer <token>` header |

---

## GET /user/profile

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

---

## GET /top-genres

```bash
curl -s "http://localhost:8080/top-genres?userId=<number>"
```

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

| Field             | Type     | Description                                         |
|-------------------|----------|-----------------------------------------------------|
| `user_id`         | number   | User ID                                             |
| `genres`          | [object] | Ordered list, rank 1 = top genre                    |
| `genres[].genre`  | string   | Genre name                                          |
| `genres[].rank`   | number   | Preference rank (1 = highest, max 9)                |
| `genres[].weight` | number   | Priority weight — rank 1 = `1.0`, rank N = `1/N`   |

---

## GET /api/movies

```bash
curl -s "http://localhost:8080/api/movies?genre=string&keyword=string&language=string&movie_name=string"
```

All query params are optional.

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
      "priority":     number
    }
  ]
}
```

| Field          | Type          | Description                                            |
|----------------|---------------|--------------------------------------------------------|
| `count`        | number        | Number of movies in response                           |
| `movie_name`   | string        | Title                                                  |
| `image_link`   | string        | TMDB poster path — prepend `https://image.tmdb.org/t/p/w500` |
| `vote_average` | number        | TMDB rating (0 – 10)                                   |
| `vote_count`   | number        | Number of TMDB votes                                   |
| `revenue`      | number        | Box-office revenue in USD                              |
| `budget`       | number        | Production budget in USD                               |
| `popularity`   | number        | TMDB popularity score                                  |
| `genres`       | [string]      | Genre list                                             |
| `language`     | string        | ISO 639-1 language code                                |
| `imdb_rating`  | number        | IMDb rating; `0` when unavailable                      |
| `synopsis`     | string        | Short plot description                                 |
| `keywords`     | [string]      | Semantic keyword tags                                  |
| `casts`        | [string]\|null | Cast names; `null` when unavailable                   |
| `x`            | number        | Pre-computed 2D space x-coordinate                     |
| `y`            | number        | Pre-computed 2D space y-coordinate                     |
| `priority`     | number        | IMDb weighted rating normalised to **0–100**. Computed by the priority module from the catalog returned in this response. Higher = more trusted/popular. |

---

## Error Responses

All errors return plain text.

| Status | Meaning                              |
|--------|--------------------------------------|
| 400    | Bad request — missing/invalid param  |
| 401    | Unauthorized — missing/expired JWT   |
| 404    | User not found                       |
| 500    | Internal server error                |
| 502    | Upstream data service unreachable    |
