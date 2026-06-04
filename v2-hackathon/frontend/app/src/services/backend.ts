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
 * Returns three sets for 3 zoom levels:
 * - z0: 30 shows per region (galaxy overview, zoom level 0)
 * - z1: 60 shows per region (mid zoom, coordinates 2.5× apart)
 * - z2: 90 shows per region (deep zoom, coordinates 5× apart)
 *
 * At render time, only 10 non-overlapping shows are displayed on screen (handled by ShowCards).
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
  const overlapX = Math.max(0, Math.min(a.worldX + a.w / 2, bx + bw / 2) - Math.max(a.worldX - a.w / 2, bx - bw / 2));
  const overlapY = Math.max(0, Math.min(a.worldY + a.h / 2, by + bh / 2) - Math.max(a.worldY - a.h / 2, by - bh / 2));
  const intersectionArea = overlapX * overlapY;
  const bArea = bw * bh;
  return intersectionArea > bArea * 0.5;
}

export interface ZoomLevelShows {
  z0: import("@/types").Show[];
  z1: import("@/types").Show[];
  z2: import("@/types").Show[];
}

export function backendMoviesToShows(
  topGenres: GenreWeight[],
  moviesByGenre: Record<string, MoviesResponse>,
  categories: import("@/types").Category[],
): ZoomLevelShows {
  const WORLD_W = 1600;
  const WORLD_H = 2200;
  // Radius per genre — tighter packing, shows stay close to center
  const SUBREGION_RADIUS = 200;
  const SHOWS_Z0 = 30;
  const SHOWS_Z1 = 60;
  const SHOWS_Z2 = 90;
  // Zoom scales used for collision detection (simulates how far apart shows appear)
  const ZOOM_SCALE_1 = 2.5;
  const ZOOM_SCALE_2 = 5;

  const z0Shows: import("@/types").Show[] = [];
  const z1Shows: import("@/types").Show[] = [];
  const z2Shows: import("@/types").Show[] = [];

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

    // Normalize x,y
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

    // --- Z0 (zoom level 0): greedy non-overlapping at 1× scale, max 30 ---
    const placedZ0: PlacedShow[] = [];
    const selectedZ0: typeof positioned = [];
    for (const p of positioned) {
      if (selectedZ0.length >= SHOWS_Z0) break;
      const dims = ICON_SIZES[p.size];
      const hasOverlap = placedZ0.some((placed) => overlaps(placed, p.worldX, p.worldY, dims.w, dims.h));
      if (!hasOverlap) {
        placedZ0.push({ worldX: p.worldX, worldY: p.worldY, w: dims.w, h: dims.h });
        selectedZ0.push(p);
      }
    }

    // --- Z1 (zoom level 1): at 2.5× scale, collision sizes shrink by 2.5 ---
    const placedZ1: PlacedShow[] = [];
    const selectedZ1: typeof positioned = [];
    for (const p of positioned) {
      if (selectedZ1.length >= SHOWS_Z1) break;
      const dims = ICON_SIZES[p.size];
      const scaledW = dims.w / ZOOM_SCALE_1;
      const scaledH = dims.h / ZOOM_SCALE_1;
      const hasOverlap = placedZ1.some((placed) => overlaps(placed, p.worldX, p.worldY, scaledW, scaledH));
      if (!hasOverlap) {
        placedZ1.push({ worldX: p.worldX, worldY: p.worldY, w: scaledW, h: scaledH });
        selectedZ1.push(p);
      }
    }

    // --- Z2 (zoom level 2): at 5× scale, collision sizes shrink by 5 ---
    const placedZ2: PlacedShow[] = [];
    const selectedZ2: typeof positioned = [];
    for (const p of positioned) {
      if (selectedZ2.length >= SHOWS_Z2) break;
      const dims = ICON_SIZES[p.size];
      const scaledW = dims.w / ZOOM_SCALE_2;
      const scaledH = dims.h / ZOOM_SCALE_2;
      const hasOverlap = placedZ2.some((placed) => overlaps(placed, p.worldX, p.worldY, scaledW, scaledH));
      if (!hasOverlap) {
        placedZ2.push({ worldX: p.worldX, worldY: p.worldY, w: scaledW, h: scaledH });
        selectedZ2.push(p);
      }
    }

    // Build Show objects
    for (const p of selectedZ0) z0Shows.push(makeShow(p, catKey, g.genre));
    for (const p of selectedZ1) z1Shows.push(makeShow(p, catKey, g.genre));
    for (const p of selectedZ2) z2Shows.push(makeShow(p, catKey, g.genre));
  }

  log(`Z0: ${z0Shows.length}, Z1: ${z1Shows.length}, Z2: ${z2Shows.length} shows across ${topGenres.length} genres`);
  return { z0: z0Shows, z1: z1Shows, z2: z2Shows };
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
    poster: movie.image_link ? `${movie.image_link}` : "",
    gradient: `linear-gradient(135deg, hsl(${(idx * 37) % 360}, 60%, 30%), hsl(${(idx * 37 + 60) % 360}, 50%, 20%))`,
    language: movie.language || "en",
    actors: movie.casts?.slice(0, 3) || [],
    tags: movie.keywords?.slice(0, 3) || [],
    watched: movie.is_watched,
  };
}
