/**
 * Backend client — fires requests to the Cinebula backend (port 8080)
 * after QR scan provides a device_id.
 * Routes through /api/proxy to avoid mixed content (HTTPS→HTTP) issues.
 * Logs all responses to /api/log endpoint which writes to log.txt.
 */

function proxyUrl(path: string) {
  return `/api/proxy?path=${encodeURIComponent(path)}`;
}

async function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}${data ? "\n" + JSON.stringify(data, null, 2) : ""}`;
  console.log("[backend]", entry);
  try {
    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry }),
    });
  } catch {
    // logging is best-effort
  }
}

export interface LoginResponse {
  user_id: number;
  token: string;
  device_id?: string;
}

export interface GenreWeight {
  genre: string;
  rank: number;
  weight: number;
}

export interface TopGenresResponse {
  user_id: number;
  genres: GenreWeight[];
}

export interface Filter {
  id: string;
  values: string[];
}

export interface FiltersResponse {
  filters: Filter[];
}

export interface Movie {
  movie_name: string;
  image_link?: string;
  vote_average: number;
  vote_count?: number;
  popularity?: number;
  genres?: string[];
  language?: string;
  imdb_rating?: number;
  synopsis?: string;
  keywords?: string[];
  casts?: string[];
  x: number;
  y: number;
  priority: number;
  is_watched: boolean;
}

export interface MoviesResponse {
  count: number;
  movies: Movie[];
}

/**
 * Full backend initialization flow after QR scan.
 * 1. POST /auth/login with device_id
 * 2. GET /top-genres
 * 3. GET /api/filters
 * 4. GET /api/movies for each top genre
 */
export async function initializeBackend(deviceId: string) {
  await log("=== Backend initialization started ===", { deviceId });

  // Step 1: Login
  let token: string;
  let userId: number;
  try {
    const res = await fetch(proxyUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
    });
    const data: LoginResponse = await res.json();
    token = data.token;
    userId = data.user_id;
    await log("POST /auth/login — success", { user_id: userId, token: token.slice(0, 20) + "..." });
  } catch (err) {
    await log("POST /auth/login — FAILED", { error: String(err) });
    return null;
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // Step 2: Top Genres
  let topGenres: GenreWeight[] = [];
  try {
    const res = await fetch(proxyUrl("/top-genres"), { headers: authHeaders });
    const data: TopGenresResponse = await res.json();
    topGenres = data.genres;
    await log("GET /top-genres — success", { count: topGenres.length, top3: topGenres.slice(0, 3) });
  } catch (err) {
    await log("GET /top-genres — FAILED", { error: String(err) });
  }

  // Step 3: Filters
  let filters: Filter[] = [];
  try {
    const res = await fetch(proxyUrl("/api/filters"));
    const data: FiltersResponse = await res.json();
    filters = data.filters;
    await log("GET /api/filters — success", {
      filters: filters.map((f) => ({ id: f.id, count: f.values.length })),
    });
  } catch (err) {
    await log("GET /api/filters — FAILED", { error: String(err) });
  }

  // Step 4: Movies per top genre (serially, for all top genres)
  const moviesByGenre: Record<string, MoviesResponse> = {};
  for (const g of topGenres) {
    try {
      const res = await fetch(
        proxyUrl(`/api/movies?genre=${encodeURIComponent(g.genre.toLowerCase())}`),
        { headers: authHeaders }
      );
      const data: MoviesResponse = await res.json();
      moviesByGenre[g.genre] = data;
      await log(`GET /api/movies?genre=${g.genre} — success`, {
        count: data.count,
        top3: data.movies?.slice(0, 3).map((m) => m.movie_name),
      });
    } catch (err) {
      await log(`GET /api/movies?genre=${g.genre} — FAILED`, { error: String(err) });
    }
  }

  await log("=== Backend initialization complete ===", {
    userId,
    genresLoaded: topGenres.length,
    filtersLoaded: filters.length,
    genresWithMovies: Object.keys(moviesByGenre).length,
  });

  return { token, userId, topGenres, filters, moviesByGenre };
}

/**
 * Progressive backend initialization — loads genres in priority order:
 * 1. Login + top-genres + filters
 * 2. Center genre (index 3 in position grid — spatial center of galaxy)
 * 3. 4 side genres (indices 0,1,2,4)
 * 4. Remaining genres (indices 5,6,7,8)
 */

// Loading order: center first, then adjacent 4, then remaining 4
export const LOAD_ORDER_CENTER = 3;
export const LOAD_ORDER_SIDES = [0, 1, 2, 4];
export const LOAD_ORDER_REMAINING = [5, 6, 7, 8];

export interface ProgressiveSession {
  token: string;
  userId: number;
  topGenres: GenreWeight[];
  filters: Filter[];
}

export async function loginAndFetchGenres(deviceId: string): Promise<ProgressiveSession | null> {
  await log("=== Progressive init: login + genres ===", { deviceId });

  let token: string;
  let userId: number;
  try {
    const res = await fetch(proxyUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
    });
    const data: LoginResponse = await res.json();
    token = data.token;
    userId = data.user_id;
    await log("POST /auth/login — success", { user_id: userId });
  } catch (err) {
    await log("POST /auth/login — FAILED", { error: String(err) });
    return null;
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  let topGenres: GenreWeight[] = [];
  try {
    const res = await fetch(proxyUrl("/top-genres"), { headers: authHeaders });
    const data: TopGenresResponse = await res.json();
    topGenres = data.genres;
    await log("GET /top-genres — success", { count: topGenres.length });
  } catch (err) {
    await log("GET /top-genres — FAILED", { error: String(err) });
  }

  let filters: Filter[] = [];
  try {
    const res = await fetch(proxyUrl("/api/filters"));
    const data: FiltersResponse = await res.json();
    filters = data.filters;
  } catch {
    // non-critical
  }

  return { token, userId, topGenres, filters };
}

export async function fetchGenreMovies(
  genre: string,
  token: string,
): Promise<MoviesResponse | null> {
  try {
    const res = await fetch(
      proxyUrl(`/api/movies?genre=${encodeURIComponent(genre.toLowerCase())}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data: MoviesResponse = await res.json();
    await log(`GET /api/movies?genre=${genre} — success`, {
      count: data.count,
      top3: data.movies?.slice(0, 3).map((m) => m.movie_name),
    });
    return data;
  } catch (err) {
    await log(`GET /api/movies?genre=${genre} — FAILED`, { error: String(err) });
    return null;
  }
}

