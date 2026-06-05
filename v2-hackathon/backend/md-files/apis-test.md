# Cinebula — API Test Commands (Positive Cases)

Run the server first:
```bash
cd Cinebula/v2-hackathon/backend && ./run.sh
```

All commands assume `http://localhost:8080`.
Run **in order** — Step 1 captures `$TOKEN` and `$USER_ID` used by later steps.

---

## Step 1 — POST /auth/login

### Case A — Anonymous (no fields)
```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool
```

Expected `200`: `user_id` assigned, `name` stored as `guest-<id>`, no `device_id` in response.
```json
{ "user_id": <number>, "token": "<JWT>" }
```

### Case B — Device ID only (links to ACR data)
```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"device_id": "46426f9c-ssss-4593-9399-21798b0d1148"}' \
  | tee /tmp/login.json | python3 -m json.tool
```

Expected `200`: returns existing `user_id: 1` (matched via device_id), echoes `device_id`.
```json
{ "user_id": 1, "token": "<JWT>", "device_id": "46426f9c-ssss-4593-9399-21798b0d1148" }
```

### Case C — Full request
```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pratikesh",
    "age": 22,
    "gender": "male",
    "top_genres": ["Sci-Fi","Action","Drama","Thriller","Comedy","Horror","Crime","Mystery","Adventure"],
    "device_id": "5336afe5-ssss-4677-9b27-61253b9f6fc3"
  }' | tee /tmp/login.json | python3 -m json.tool
```

Expected `200`: returns existing `user_id: 2` (matched via device_id or name).
```json
{ "user_id": 2, "token": "<JWT>", "device_id": "5336afe5-ssss-4677-9b27-61253b9f6fc3" }
```

Save for later steps:
```bash
export TOKEN=$(python3 -c "import json; print(json.load(open('/tmp/login.json'))['token'])")
export USER_ID=$(python3 -c "import json; print(json.load(open('/tmp/login.json'))['user_id'])")
echo "USER_ID=$USER_ID  TOKEN=$TOKEN"
```

---

## Step 2 — GET /user/profile

```bash
curl -s http://localhost:8080/user/profile \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected `200`:
```json
{
  "user_id": <number>,
  "name": "Pratikesh",
  "age": 22,
  "gender": "male",
  "top_genres": ["Sci-Fi","Action","Drama","Thriller","Comedy","Horror","Crime","Mystery","Adventure"],
  "created_at": "<ISO 8601 timestamp>"
}
```

Verify: `user_id` matches `$USER_ID`, all fields present.

---

## Step 3 — GET /top-genres

### Case 1 — By JWT token (resolves device_id → ACR data)

```bash
curl -s "http://localhost:8080/top-genres" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected `200`: ACR-derived weights, `genres` non-empty, `weight` values in (0, 1] descending.

```bash
# Check all 4 ACR users (login each to capture token, then call /top-genres)
for id in 1 2 3 4; do
  TOKEN_I=$(curl -s -X POST http://localhost:8080/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"user_id\": $id}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
  echo -n "userId=$id → "
  curl -s "http://localhost:8080/top-genres" \
    -H "Authorization: Bearer $TOKEN_I" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"genres\"])} genres, top: {d[\"genres\"][0][\"genre\"]} ({d[\"genres\"][0][\"weight\"]})')"
done
```

### Case 2 — By deviceId directly (optional override)

```bash
curl -s "http://localhost:8080/top-genres?deviceId=46426f9c-ssss-4593-9399-21798b0d1148" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected `200`: same ACR-derived result as `userId=1`.

### Case 3 — No ACR data (fallback to genreRankMatrix)

```bash
curl -s "http://localhost:8080/top-genres" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected `200`: fixed fallback weights `1.0 → 0.2`, top genre is `Drama`.
```json
{
  "user_id": 0,
  "genres": [
    { "genre": "Drama",       "rank": 1, "weight": 1  },
    { "genre": "Documentary", "rank": 2, "weight": 0.9 },
    { "genre": "Comedy",      "rank": 3, "weight": 0.8 },
    ...
  ]
}
```

### Case 3b — User with no ACR data (fallback)

Login as a user with no device_id (e.g. anonymous guest), then call:
```bash
curl -s "http://localhost:8080/top-genres" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected `200`: same fixed fallback (user has no device_id).

---

## Step 4 — GET /search (Meilisearch)

### Case 1 — Exact title match

```bash
curl -s "http://localhost:8080/search?q=inception" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected `200`: `count` ≥ 1, "Inception" in results with valid `x`/`y` coordinates.

### Case 2 — Typo-tolerant search

```bash
curl -s "http://localhost:8080/search?q=inceptoin" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected `200`: Meilisearch corrects the typo and still returns "Inception".

### Case 3 — Prefix / partial match

```bash
curl -s "http://localhost:8080/search?q=dark+knight" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected `200`: "The Dark Knight" and variants in results.

### Case 4 — Fuzzy multi-word

```bash
curl -s "http://localhost:8080/search?q=star+wars" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'count: {d[\"count\"]}')
for r in d['results']:
    print(f'  {r[\"title\"]:40s}  genre={r[\"genre\"]:<12s}  rank={r[\"rank\"]}  ({r[\"x\"]:.1f}, {r[\"y\"]:.1f})')
"
```

Expected `200`: Star Wars films returned with coordinates inside user 2's genre space.

### Case 5 — Missing `q` param (400)

