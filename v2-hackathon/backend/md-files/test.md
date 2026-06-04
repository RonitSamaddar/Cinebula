# Cinebula API — Test Commands

Run the server first (in a separate terminal):
```bash
./run.sh
```

All commands below assume the server is running at `http://localhost:8080`.
Run them **one by one**, in order. Step 1 captures `$TOKEN` and `$USER_ID` used by all later steps.

---

## Step 1 — Register a user and capture JWT

```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pratikesh",
    "age": 22,
    "gender": "male",
    "top_genres": ["Sci-Fi","Action","Drama","Thriller","Comedy","Horror","Crime","Mystery","Adventure"]
  }' | tee /tmp/login.json
```

Expected:
```json
{ "user_id": 3, "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

```bash
export TOKEN=$(python3 -c "import sys,json; print(json.load(open('/tmp/login.json'))['token'])")
export USER_ID=$(python3 -c "import sys,json; print(json.load(open('/tmp/login.json'))['user_id'])")
echo "USER_ID=$USER_ID  TOKEN=$TOKEN"
```

---

## Step 2 — GET /user/profile (JWT protected)

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/user/profile | python3 -m json.tool
```

Expected: full user object with `user_id`, `name`, `age`, `gender`, `top_genres`, `created_at`.

---

## Step 3 — GET /top-genres

```bash
curl -s "http://localhost:8080/top-genres?userId=$USER_ID" | python3 -m json.tool
```

Expected:
```json
{
  "user_id": 3,
  "genres": [
    { "genre": "Sci-Fi",   "rank": 1, "weight": 1.0   },
    { "genre": "Action",   "rank": 2, "weight": 0.889 },
    ...
    { "genre": "Adventure","rank": 9, "weight": 0.111 }
  ]
}
```

---

## Step 4 — GET /api/movies (top genre, check priority field)

```bash
curl -s "http://localhost:8080/api/movies?genre=Sci-Fi" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Count: {d[\"count\"]}')
for m in sorted(d['movies'], key=lambda x: -x['priority'])[:5]:
    print(f'  [{m[\"priority\"]:6.2f}]  {m[\"movie_name\"]}  ({m[\"vote_average\"]}/10, {m[\"vote_count\"]} votes)')
"
```

Expected: movies sorted by priority descending; classics with many votes score highest.

---

## Step 5 — GET /api/movies (genre + keyword filter)

```bash
curl -s "http://localhost:8080/api/movies?genre=action&keyword=heist&language=en" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Count: {d[\"count\"]}')
for m in d['movies']:
    print(f'  [{m[\"priority\"]:6.2f}]  {m[\"movie_name\"]}  keywords={m[\"keywords\"][:3]}')
"
```

Expected: only movies with 'heist' in keywords, each with a `priority` field.

---

## Step 6 — GET /api/movies (title search)

```bash
curl -s "http://localhost:8080/api/movies?movie_name=inception" | python3 -m json.tool
```

Expected: Inception in results with `priority` > 80 (high vote count + high rating).

---

## Step 7 — GET /api/movies (language only)

```bash
curl -s "http://localhost:8080/api/movies?language=en" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Total English movies: {d[\"count\"]}')
"
```

---

## Failure Cases

### Step 8 — POST /auth/login: invalid genre (400)

```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"name":"Bad","age":25,"gender":"male","top_genres":["FakeGenre"]}'
```

Expected: `400 unknown genre: FakeGenre`

### Step 9 — GET /user/profile without token (401)

```bash
curl -s http://localhost:8080/user/profile
```

Expected: `401 Unauthorized`

### Step 10 — GET /top-genres with invalid userId (400)

```bash
curl -s "http://localhost:8080/top-genres?userId=abc"
```

Expected: `400 invalid userId`

```bash
curl -s "http://localhost:8080/top-spaces?userId=$USER_ID" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Total entries: {len(d)}')
for e in d:
    print(f'  {e[\"id\"]}  {e[\"title\"]}  ({e[\"x\"]:.1f}, {e[\"y\"]:.1f})  [{e[\"genre\"]}  rank {e[\"rank\"]}]')
"
```

Expected: all entries across all 9 genre spaces with stitched coordinates.

---

### Step 4 — GET /space/tile (centre viewport, 300×300)

```bash
curl -s "http://localhost:8080/space/tile?userId=$USER_ID&cx=0&cy=0&l=300&b=300" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Tile entries: {len(d)}')
for e in d:
    print(f'  {e[\"id\"]}  {e[\"title\"]}  ({e[\"x\"]:.1f}, {e[\"y\"]:.1f})  [{e[\"genre\"]}]')
"
```

