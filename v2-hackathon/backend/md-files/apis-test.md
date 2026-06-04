# Cinebula — API Test Commands (Positive Cases)

Run the server first:
```bash
cd Cinebula/v2-hackathon/backend && ./run.sh
```

All commands assume `http://localhost:8080`.
Run **in order** — Step 1 captures `$TOKEN` and `$USER_ID` used by later steps.

---

## Step 1 — POST /auth/login

```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pratikesh",
    "age": 22,
    "gender": "male",
    "top_genres": ["Sci-Fi","Action","Drama","Thriller","Comedy","Horror","Crime","Mystery","Adventure"]
  }' | tee /tmp/login.json | python3 -m json.tool
```

Expected `200`:
```json
{
  "user_id": <number>,
  "token": "<JWT string>"
}
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

## Step 3 — GET /top-genres (existing user with ACR data)

Use one of the seeded users: 1 = Ronit, 2 = Pratikesh, 3 = Vanshika, 4 = Arpit.

```bash
curl -s "http://localhost:8080/top-genres?userId=2" | python3 -m json.tool
```

Expected `200`:
```json
{
  "user_id": 1,
  "genres": [
    { "genre": "Adventure", "rank": 1, "weight": <number 0-1> },
    { "genre": "Action",    "rank": 2, "weight": <number 0-1> },
    ...
  ]
}
```

Verify: `genres` is non-empty, `rank` starts at 1, `weight` values are in (0, 1] and descending.

```bash
# Check all 4 ACR users return genres
for id in 1 2 3 4; do
  echo -n "userId=$id → "
  curl -s "http://localhost:8080/top-genres?userId=$id" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"genres\"])} genres, top: {d[\"genres\"][0][\"genre\"]} ({d[\"genres\"][0][\"weight\"]})')"
done
```

---

## Step 4 — GET /api/movies (by genre)

```bash
curl -s "http://localhost:8080/api/movies?genre=action" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'count: {d[\"count\"]}')
for m in d['movies'][:3]:
    print(f'  [{m[\"priority\"]:6.2f}]  {m[\"movie_name\"]}  ({m[\"vote_average\"]}/10)  x={m[\"x\"]:.1f} y={m[\"y\"]:.1f}')
"
```

Expected `200`: `count` > 0, each movie has `priority` field, `x` and `y` present.

---

## Step 5 — GET /api/movies (genre + keyword + language)

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

## Step 6 — GET /api/movies (title search)

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

## Step 7 — GET /api/movies (language only)

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

## Step 8 — Full seeding flow (top-genres → api/movies per genre)

Simulates what the phone does on first launch for user 2 (Pratikesh).

```bash
# Get top genres
GENRES=$(curl -s "http://localhost:8080/top-genres?userId=2" | \
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
