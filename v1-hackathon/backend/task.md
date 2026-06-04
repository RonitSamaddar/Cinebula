# Cinebula Backend — Implementation Tasks

## Endpoints to Build

| Status | Method | Path             | Description                                    |
|--------|--------|------------------|------------------------------------------------|
| [x]    | POST   | /auth/login      | Register user (name/age/gender/top_genres) → JWT |
| [x]    | GET    | /space/tile      | Viewport tile from stitched 9-quadrant space   |
| [x]    | GET    | /top-spaces      | Full stitched space for user's top-9 genres    |
| [x]    | GET    | /search          | Search titles in user's 9 stitched spaces      |
| [x]    | GET    | /user/profile    | Return user profile (JWT protected)            |

---

## 9-Quadrant Stitched Space Design

D = 300 (quadrantWidth). Each genre's per-genre coords are in [-150, +150].
Total space: 900×900, centred at (0,0), spanning [-450, +450) in both axes.

### Grid layout (rank → stitched offset)

```
rank 7 (-D,+D)  rank 4 (0,+D)   rank 6 (+D,+D)
rank 3 (-D, 0)  rank 1 (0, 0)   rank 2 (+D, 0)
rank 9 (-D,-D)  rank 5 (0,-D)   rank 8 (+D,-D)
```

Stitched coordinate = per-genre (x, y) + offset for that rank.

### Circular topology

The space wraps: moving right past the +D column connects to the -D column,
and vice versa. Same for up/down. Implemented by checking 9 offset positions
(±900 in each axis) when filtering viewport.

---

## Storage

### databases/users.csv
```
user_id, name, age, gender, top_genres, created_at
```
`top_genres` stored as JSON array string: `["Sci-Fi","Action","Thriller"]`

---

## Data Sources

| Module        | Source                                        |
|---------------|-----------------------------------------------|
| auth / user   | `databases/users.csv`                         |
| space-stitcher| `data-dirs/2D-space/genres/{genre}.json`      |
| search        | same as space-stitcher (stitched space query) |

---

## API Contracts

### POST /auth/login
Request:
```json
{ "name": "Alice", "age": 25, "gender": "female", "top_genres": ["Sci-Fi","Action","Thriller"] }
```
Validation: name non-empty, age 1–120, gender non-empty, 3–10 valid genres.
Response:
```json
{ "user_id": 1, "token": "<JWT>" }
```

### GET /top-spaces?userId=1
Response:
```json
[{ "id": "ALP-MOVIE-100", "title": "Inception", "x": -208.17, "y": -142.5, "genre": "Action", "rank": 1 }]
```
Returns all entries across user's top-9 stitched genre spaces.

### GET /space/tile?userId=1&cx=0&cy=0&l=300&b=300
Returns entries where stitched (x,y) falls within [cx±l/2, cy±b/2].
Circular wrapping applied. Response: same shape as top-spaces.

### GET /search?q=inception&userId=1
Case-insensitive title match within user's 9 stitched spaces.
Response: same shape as top-spaces.

### GET /user/profile  (Authorization: Bearer <JWT>)
Response:
```json
{ "user_id": 1, "name": "Alice", "age": 25, "gender": "female", "top_genres": [...], "created_at": "..." }
```
