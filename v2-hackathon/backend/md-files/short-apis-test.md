# Cinebula — Quick API Smoke Test (Happy Path)

Assumes server is running on `http://localhost:8080`.

---

## 1. Login (device_id with ACR data)

```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"device_id": "46426f9c-ssss-4593-9399-21798b0d1148"}' \
  | tee /tmp/login.json | python3 -m json.tool
```

Save token:
```bash
export TOKEN=$(python3 -c "import json; print(json.load(open('/tmp/login.json'))['token'])")
export USER_ID=$(python3 -c "import json; print(json.load(open('/tmp/login.json'))['user_id'])")
echo "USER_ID=$USER_ID  TOKEN=$TOKEN"
```

---

## 2. Top Genres (ACR-derived)

```bash
curl -s "http://localhost:8080/top-genres" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

## 3. Search

```bash
curl -s "http://localhost:8080/search?q=inception" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

## 4. Filters

```bash
curl -s "http://localhost:8080/api/filters" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for f in d['filters']:
    print(f'  {f[\"id\"]:10s}  {len(f[\"values\"]):3d} values   first: {f[\"values\"][0]}')
"
```

---

## 5. Movies by Genre

```bash
curl -s "http://localhost:8080/api/movies?genre=action" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'count: {d[\"count\"]}')
for m in d['movies'][:3]:
    print(f'  [{m[\"priority\"]:6.2f}]  {m[\"movie_name\"]}  ({m[\"vote_average\"]}/10)  x={m[\"x\"]:.1f} y={m[\"y\"]:.1f}  watched={m[\"is_watched\"]}')
"
```

---

## 6. Movies by Genre + Keyword + Language

```bash
curl -s "http://localhost:8080/api/movies?genre=action&keyword=heist&language=en" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'count: {d[\"count\"]}')
for m in d['movies'][:3]:
    print(f'  [{m[\"priority\"]:6.2f}]  {m[\"movie_name\"]}  keywords: {m[\"keywords\"][:3]}')
"
```

