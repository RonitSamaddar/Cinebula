# Search — Meilisearch Migration TODO

## Index Size Estimate

| Metric | Value |
|--------|-------|
| Total movies | 4,580 |
| Source file | `all_movies_uniq.txt` (20 newline-delimited JSON chunks) |
| Raw JSON size | ~6.26 MB |
| Avg doc size | ~1.4 KB |
| **Meilisearch on-disk estimate** | **~20–50 MB** |
| ↳ Document store | ~6.3 MB |
| ↳ Inverted index (text fields) | ~12–30 MB (2–5× raw for rich text) |
| ↳ Prefix trees + BM25 stats | ~3–10 MB |
| RAM peak during indexing | ~50–100 MB |
| RAM steady-state (mmap) | ~30–60 MB |

Searchable text fields driving the index size: `movie_name`, `synopsis`, `keywords`, `genres`, `casts`.
Numeric/coordinate fields (`x`, `y`, `vote_average`, etc.) are stored but not full-text indexed — minimal overhead.

---

## Tasks

### 1. Add Meilisearch Go client dependency
- [ ] `go get github.com/meilisearch/meilisearch-go`
- [ ] Pin version in `go.mod`

### 2. Run Meilisearch instance
- [ ] Add a `meilisearch` service to `docker-compose.yaml` (or `Dockerfile`)
- [ ] Expose port `7700`
- [ ] Set `MEILI_MASTER_KEY` env var (use a strong random key, not hardcoded)
- [ ] Example:
  ```yaml
  meilisearch:
    image: getmeili/meilisearch:v1.8
    ports:
      - "7700:7700"
    environment:
      MEILI_MASTER_KEY: "${MEILI_MASTER_KEY}"
    volumes:
      - meili_data:/meili_data
  ```

### 3. Create movie indexer command
- [ ] Create `cmd/indexer/main.go`
- [ ] Parse `all_movies_uniq.txt` (newline-delimited JSON, each line: `{"count":N,"movies":[...]}`)
- [ ] Deduplicate by `movie_name` (file may have overlapping chunks)
- [ ] Transform each movie into a Meilisearch document:
  ```go
  type MovieDoc struct {
      ID          string   `json:"id"`           // slugified movie_name
      MovieName   string   `json:"movie_name"`
      ImageLink   string   `json:"image_link"`
      VoteAverage float64  `json:"vote_average"`
      Popularity  float64  `json:"popularity"`
      Genres      []string `json:"genres"`
      Language    string   `json:"language"`
      Synopsis    string   `json:"synopsis"`
      Keywords    []string `json:"keywords"`
      Casts       []string `json:"casts"`
      X           float64  `json:"x"`
      Y           float64  `json:"y"`
  }
  ```
- [ ] Batch upload in chunks of 500 docs (`AddDocumentsInBatches`)
- [ ] Log progress and errors

### 4. Configure Meilisearch index settings
- [ ] Set **searchable attributes** (ordered by relevance weight):
  ```
  ["movie_name", "casts", "genres", "keywords", "synopsis"]
  ```
- [ ] Set **filterable attributes**:
  ```
  ["genres", "language", "vote_average", "popularity"]
  ```
- [ ] Set **sortable attributes**:
  ```
  ["vote_average", "popularity"]
  ```
- [ ] Set **ranking rules** (default Meilisearch order is good; consider adding `"popularity:desc"` as tie-breaker)
- [ ] Set **typo tolerance**: enabled (default), min word size for 1 typo = 5

### 5. Modify `internal/search/handler.go`
- [ ] Replace current `strings.Contains` brute-force over the stitched space with a Meilisearch query
- [ ] Query flow:
  1. Send user query to Meilisearch `movies` index
  2. Receive ranked `movie_name` results
  3. Look up the returned `movie_name` values in the stitched space to attach `(x, y)` coordinates
  4. Return enriched results (existing `StitchedEntry` shape)
- [ ] Accept env vars `MEILI_HOST` (default `http://localhost:7700`) and `MEILI_API_KEY`
- [ ] Initialize Meilisearch client once at startup (package-level or via dependency injection)
- [ ] Honour existing `userId` / `topGenres` context — only return movies present in user's stitched space, or return all and let the caller filter

### 6. Create `internal/search/client.go`
- [ ] Wrap Meilisearch client initialization
- [ ] Expose `Search(query string, limit int) ([]MovieDoc, error)`
- [ ] Handle empty results and API errors gracefully

### 7. Environment / config
- [ ] Add `MEILI_HOST` and `MEILI_API_KEY` to `.env.example` and `run.sh`
- [ ] Document in `HLD.md` or `md-files/`

### 8. Integration test
- [ ] Add a test in `integration-tests/` that:
  - Starts Meilisearch (or uses a pre-seeded test index)
  - Calls `GET /search?q=christmas&userId=1`
  - Asserts results contain relevant movies with `(x, y)` fields

### 9. Index rebuild strategy
- [ ] The indexer should be idempotent (`AddDocuments` upserts by primary key)
- [ ] Run indexer once at deploy time or as an init container
- [ ] Estimated indexing time for 4,580 docs: < 5 seconds

---

## Current State of `handler.go`
The existing handler does a `strings.Contains` search over the in-memory stitched space.
This is O(N × genres) and returns results in arbitrary order.

After migration, Meilisearch handles:
- Typo tolerance
- Prefix matching
- BM25 relevance ranking
- Sub-millisecond latency (indexed)

The stitched-space coordinate lookup (`BuildStitchedSpace`) stays as-is; Meilisearch only replaces the title-matching step.
