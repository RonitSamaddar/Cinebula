#!/usr/bin/env python3
"""
global-data.py
Reads TMDB_movie_dataset_v11.csv, takes the top totalMovies entries from
data-consts.json, and writes movies.json.

Run from any directory:
    python3 global-data.py
"""

import csv
import json
import os
import random

# ── load shared constants from data-consts.json ───────────────────────────────
HERE         = os.path.dirname(os.path.abspath(__file__))
CONSTS_PATH  = os.path.join(HERE, "../data-consts.json")

with open(CONSTS_PATH, encoding="utf-8") as _f:
    _C = json.load(_f)

TOTAL_MOVIES = _C["totalMovies"]
TOTAL_SHOWS  = _C["totalShows"]
GENRES       = _C["genres"]
GENRE_SET    = set(GENRES)
DIRECTORS    = _C["directors"]
ACTORS       = _C["actors"]

# TMDB genre strings → canonical genre list
GENRE_MAP = {
    "Science Fiction": "Sci-Fi",
    "History":         "Historical",
    "Music":           "Musical",
    "Biography":       "Biographical",
    "TV Movie":        "Drama",
}

# ── paths ─────────────────────────────────────────────────────────────────────
CSV_PATH   = os.path.join(HERE, "../../../../../TMDB_movie_dataset_v11.csv")
OUT_MOVIES = os.path.join(HERE, "movies.json")

# ── helpers ───────────────────────────────────────────────────────────────────

def canonicalize_genres(raw: str) -> list:
    """Map a TMDB comma-separated genre string to our canonical genre list."""
    result = []
    for g in raw.split(","):
        g = g.strip()
        mapped = GENRE_MAP.get(g, g)
        if mapped in GENRE_SET and mapped not in result:
            result.append(mapped)
    return result if result else ["Drama"]


# ── read CSV and build movies100.json ─────────────────────────────────────────
movies100 = []

with open(CSV_PATH, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for idx, row in enumerate(reader):
        if idx >= TOTAL_MOVIES:
            break

        title = row["title"].strip()
        genres = canonicalize_genres(row.get("genres", ""))

        # production_companies is a comma-separated string in the CSV
        prod_raw    = row.get("production_companies", "")
        prod_houses = [p.strip() for p in prod_raw.split(",") if p.strip()]

        entry = {
            "movieId":          idx + 1,
            "movieName":        title,
            "genre":            genres,
            "cast":             random.sample(ACTORS, k=random.randint(4, 6)),
            "productionHouses": prod_houses,
            "director":         random.choice(DIRECTORS),
            "synopsis":         row.get("overview", "").strip(),
        }
        movies100.append(entry)

with open(OUT_MOVIES, "w", encoding="utf-8") as f:
    json.dump(movies100, f, indent=2, ensure_ascii=False)

print(f"movies.json  — {len(movies100):>3} entries  →  {OUT_MOVIES}")
