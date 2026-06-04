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
  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const entry = `${message}${data ? " " + JSON.stringify(data) : ""}`;
  console.log(`[${timestamp}]`, entry);
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

// 10 size levels (px dimensions for collision detection, aspect 1:1.4)
const ICON_SIZES: Record<number, { w: number; h: number }> = {
  1: { w: 13, h: 17 },
  2: { w: 18, h: 25 },
  3: { w: 23, h: 33 },
  4: { w: 30, h: 42 },
  5: { w: 36, h: 49 },
  6: { w: 42, h: 57 },
  7: { w: 48, h: 68 },
  8: { w: 55, h: 77 },
  9: { w: 60, h: 83 },
  10: { w: 65, h: 92 },
};

function getShowSize(priority: number): import("@/types").ShowSize {
  // Map priority 0-100 to size 1-10
  const level = Math.ceil((Math.min(Math.max(priority, 1), 100)) / 10) as import("@/types").ShowSize;
  return level;
}

interface PlacedShow {
  worldX: number;
  worldY: number;
  w: number;
  h: number;
}

/**
 * Compute overlap ratio of tile B with placed tile A.
 * Returns 0 (no overlap) to 1 (fully covered).
 */
function overlapRatio(a: PlacedShow, bx: number, by: number, bw: number, bh: number): number {
  const overlapX = Math.max(0, Math.min(a.worldX + a.w / 2, bx + bw / 2) - Math.max(a.worldX - a.w / 2, bx - bw / 2));
  const overlapY = Math.max(0, Math.min(a.worldY + a.h / 2, by + bh / 2) - Math.max(a.worldY - a.h / 2, by - bh / 2));
  const intersectionArea = overlapX * overlapY;
  const bArea = bw * bh;
  return bArea > 0 ? intersectionArea / bArea : 0;
}

/**
 * Resolve collisions smartly:
 * - If overlap > 70%: reject (too much)
 * - If overlap 20-70%: downsize by 1-2 levels and reduce opacity
 * - If overlap < 20%: accept as-is
 */
function resolveCollision(
  placed: PlacedShow[],
  worldX: number,
  worldY: number,
  size: import("@/types").ShowSize,
): { size: import("@/types").ShowSize; opacityPenalty: number } | null {
  let maxOverlap = 0;
  for (const p of placed) {
    const dims = ICON_SIZES[size];
    const ratio = overlapRatio(p, worldX, worldY, dims.w, dims.h);
    if (ratio > maxOverlap) maxOverlap = ratio;
  }

  if (maxOverlap > 0.7) return null; // reject — too much overlap
  if (maxOverlap > 0.4) {
    // Heavy overlap: shrink by 2 levels, opacity penalty
    const newSize = Math.max(1, size - 2) as import("@/types").ShowSize;
    return { size: newSize, opacityPenalty: 0.3 };
  }
  if (maxOverlap > 0.2) {
    // Light overlap: shrink by 1 level, slight opacity penalty
    const newSize = Math.max(1, size - 1) as import("@/types").ShowSize;
    return { size: newSize, opacityPenalty: 0.15 };
  }
  // No significant overlap
  return { size, opacityPenalty: 0 };
}

export interface DustParticle {
  id: string;
  worldX: number;
  worldY: number;
  size: number; // 3-10px
  color: string;
  opacity: number;
}

export interface ZoomLevelShows {
  z0: import("@/types").Show[];
  z1: import("@/types").Show[];
  z2: import("@/types").Show[];
  dust: DustParticle[];
}

