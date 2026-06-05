#!/usr/bin/env python3
"""
2d-space.py
Creates one 2D space JSON file per genre under genres/{genre}.json.
Each file contains every movie that belongs to that genre, with random (x, y)
coordinates local to that genre's space.

Coordinate system per genre space:
  - Origin (0, 0) is the genre centre.
  - x ∈ [-quadrantWidth/2,  +quadrantWidth/2]   →  [-150, +150]
  - y ∈ [-quadrantHeight/2, +quadrantHeight/2]  →  [-150, +150]
  The space-stitcher later offsets each genre centre to its cardinal position
  in the full stitched space.

A movie appears in every genre it belongs to with independently drawn coords.

Run from any directory:
    python3 2d-space.py
"""

import json
import os
import random

# ── paths ─────────────────────────────────────────────────────────────────────
HERE         = os.path.dirname(os.path.abspath(__file__))
CONSTS_PATH  = os.path.join(HERE, "../data-consts.json")
MOVIES_PATH  = os.path.join(HERE, "../global-data/movies.json")
GENRES_DIR   = os.path.join(HERE, "genres")

os.makedirs(GENRES_DIR, exist_ok=True)

# ── load constants ────────────────────────────────────────────────────────────
with open(CONSTS_PATH, encoding="utf-8") as f:
    _C = json.load(f)

ALL_GENRES      = _C["genres"]
HALF_W          = _C["quadrantWidth"]  / 2   # 150
HALF_H          = _C["quadrantHeight"] / 2   # 150
DEFAULT_CONTENT = _C["defaultContent"]

# Default entry pinned at fixed coordinates in every genre space
DEFAULT_ENTRY = {
    "id":    DEFAULT_CONTENT["id"],
    "title": DEFAULT_CONTENT["movieName"],
    "x":     DEFAULT_CONTENT["x"],
    "y":     DEFAULT_CONTENT["y"],
}

# ── load movies ───────────────────────────────────────────────────────────────
with open(MOVIES_PATH, encoding="utf-8") as f:
    movies = json.load(f)

# Attach stable ID and normalise genre field name
for i, m in enumerate(movies):
    m["_id"]    = f"ALP-MOVIE-{100 + i}"
    m["_title"] = m.get("movieName") or m.get("title", "")
    m["_genres"] = m.get("genre") or m.get("genres") or []

# ── generate per-genre spaces ─────────────────────────────────────────────────
random.seed(42)

totals = {}   # genre → entry count

for genre in ALL_GENRES:
    entries = [DEFAULT_ENTRY]   # default content always first, pinned at (0,0)
    for m in movies:
        if genre not in m["_genres"]:
            continue
        entries.append({
            "id":    m["_id"],
            "title": m["_title"],
            "x":     round(random.uniform(-HALF_W, HALF_W), 2),
            "y":     round(random.uniform(-HALF_H, HALF_H), 2),
        })

    out_file = os.path.join(GENRES_DIR, f"{genre}.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)

    totals[genre] = len(entries)

# ── summary ───────────────────────────────────────────────────────────────────
print(f"coord range: x ∈ [{-HALF_W}, +{HALF_W}]   y ∈ [{-HALF_H}, +{HALF_H}]")
print(f"{'genre':<15}  movies")
print("-" * 25)
for g in ALL_GENRES:
    print(f"  {g:<15}  {totals[g]:>3}")
print("-" * 25)
print(f"  {'TOTAL':<15}  {sum(totals.values()):>3}  (cross-genre duplicates counted)")
print(f"\nWrote {len(ALL_GENRES)} files → {GENRES_DIR}/")