/**
 * Convert backend movies into frontend Show[] mapped to galaxy positions.
 * Each top genre from backend IS a category — no mapping needed.
 * Uses actual x,y from backend as relative coordinates within each genre's region.
 *
 * Returns two sets:
 * - zoomedOut: 45 non-overlapping shows per region (5 per screen × 9 screens)
 * - zoomedIn: 100 shows per region (at 3× scale, previously overlapping shows fit)
 *
 * Non-overlapping: normalize all shows' x,y → compute world positions → greedily
 * select highest priority shows that don't overlap with already-placed ones.
 */

// 3 fixed sizes (px dimensions for collision detection)
const ICON_SIZES: Record<import("@/types").ShowSize, { w: number; h: number }> = {
  l: { w: 90, h: 126 },
  m: { w: 70, h: 98 },
  s: { w: 50, h: 70 },
};

function getShowSize(priority: number): import("@/types").ShowSize {
  if (priority > 66) return "l";
  if (priority > 33) return "m";
  return "s";
}

interface PlacedShow {
  worldX: number;
  worldY: number;
  w: number;
  h: number;
}

/**
 * Check if show B overlaps >50% of its own area with placed show A.
 * Returns true if the intersection area exceeds 50% of B's area.
 */
function overlaps(a: PlacedShow, bx: number, by: number, bw: number, bh: number): boolean {
  // Compute intersection rectangle
  const overlapX = Math.max(0, Math.min(a.worldX + a.w / 2, bx + bw / 2) - Math.max(a.worldX - a.w / 2, bx - bw / 2));
  const overlapY = Math.max(0, Math.min(a.worldY + a.h / 2, by + bh / 2) - Math.max(a.worldY - a.h / 2, by - bh / 2));
  const intersectionArea = overlapX * overlapY;
  const bArea = bw * bh;
  return intersectionArea > bArea * 0.5;
}

