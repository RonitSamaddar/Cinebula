#!/usr/bin/env python3
"""
users.py
Generates users.json — one UserProfile entry per user.
top_genres is a ranked list of 5 genres (most preferred first),
randomly sampled from the canonical genres in data-consts.json.

Run from any directory:
    python3 users.py
"""

import json
import os
import random

# ── load shared constants ─────────────────────────────────────────────────────
HERE        = os.path.dirname(os.path.abspath(__file__))
CONSTS_PATH = os.path.join(HERE, "../data-consts.json")

with open(CONSTS_PATH, encoding="utf-8") as _f:
    _C = json.load(_f)

NUM_USERS = _C["numUsers"]
GENRES    = _C["genres"]

# ── generate users ────────────────────────────────────────────────────────────
# Reference: user.json shows users 1-4 have 1 fav genre, 5-6 have 2, 7-8 have 3,
# 9-10 have 4. Here we always store 5 ranked genres (top_genres[:5]) so the
# space-stitcher always has exactly 5 genre spaces to stitch.

random.seed(42)   # fixed seed → reproducible users.json

# Genre-count distribution across NUM_USERS (sums to NUM_USERS):
#   2 users → 1 genre  |  3 users → 2 genres
#   3 users → 3 genres |  2 users → 4 genres
_dist = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4]
assert len(_dist) == NUM_USERS, "distribution length must equal numUsers"
random.shuffle(_dist)   # randomise which users get which count

users = []
for uid in range(1, NUM_USERS + 1):
    k          = _dist[uid - 1]
    top_genres = random.sample(GENRES, k=k)
    user = {
        "userId":        uid,
        "top_genres":    top_genres,
        "acr_content_ids": [],
        "liked":         [],
        "disliked":      [],
        "watch_history": [],
    }
    users.append(user)

# ── write output ──────────────────────────────────────────────────────────────
OUT_PATH = os.path.join(HERE, "users.json")

with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(users, f, indent=2, ensure_ascii=False)

print(f"users.json  — {len(users):>3} entries  →  {OUT_PATH}")