export function backendMoviesToShows(
  topGenres: GenreWeight[],
  moviesByGenre: Record<string, MoviesResponse>,
  categories: import("@/types").Category[],
): ZoomLevelShows {
  const WORLD_W = 1600;
  const WORLD_H = 2200;
  // Radius per genre — large so genres overlap at boundaries and fill the canvas
  const SUBREGION_RADIUS = 450;
  const SHOWS_Z0 = 12;
  const SHOWS_Z1 = 25;
  const SHOWS_Z2 = 45;
  // Zoom scales used for collision detection (simulates how far apart shows appear)
  const ZOOM_SCALE_1 = 2.5;
  const ZOOM_SCALE_2 = 5;

  const DUST_COLORS = [
    "#b56cff", "#6fa8e8", "#3fb89e", "#ff9f43", "#ff7a6c",
    "#e6b04a", "#7c8a99", "#e056a0", "#c44040", "#8b5cf6",
    "#34d399", "#f472b6", "#60a5fa", "#fbbf24",
  ];

  const z0Shows: import("@/types").Show[] = [];
  const z1Shows: import("@/types").Show[] = [];
  const z2Shows: import("@/types").Show[] = [];
  const dustParticles: DustParticle[] = [];

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

    // --- Z0 (zoom level 0): resolve collisions smartly, max per genre ---
    const placedZ0: PlacedShow[] = [];
    const selectedZ0: { movie: typeof positioned[0]["movie"]; relX: number; relY: number; worldX: number; worldY: number; size: import("@/types").ShowSize; idx: number; opacityPenalty: number }[] = [];
    for (const p of positioned) {
      if (selectedZ0.length >= SHOWS_Z0) break;
      const result = resolveCollision(placedZ0, p.worldX, p.worldY, p.size);
      if (result) {
        const dims = ICON_SIZES[result.size];
        placedZ0.push({ worldX: p.worldX, worldY: p.worldY, w: dims.w, h: dims.h });
        selectedZ0.push({ ...p, size: result.size, opacityPenalty: result.opacityPenalty });
      }
    }

    // --- Z1 (zoom level 1): at 2.5× scale ---
    const placedZ1: PlacedShow[] = [];
    const selectedZ1: typeof selectedZ0 = [];
    for (const p of positioned) {
      if (selectedZ1.length >= SHOWS_Z1) break;
      const dims = ICON_SIZES[p.size];
      const scaledW = dims.w / ZOOM_SCALE_1;
      const scaledH = dims.h / ZOOM_SCALE_1;
      // Use scaled dims for overlap check at this zoom
      let maxOverlap = 0;
      for (const placed of placedZ1) {
        const ratio = overlapRatio(placed, p.worldX, p.worldY, scaledW, scaledH);
        if (ratio > maxOverlap) maxOverlap = ratio;
      }
      if (maxOverlap <= 0.7) {
        const penalty = maxOverlap > 0.4 ? 0.3 : maxOverlap > 0.2 ? 0.15 : 0;
        const sizeReduction = maxOverlap > 0.4 ? 2 : maxOverlap > 0.2 ? 1 : 0;
        const newSize = Math.max(1, p.size - sizeReduction) as import("@/types").ShowSize;
        placedZ1.push({ worldX: p.worldX, worldY: p.worldY, w: scaledW, h: scaledH });
        selectedZ1.push({ ...p, size: newSize, opacityPenalty: penalty });
      }
    }

    // --- Z2 (zoom level 2): at 5× scale ---
    const placedZ2: PlacedShow[] = [];
    const selectedZ2: typeof selectedZ0 = [];
    for (const p of positioned) {
      if (selectedZ2.length >= SHOWS_Z2) break;
      const dims = ICON_SIZES[p.size];
      const scaledW = dims.w / ZOOM_SCALE_2;
      const scaledH = dims.h / ZOOM_SCALE_2;
      let maxOverlap = 0;
      for (const placed of placedZ2) {
        const ratio = overlapRatio(placed, p.worldX, p.worldY, scaledW, scaledH);
        if (ratio > maxOverlap) maxOverlap = ratio;
      }
      if (maxOverlap <= 0.7) {
        const penalty = maxOverlap > 0.4 ? 0.3 : maxOverlap > 0.2 ? 0.15 : 0;
        const sizeReduction = maxOverlap > 0.4 ? 2 : maxOverlap > 0.2 ? 1 : 0;
        const newSize = Math.max(1, p.size - sizeReduction) as import("@/types").ShowSize;
        placedZ2.push({ worldX: p.worldX, worldY: p.worldY, w: scaledW, h: scaledH });
        selectedZ2.push({ ...p, size: newSize, opacityPenalty: penalty });
      }
    }

    // Build Show objects
    for (const p of selectedZ0) z0Shows.push(makeShow(p, catKey, g.genre));
    for (const p of selectedZ1) z1Shows.push(makeShow(p, catKey, g.genre));
    for (const p of selectedZ2) z2Shows.push(makeShow(p, catKey, g.genre));

    // Generate dust particles — keep ~10% of movie positions
    for (let i = 0; i < positioned.length; i++) {
      const hash = ((i * 2654435761 + gi * 40503) >>> 0) % 10;
      if (hash >= 1) continue; // skip 90%, keep 10%
      const p = positioned[i];
      const seed = (i * 7 + gi * 31);
      const offsetX = ((seed * 17) % 61) - 30;
      const offsetY = ((seed * 23) % 61) - 30;
      const dustSize = 3 + (seed % 8); // 3-10px width
      const colorIdx = (seed * 11) % DUST_COLORS.length;
      const dustOpacity = 0.15 + ((seed % 20) / 100); // 0.15-0.35
      dustParticles.push({
        id: `dust-${gi}-${i}`,
        worldX: p.worldX + offsetX,
        worldY: p.worldY + offsetY,
        size: dustSize,
        color: DUST_COLORS[colorIdx],
        opacity: dustOpacity,
      });
    }
  }

  log(`Z0: ${z0Shows.length}, Z1: ${z1Shows.length}, Z2: ${z2Shows.length} shows, ${dustParticles.length} dust particles`);
  return { z0: z0Shows, z1: z1Shows, z2: z2Shows, dust: dustParticles };
}

function makeShow(
  p: { movie: Movie; relX: number; relY: number; worldX: number; worldY: number; size: import("@/types").ShowSize; idx: number; opacityPenalty?: number },
  catKey: string,
  genre: string,
): import("@/types").Show {
  const { movie, relX, relY, worldX, worldY, size, idx, opacityPenalty } = p;
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
    opacityPenalty: opacityPenalty || 0,
    poster: movie.image_link ? `${movie.image_link}` : "",
    gradient: `linear-gradient(135deg, hsl(${(idx * 37) % 360}, 60%, 30%), hsl(${(idx * 37 + 60) % 360}, 50%, 20%))`,
    language: movie.language || "en",
    actors: movie.casts?.slice(0, 3) || [],
    tags: movie.keywords?.slice(0, 3) || [],
    watched: movie.is_watched,
  };
}