```bash
curl -s "http://localhost:8080/search" \
  -H "Authorization: Bearer $TOKEN"
```

Expected `400`: `q is required`

### Case 6 — Missing token (401)

```bash
curl -s "http://localhost:8080/search?q=inception"
```

Expected `401`: `missing or invalid Authorization header`

### Case 7 — Invalid token (401)

```bash
curl -s "http://localhost:8080/search?q=inception" \
  -H "Authorization: Bearer invalid.token.here"
```

Expected `401`: `invalid token`

---

## Step 5 — GET /api/filters

```bash
curl -s "http://localhost:8080/api/filters" | python3 -m json.tool
```

Expected `200`: three filter objects with ids `genre`, `language`, `cast`.

```bash
# Spot-check: print filter ids and value counts
curl -s "http://localhost:8080/api/filters" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for f in d['filters']:
    print(f'  {f[\"id\"]:10s}  {len(f[\"values\"]):3d} values   first: {f[\"values\"][0]}')
"
```

Expected output:
```
  genre       19 values   first: Action
  language    35 values   first: Arabic
  cast        30 values   first: Bruce Willis
```

---

## Step 6 — GET /api/movies (by genre)

```bash
curl -s "http://localhost:8080/api/movies?genre=action" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'count: {d[\"count\"]}')
for m in d['movies'][:3]:
    print(f'  [{m[\"priority\"]:6.2f}]  {m[\"movie_name\"]}  ({m[\"vote_average\"]}/10)  x={m[\"x\"]:.1f} y={m[\"y\"]:.1f}  watched={m[\"is_watched\"]}')
"
```

Expected `200`: `count` > 0, each movie has `priority` and `is_watched` (defaults `false` without token).

### With JWT (is_watched enrichment)

```bash
curl -s "http://localhost:8080/api/movies?genre=action" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
watched = [m for m in d['movies'] if m['is_watched']]
print(f'count: {d["count"]}, watched by user: {len(watched)}')
for m in watched[:5]:
    print(f'  [WATCHED]  {m["movie_name"]}')
"
```

Expected: movies from the user's ACR history show `"is_watched": true`.

---

## Step 7 — GET /api/movies (genre + keyword + language)

```bash
curl -s "http://localhost:8080/api/movies?genre=action&keyword=heist&language=en" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'count: {d[\"count\"]}')
for m in d['movies']:
    print(f'  [{m[\"priority\"]:6.2f}]  {m[\"movie_name\"]}  keywords sample: {m[\"keywords\"][:3]}')
"
```

Expected `200`: all returned movies contain `heist` in their `keywords`.

---

## Step 8 — GET /api/movies (title search)

```bash
curl -s "http://localhost:8080/api/movies?movie_name=inception" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'count: {d[\"count\"]}')
for m in d['movies']:
    print(f'  [{m[\"priority\"]:6.2f}]  {m[\"movie_name\"]}')
"
```

Expected `200`: Inception in results with a high `priority` score (high vote count + rating).

---

## Step 9 — GET /api/movies (language only)

```bash
curl -s "http://localhost:8080/api/movies?language=en" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Total English movies: {d[\"count\"]}')
langs = {m['language'] for m in d['movies']}
print(f'Languages in response: {langs}')
"
```

Expected `200`: all movies have `"language": "en"`.

---

## Step 10 — Full seeding flow (top-genres → api/movies per genre)

Simulates what the phone does on first launch for user 2 (Pratikesh).

```bash
# Get top genres
GENRES=$(curl -s "http://localhost:8080/top-genres" \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(' '.join(g['genre'] for g in d['genres']))")
echo "Top genres: $GENRES"

# Fetch movies for each genre and print count + top priority movie
for GENRE in $GENRES; do
  RESULT=$(curl -s "http://localhost:8080/api/movies?genre=$GENRE")
  python3 -c "
import sys, json
d = json.loads('$RESULT'.replace(\"'\", ''))
top = max(d['movies'], key=lambda m: m['priority'], default=None) if d['movies'] else None
print(f'  $GENRE: {d[\"count\"]} movies' + (f', top: {top[\"movie_name\"]} [{top[\"priority\"]:.1f}]' if top else ''))
"
done
```

Expected: each genre returns movies with `count` > 0 and `priority` populated.

---

## Step 11 — GET /api/similar

### Case 1 — Basic (no token)

```bash
curl -s "http://localhost:8080/api/similar?movie=Inception&k=5" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'count: {d["count"]}')
for m in d['movies']:
    print(f'  [{m["priority"]:6.2f}]  {m["movie_name"]}  ({m["vote_average"]}/10)  watched={m["is_watched"]}')
"
```

Expected `200`: `count` ≤ 5, all movies related to Inception, `is_watched` is `false` for all.

### Case 2 — With JWT (is_watched enrichment)

```bash
curl -s "http://localhost:8080/api/similar?movie=Inception&k=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
watched = [m['movie_name'] for m in d['movies'] if m['is_watched']]
print(f'count: {d["count"]}, watched: {watched}')
"
```

Expected `200`: movies in user's ACR history show `"is_watched": true`.

### Case 3 — Default count (no k)

```bash
curl -s "http://localhost:8080/api/similar?movie=The+Dark+Knight" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'count: {d["count"]}')
"
```

Expected `200`: upstream-default number of results returned.

### Case 4 — Missing movie param (400)

```bash
curl -s "http://localhost:8080/api/similar"
```

Expected `400`: `movie is required`
