import json
import random
import uuid
import os
from datetime import datetime, timedelta, timezone

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE     = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = BASE

with open(os.path.join(DATA_DIR, "../global-data/movies.json")) as f:
    movies = json.load(f)

with open(os.path.join(DATA_DIR, "../global-data/shows.json")) as f:
    shows = json.load(f)

with open(os.path.join(DATA_DIR, "../users/users.json")) as f:
    users = json.load(f)

# Attach stable IDs and type tag to each content item.
# Normalize movies.json field names (movieName→title, genre→genres).
for i, m in enumerate(movies):
    m["_id"]   = f"ALP-MOVIE-{100 + i}"
    m["_type"] = "movie"
    if "title" not in m:
        m["title"] = m.get("movieName", "")
    if "genres" not in m:
        m["genres"] = m.get("genre", [])

for i, s in enumerate(shows):
    s["_id"]   = f"ALP-SHOW-{100 + i}"
    s["_type"] = "show"

ALL_CONTENT = movies + shows

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DATE_START     = datetime(2026, 5,  4,  0,  0,  0, tzinfo=timezone.utc)
DATE_END       = datetime(2026, 6,  3, 23, 59, 59, tzinfo=timezone.utc)
RANGE_SECONDS  = int((DATE_END - DATE_START).total_seconds())
MAX_ROWS       = None   # no cap — generate full viewership for all users

US_TIMEZONES = [
    "America/New_York", "America/Chicago", "America/Denver",
    "America/Los_Angeles", "America/Phoenix", "America/Anchorage",
    "Pacific/Honolulu",
]

DMA_POSTAL = [
    (501, "10001"), (504, "60601"), (803, "90001"), (534, "32904"),
    (636, "78521"), (505, "02101"), (506, "19101"), (511, "48201"),
    (612, "55401"), (524, "98101"), (515, "20001"), (618, "85001"),
    (532, "12534"), (528, "44101"), (535, "30301"), (539, "63101"),
    (540, "94101"), (542, "46201"), (543, "53201"), (544, "38101"),
]

RAW_APP_NAMES = [
    "Xfinity X1", "Netflix", "Hulu", "Disney+", "Apple TV+",
    "Roku Channel", "Amazon Fire TV", "Peacock", None, None, None,
]
RAW_DEVICE_INPUTS   = ["HDMI1", "HDMI2", "Set-Top Box", "GAME", "Streaming Stick", None, None]
HDMI_MANUFACTURERS  = ["Samsung", "LG", "Sony", "MSFT", "Roku", None, None]

random.seed(42)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fmt_ts(dt: datetime) -> str:
    """Format a UTC datetime as 'YYYY-MM-DDTHH:MM:SS.mss+00:00'."""
    ms = random.randint(0, 999)
    return dt.strftime(f"%Y-%m-%dT%H:%M:%S.{ms:03d}+00:00")


def random_ip() -> str:
    return (f"{random.randint(1,254)}.{random.randint(0,255)}"
            f".{random.randint(0,255)}.{random.randint(1,254)}")


def random_device_id() -> str:
    parts = str(uuid.uuid4()).split("-")
    parts[1] = "ssss"
    return "-".join(parts)


def get_user_genres(user: dict) -> list:
    if "top_genres" in user:
        return user["top_genres"]
    if "favoriteGenres" in user:
        return user["favoriteGenres"]
    return [user["favoriteGenre"]]


def get_content_pool(genres: list) -> list:
    pool = [c for c in ALL_CONTENT if any(g in c["genres"] for g in genres)]
    return pool if pool else ALL_CONTENT


def make_row(device_id, tz, dma, postal, app, dev_input, hdmi_mfr,
             content, session_start, session_end) -> dict:
    run_dt     = session_start.strftime("%Y-%m-%dT21:00:00.000+00:00")
    updated_dt = fmt_ts(session_start + timedelta(days=1,
                                                   hours=random.randint(1, 6),
                                                   minutes=random.randint(0, 59)))
    return {
        "device_id":                           device_id,
        "session_type":                        "vod",
        "alphonso_station_id":                 None,
        "partner_station_id":                  None,
        "alphonso_callsign":                   None,
        "partner_callsign":                    None,
        "network":                             None,
        "show_id":                             content["_id"],
        "show_title":                          content["title"],
        "show_genres":                         content["genres"],
        "episode_title":                       None,
        "show_start_timestamp_utc":            None,
        "show_end_timestamp_utc":              None,
        "session_start_timestamp_utc":         fmt_ts(session_start),
        "session_end_timestamp_utc":           fmt_ts(session_end),
        "aligned_to_epg_start_timestamp_utc":  None,
        "aligned_to_epg_end_timestamp_utc":    None,
        "user_timezone":                       tz,
        "user_dma_code":                       dma,
        "user_postal_code":                    postal,
        "user_country":                        "US",
        "raw_app_name":                        app,
        "raw_device_input":                    dev_input,
        "hdmi_device_manufacturer":            hdmi_mfr,
        "show_date":                           session_start.strftime("%Y-%m-%d"),
        "run_datetime_utc":                    run_dt,
        "is_local":                            True,
        "is_delivery_eligible":                True,
        "data_privacy_codes":                  None,
        "data_privacy_updated_datetime_utc":   None,
        "updated_datetime_utc":                updated_dt,
        "device_ip_address":                   random_ip(),
    }


# ---------------------------------------------------------------------------
# Main generation loop
# ---------------------------------------------------------------------------
output      = []   # list of user-grouped objects
total_sessions = 0

for user in users:
    genres  = get_user_genres(user)
    pool    = get_content_pool(genres)

    target_minutes = random.randint(100, 1000) * 60   # 100-1000 hours → minutes
    watched_min    = 0

    device_id  = random_device_id()
    tz         = random.choice(US_TIMEZONES)
    dma, postal = random.choice(DMA_POSTAL)
    app        = random.choice(RAW_APP_NAMES)
    dev_input  = random.choice(RAW_DEVICE_INPUTS)
    hdmi_mfr   = random.choice(HDMI_MANUFACTURERS)

    sessions = []
    while watched_min < target_minutes:
        duration_min = random.randint(15, 120)
        max_offset   = RANGE_SECONDS - duration_min * 60
        if max_offset <= 0:
            break
        offset_sec    = random.randint(0, max_offset)
        session_start = DATE_START + timedelta(seconds=offset_sec)
        session_end   = session_start + timedelta(minutes=duration_min)

        content = random.choice(pool)
        sessions.append(
            make_row(device_id, tz, dma, postal, app, dev_input, hdmi_mfr,
                     content, session_start, session_end)
        )
        watched_min    += duration_min
        total_sessions += 1

        if MAX_ROWS and total_sessions >= MAX_ROWS:
            break

    # Sort this user's sessions chronologically
    sessions.sort(key=lambda r: r["session_start_timestamp_utc"])

    output.append({
        "userId":    user["userId"],
        "device_id": device_id,
        "sessions":  sessions,
    })

    if MAX_ROWS and total_sessions >= MAX_ROWS:
        break

out_path = os.path.join(BASE, "acr-data.json")
with open(out_path, "w") as f:
    json.dump(output, f, indent=2)

print(f"Generated {len(output)} users, {total_sessions} total sessions -> acr-data.json")
