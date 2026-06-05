# Frontend V2 Refactor — Summary

## Problem
The original frontend called 9 separate `/api/movies?genre=X` endpoints (one per user's top genre), placing movies in a 3×3 genre grid. This was slow, fragmented, and the spatial layout was tied to genre regions.

## What Changed

### Backend
- **New endpoint `GET /api/movies/v2`** — returns the full unfiltered catalog (~1934 movies) in a single call. Computes priority + caches.
- **In-memory response cache** added for `/api/movies`, `/api/similar`, and `/api/movies/v2` (5-min TTL). Copy-on-read for `is_watched` enrichment so cache stays user-neutral.

### Frontend — Data Flow
- **Before**: login → `/top-genres` → 9× `/api/movies?genre=X` (progressive phases)
- **After**: login → single `/api/movies/v2` → render everything at once
- No more `/top-genres` call. No genre regions. Single unified 1600×2200 canvas.

### Frontend — Tile Sizing (priority distribution issue)
- **Data**: priorities range 0–100 but cluster tightly (mean=74, stddev≈8). Old `ceil(priority/10)` mapped everything to levels 7-10.
- **Fix**: Z-score normalization. Map `[-2σ, +2σ]` → levels 1-10. Now tiles spread across all 10 size levels.
- **Tile size ladder** scaled up: level 1 = 32×45px, level 10 = 85×119px (biggest dust is 30px, so seamless transition).

### Frontend — Dust Particles
- **Before**: Random 10% of movies, colored rectangles, fixed sizes.
- **After**: Priority-driven white circles:
  - Only movies above threshold shown (z0: >mean, z1: >-0.8σ, z2: >-1.5σ)
  - Size: 2-10px for normal, 20-30px for >+1.5σ (big dust shows poster thumbnails)
  - Grid-based collision culling (one particle per grid cell, highest priority wins)
  - Per-zoom-level dust: dust at z0 crystallizes into tiles at z1 on pinch-zoom

### Frontend — Center Content Guarantee
- Z0 tile placement does a first pass: ensures ≥4 tiles land in center 20% of canvas before filling remaining slots.

### Frontend — Tile/Dust Alignment Fix
- `ShowCard` had `className="absolute"` causing top-left anchoring inside the wrapper.
- Wrapper div now has explicit `width/height` so `translate(-50%, -50%)` correctly centers both tiles and dust at the same anchor point.

## Key Data Points
```
Priority distribution from /api/movies/v2:
  count=1934  min=0.00  max=100.00  avg=74.24
  stddev ≈ 8
  Most values cluster 66–96
```
