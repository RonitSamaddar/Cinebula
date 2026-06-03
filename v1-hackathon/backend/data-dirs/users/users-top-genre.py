#!/usr/bin/env python3
"""
users-top-genre.py
Reads acr-data.json, computes total watch time (seconds) per genre for each
user, and writes users-top-genre.json with genre_weights and top_genres ranked
by watch time.

Run from any directory:
    python3 users-top-genre.py
"""

import json
import os
from datetime import datetime, timezone

# ── paths ─────────────────────────────────────────────────────────────────────
HERE         = os.path.dirname(os.path.abspath(__file__))
ACR_PATH     = os.path.join(HERE, "../ACR-data/acr-data.json")
CONSTS_PATH  = os.path.join(HERE, "../data-consts.json")
OUT_PATH     = os.path.join(HERE, "users-top-genre.json")

# ── load data ─────────────────────────────────────────────────────────────────────
with open(ACR_PATH, encoding="utf-8") as f:
    acr_data = json.load(f)

with open(CONSTS_PATH, encoding="utf-8") as f:
    _C = json.load(f)
    ALL_GENRES          = _C["genres"]
    GENRE_WEIGHT_MATRIX = _C["genreWeightMatrix"]

# ── helpers ───────────────────────────────────────────────────────────────────

def parse_ts(ts: str) -> datetime:
    """Parse ISO-8601 timestamp string to UTC datetime."""
    return datetime.fromisoformat(ts).astimezone(timezone.utc)


def session_duration_seconds(session: dict) -> float:
    """Return watch duration in seconds; 0 if timestamps are missing/invalid."""
    start_raw = session.get("session_start_timestamp_utc")
    end_raw   = session.get("session_end_timestamp_utc")
    if not start_raw or not end_raw:
        return 0.0
    try:
        return max(0.0, (parse_ts(end_raw) - parse_ts(start_raw)).total_seconds())
    except ValueError:
        return 0.0

# ── compute per-user genre weights ────────────────────────────────────────────
results = []

for user_entry in acr_data:
    uid           = user_entry["userId"]
    genre_seconds = {}   # genre → total seconds watched

    for session in user_entry.get("sessions", []):
        duration = session_duration_seconds(session)
        if duration <= 0:
            continue

        genres = session.get("show_genres") or []
        if not genres:
            continue

        # distribute duration equally across all genres of the title
        per_genre = duration / len(genres)
        for g in genres:
            genre_seconds[g] = genre_seconds.get(g, 0.0) + per_genre

    # round to integers (seconds) and rank highest → lowest
    total_seconds = sum(genre_seconds.values()) or 1  # avoid div-by-zero

    # apply genre bias matrix — dampen over-represented genres before normalising
    adjusted = {
        g: secs * GENRE_WEIGHT_MATRIX.get(g, 1.0)
        for g, secs in genre_seconds.items()
    }
    adjusted_total = sum(adjusted.values()) or 1

    # normalise to 0–100 using adjusted total as denominator
    # all genres in the canonical set are included; 0 if never watched
    # sorted descending by weight
    raw_weights = {
        g: round((adjusted.get(g, 0.0) / adjusted_total) * 100, 2)
        for g in ALL_GENRES
    }
    genre_weights = dict(sorted(raw_weights.items(), key=lambda x: x[1], reverse=True))
    top_genres = sorted(
        (g for g in ALL_GENRES if genre_weights[g] > 0),
        key=lambda g: genre_weights[g],
        reverse=True,
    )

    results.append({
        "userId":        uid,
        "genre_weights": genre_weights,
        "top_genres":    top_genres,
    })

# ── write output ──────────────────────────────────────────────────────────────
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"users-top-genre.json  — {len(results)} users  →  {OUT_PATH}")

# ── quick summary ─────────────────────────────────────────────────────────────
for r in results:
    top3 = r["top_genres"][:3]
    w3   = [r["genre_weights"][g] for g in top3]
    pairs = ", ".join(f"{g}:{w}s" for g, w in zip(top3, w3))
    print(f"  user {r['userId']:>2}  top-3: {pairs}")