export function backendMoviesToShows(
  topGenres: GenreWeight[],
  moviesByGenre: Record<string, MoviesResponse>,
  categories: import("@/types").Category[],
): { zoomedOut: import("@/types").Show[]; zoomedIn: import("@/types").Show[] } {
  const WORLD_W = 1400;
  const WORLD_H = 1800;
  const SUBREGION_RADIUS = 280;
  const SHOWS_ZOOMED_OUT = 45; // max non-overlapping per region
  const SHOWS_ZOOMED_IN = 100; // at 3× scale, more fit

  const zoomedOutShows: import("@/types").Show[] = [];
  const zoomedInShows: import("@/types").Show[] = [];

  for (let gi = 0; gi < topGenres.length; gi++) {
    const g = topGenres[gi];
    const genreData = moviesByGenre[g.genre];
    if (!genreData?.movies?.length) continue;

    const catKey = g.genre.toLowerCase();
    const cat = categories.find((c) => c.key === catKey);
    if (!cat) continue;

    const cx = cat.position.x * WORLD_W;
    const cy = cat.position.y * WORLD_H;

    // Sort by priority descending
    const sorted = [...genreData.movies].sort((a, b) => b.priority - a.priority);

    // Normalize x,y across ALL movies in this genre for consistent placement
    const allXs = sorted.map((m) => m.x);
    const allYs = sorted.map((m) => m.y);
    const minX = Math.min(...allXs);
    const maxX = Math.max(...allXs);
    const minY = Math.min(...allYs);
    const maxY = Math.max(...allYs);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Compute world positions for all movies
    const positioned = sorted.map((movie, i) => {
      const relX = (movie.x - minX) / rangeX;
      const relY = (movie.y - minY) / rangeY;
      const worldX = cx + (relX - 0.5) * 2 * SUBREGION_RADIUS;
      const worldY = cy + (relY - 0.5) * 2 * SUBREGION_RADIUS;
      const size = getShowSize(movie.priority);
      return { movie, relX, relY, worldX, worldY, size, idx: i };
    });

    // --- Zoom-out selection: greedy non-overlapping, max SHOWS_ZOOMED_OUT ---
    const placedOut: PlacedShow[] = [];
    const selectedOut: typeof positioned = [];

    for (const p of positioned) {
      if (selectedOut.length >= SHOWS_ZOOMED_OUT) break;
      const dims = ICON_SIZES[p.size];
      const hasOverlap = placedOut.some((placed) => overlaps(placed, p.worldX, p.worldY, dims.w, dims.h));
      if (!hasOverlap) {
        placedOut.push({ worldX: p.worldX, worldY: p.worldY, w: dims.w, h: dims.h });
        selectedOut.push(p);
      }
    }

    // --- Zoom-in selection: at 3× scale distances are 3× bigger, so more fit ---
    // Simulate 3× scale: divide collision sizes by 3 (distances effectively triple)
    const placedIn: PlacedShow[] = [];
    const selectedIn: typeof positioned = [];

    for (const p of positioned) {
      if (selectedIn.length >= SHOWS_ZOOMED_IN) break;
      const dims = ICON_SIZES[p.size];
      const scaledW = dims.w / 3;
      const scaledH = dims.h / 3;
      const hasOverlap = placedIn.some((placed) => overlaps(placed, p.worldX, p.worldY, scaledW, scaledH));
      if (!hasOverlap) {
        placedIn.push({ worldX: p.worldX, worldY: p.worldY, w: scaledW, h: scaledH });
        selectedIn.push(p);
      }
    }

    // Build Show objects for zoom-out set
    for (const p of selectedOut) {
      zoomedOutShows.push(makeShow(p, catKey, g.genre));
    }

    // Build Show objects for zoom-in set (includes zoom-out shows + extras)
    for (const p of selectedIn) {
      zoomedInShows.push(makeShow(p, catKey, g.genre));
    }
  }

  log(`Zoom-out: ${zoomedOutShows.length} shows, Zoom-in: ${zoomedInShows.length} shows across ${topGenres.length} genres`);
  return { zoomedOut: zoomedOutShows, zoomedIn: zoomedInShows };
}

function makeShow(
  p: { movie: Movie; relX: number; relY: number; worldX: number; worldY: number; size: import("@/types").ShowSize; idx: number },
  catKey: string,
  genre: string,
): import("@/types").Show {
  const { movie, relX, relY, worldX, worldY, size, idx } = p;
  return {
    id: `${catKey}-${idx}`,
    title: movie.movie_name,
    year: 2020,
    runtime: "2h",
    genres: genre,
    description: movie.synopsis || `Rating: ${movie.vote_average}/10`,
    match: Math.round(movie.priority),
    category: catKey,
    relX,
    relY,
    worldX,
    worldY,
    size,
    poster: movie.image_link || "",
    gradient: `linear-gradient(135deg, hsl(${(idx * 37) % 360}, 60%, 30%), hsl(${(idx * 37 + 60) % 360}, 50%, 20%))`,
    language: movie.language || "en",
    actors: movie.casts?.slice(0, 3) || [],
    tags: movie.keywords?.slice(0, 3) || [],
    watched: movie.is_watched,
  };
}