Expected: all entries whose stitched (x,y) fall within [-150, +150] x [-150, +150].

---

### Step 5 — GET /space/tile (swipe right — move viewport to rank-2 quadrant)

```bash
curl -s "http://localhost:8080/space/tile?userId=$USER_ID&cx=300&cy=0&l=300&b=300" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Right-tile entries: {len(d)}')
for e in d:
    print(f'  {e[\"id\"]}  {e[\"title\"]}  ({e[\"x\"]:.1f}, {e[\"y\"]:.1f})  [{e[\"genre\"]}]')
"
```

Expected: all entries from the Action (rank-2) quadrant, x in [+150, +450].

---

### Step 6 — GET /space/tile (circular wrap — swipe left past rank-3 edge)

```bash
curl -s "http://localhost:8080/space/tile?userId=$USER_ID&cx=-600&cy=0&l=300&b=300" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Wrapped-tile entries: {len(d)}')
for e in d:
    print(f'  {e[\"id\"]}  {e[\"title\"]}  ({e[\"x\"]:.1f}, {e[\"y\"]:.1f})  [{e[\"genre\"]}]')
"
```

Expected: all entries from the right-side quadrant (wraps around), same as the rank-2 quadrant.

---

### Step 7 — GET /search (title contains "the")

```bash
curl -s "http://localhost:8080/search?q=the&userId=$USER_ID" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Search results for the: {len(d)} hits')
for e in d:
    print(f'  {e[\"id\"]}  {e[\"title\"]}  ({e[\"x\"]:.1f}, {e[\"y\"]:.1f})  [{e[\"genre\"]}  rank {e[\"rank\"]}]')
"
```

Expected: all deduplicated results (one per unique movie title containing "the").

---

### Step 8 — GET /search (deduplication: "ince" returns Inception once)

```bash
curl -s "http://localhost:8080/search?q=ince&userId=$USER_ID" | python3 -m json.tool
```

Expected: one result for Inception at its top-genre coordinate (lowest rank for this user),
even though Inception appears in multiple genre spaces.
```json
[
  {
    "id": "ALP-MOVIE-100",
    "title": "Inception",
    "x": 117.43,
    "y": 33.80,
    "genre": "Sci-Fi",
    "rank": 1
  }
]
```

---

### Step 9 — User clicks Inception -> navigate viewport to its coordinate

The frontend takes x and y from the search result and calls /space/tile centred there.

```bash
export NAV_X=117.43
export NAV_Y=33.80

curl -s "http://localhost:8080/space/tile?userId=$USER_ID&cx=$NAV_X&cy=$NAV_Y&l=300&b=300" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Tiles at Inception location: {len(d)} entries')
for e in d:
    print(f'  {e[\"id\"]}  {e[\"title\"]}  ({e[\"x\"]:.2f}, {e[\"y\"]:.2f})  [{e[\"genre\"]}]')
"
```

Expected: all entries in the tile, Inception visible near the centre of the viewport.

---

## Failure API Calls

### Step 10 — POST /auth/login: wrong genre name (400)

```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bad",
    "age": 20,
    "gender": "other",
    "top_genres": ["Sci-Fi","UnknownGenre"]
  }'
```

Expected: `unknown genre: UnknownGenre` with HTTP 400.

---

### Step 11 — POST /auth/login: too few genres (400)

```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bad",
    "age": 20,
    "gender": "other",
    "top_genres": ["Sci-Fi","Action"]
  }'
```

Expected: `top_genres must contain 3-10 genres` with HTTP 400.

---

### Step 12 — GET /user/profile without token (401)

```bash
curl -s http://localhost:8080/user/profile
```

Expected: `missing or invalid Authorization header` with HTTP 401.

---

### Step 13 — GET /search without userId (400)

```bash
curl -s "http://localhost:8080/search?q=inception"
```

Expected: `invalid userId` with HTTP 400.

---

### Step 14 — GET /search: no results (empty array)

```bash
curl -s "http://localhost:8080/search?q=xyznotamovie&userId=$USER_ID" | python3 -m json.tool
```

Expected: `[]`

---

### Step 15 — GET /top-spaces for non-existent user (404)

```bash
curl -s "http://localhost:8080/top-spaces?userId=9999"
```

Expected: `user 9999 not found` with HTTP 404.
