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

  let filters: Filter[] = [];
  try {
    const res = await fetch(proxyUrl("/api/filters"));
    const data: FiltersResponse = await res.json();
    filters = data.filters;
  } catch {
    // non-critical
  }

  return { token, userId, topGenres: [], filters };
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
 * Search movies via Meilisearch — typo-tolerant, prefix matching.
 * Returns up to 50 movie name strings.
 */
export async function searchMovies(query: string, token: string): Promise<string[]> {
  try {
    const res = await fetch(proxyUrl(`/search?q=${encodeURIComponent(query)}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data: string[] = await res.json();
    return data;
  } catch {
    return [];
  }
}

// Language name → ISO 639-1 code mapping
const LANG_TO_ISO: Record<string, string> = {
  Arabic: "ar", Bengali: "bn", Bosnian: "bs", Chinese: "zh", Danish: "da",
  German: "de", Greek: "el", English: "en", Spanish: "es", Persian: "fa",
  French: "fr", Hebrew: "he", Hindi: "hi", Hungarian: "hu", Indonesian: "id",
  Italian: "it", Japanese: "ja", Kannada: "kn", Korean: "ko", Malayalam: "ml",
  Marathi: "mr", Dutch: "nl", Punjabi: "pa", Polish: "pl", Portuguese: "pt",
  Russian: "ru", "Serbo-Croatian": "sh", Serbian: "sr", Swedish: "sv",
  Tamil: "ta", Telugu: "te", Thai: "th", Tagalog: "tl", Tswana: "tn", Turkish: "tr",
};

/**
 * Fetch movies filtered by genre and/or language from backend.
 */
export async function fetchFilteredMovies(
  token: string,
  genre?: string,
  language?: string,
): Promise<MoviesResponse | null> {
  const params: string[] = [];
  // Backend supports single genre/language — use first selected
  if (genre) {
    const first = genre.split(",")[0].trim();
    if (first) params.push(`genre=${encodeURIComponent(first.toLowerCase())}`);
  }
  if (language) {
    const first = language.split(",")[0].trim();
    const code = LANG_TO_ISO[first] || first.toLowerCase().slice(0, 2);
    if (code) params.push(`language=${encodeURIComponent(code)}`);
  }
  if (params.length === 0) return null;
  try {
    const res = await fetch(proxyUrl(`/api/movies?${params.join("&")}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data: MoviesResponse = await res.json();
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch all movies from /api/movies/v2 — no filters, returns the full catalog.
 */
export async function fetchAllMovies(token: string): Promise<MoviesResponse | null> {
  try {
    const res = await fetch(proxyUrl("/api/movies/v2"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data: MoviesResponse = await res.json();
    await log("GET /api/movies/v2 — success", {
      count: data.count,
      top3: data.movies?.slice(0, 3).map((m) => m.movie_name),
    });
    return data;
  } catch (err) {
    await log("GET /api/movies/v2 — FAILED", { error: String(err) });
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

// 20 size levels (px dimensions for collision detection, aspect 1:1.4)
// Level 1 = 17px wide (area-continuous with biggest dust 24px circle)
// Level 20 = 54px wide
const ICON_SIZES: Record<number, { w: number; h: number }> = {
  1: { w: 17, h: 24 },
  2: { w: 18, h: 25 },
  3: { w: 20, h: 28 },
  4: { w: 22, h: 31 },
  5: { w: 24, h: 34 },
  6: { w: 26, h: 36 },
  7: { w: 28, h: 39 },
  8: { w: 30, h: 42 },
  9: { w: 32, h: 45 },
  10: { w: 34, h: 48 },
  11: { w: 36, h: 50 },
  12: { w: 38, h: 53 },
  13: { w: 40, h: 56 },
  14: { w: 42, h: 59 },
  15: { w: 44, h: 62 },
  16: { w: 46, h: 64 },
  17: { w: 48, h: 67 },
  18: { w: 50, h: 70 },
  19: { w: 52, h: 73 },
  20: { w: 54, h: 76 },
};

function getShowSize(priority: number): import("@/types").ShowSize {
  // Priority clusters around 66-96 (avg 74). Map that range to levels 1-10.
  // Below 60 → level 1, above 96 → level 10, linear in between.
  const clamped = Math.min(Math.max(priority, 60), 96);
  const normalized = (clamped - 60) / 36; // 0 to 1
  const level = Math.max(1, Math.ceil(normalized * 10)) as import("@/types").ShowSize;
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
  size: number; // 2-30px
  color: string;
  opacity: number;
  poster?: string; // poster thumbnail for large dust (priority >= 80)
}

export interface CoordBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  worldW: number;
  worldH: number;
  padding: number;
}

export interface ZoomLevelShows {
  z0: import("@/types").Show[];
  z1: import("@/types").Show[];
  z2: import("@/types").Show[];
  z3: import("@/types").Show[];
  dust: DustParticle[];
  dustZ0: DustParticle[];
  dustZ1: DustParticle[];
  dustZ2: DustParticle[];
  dustZ3: DustParticle[];
  bounds?: CoordBounds;
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
    "#4da6e0", "#45c9a0", "#e0a033", "#e06070", "#40cc70", "#e0c040", "#60b8d0",
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
      const colorIdx = (seed * 13 + i) % DUST_COLORS.length;
      const dustOpacity = 0.09 + ((seed % 20) / 100) * 0.6; // reduced 40%
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
  return { z0: z0Shows, z1: z1Shows, z2: z2Shows, z3: z2Shows, dust: dustParticles, dustZ0: dustParticles, dustZ1: dustParticles, dustZ2: dustParticles, dustZ3: dustParticles };
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
    poster: movie.image_link ? movie.image_link.replace("/w92/", "/w500/") : "",
    gradient: `linear-gradient(135deg, hsl(${(idx * 37) % 360}, 60%, 30%), hsl(${(idx * 37 + 60) % 360}, 50%, 20%))`,
    language: movie.language || "en",
    actors: movie.casts?.slice(0, 3) || [],
    tags: movie.keywords?.slice(0, 3) || [],
    watched: movie.is_watched,
    voteCount: movie.vote_count || 0,
  };
}

/**
 * Convert ALL movies from /api/movies/v2 into Show[] for a single unified space.
 * Normalizes raw x,y into the full 1600×2200 canvas. No genre regions.
 *
 * Dust logic (seamless pinch-zoom):
 * - z0 dust: movies with priority >= 50 that aren't z0 tiles (crystallize into z1 tiles)
 * - z1 dust: movies with priority >= 30 that aren't z1 tiles (crystallize into z2 tiles)
 * - z2 dust: remaining movies with priority >= 20 that aren't z2 tiles
 * Grid-based collision culling removes overlapping dust particles.
 */
export function backendMoviesToShowsV2(moviesResponse: MoviesResponse): ZoomLevelShows {
  const BASE_WORLD_W = 1600;
  const BASE_WORLD_H = 2200;
  const BASE_COUNT = 800; // full dataset ~800 tiles at z3
  const SHOWS_Z0 = 80;
  const SHOWS_Z1 = 200;
  const SHOWS_Z2 = 400;
  const SHOWS_Z3 = 800;
  const ZOOM_SCALE_1 = 3;
  const ZOOM_SCALE_2 = 7;
  const ZOOM_SCALE_3 = 14;
  const PADDING = 50;

  const movies = moviesResponse.movies || [];
  if (!movies.length) {
    return { z0: [], z1: [], z2: [], z3: [], dust: [], dustZ0: [], dustZ1: [], dustZ2: [], dustZ3: [] };
  }

  // Scale world size by sqrt of movie count ratio — fewer movies = smaller space
  const countRatio = Math.min(1, movies.length / BASE_COUNT);
  const scaleFactor = Math.max(0.3, Math.sqrt(countRatio)); // min 30% of full world
  const WORLD_W = Math.round(BASE_WORLD_W * scaleFactor);
  const WORLD_H = Math.round(BASE_WORLD_H * scaleFactor);

  // Grid cell sizes for dust collision culling — scale with world size
  const DUST_GRID_Z0 = Math.round(25 * scaleFactor);
  const DUST_GRID_Z1 = Math.round(15 * scaleFactor);
  const DUST_GRID_Z2 = Math.round(10 * scaleFactor);
  const DUST_GRID_Z3 = Math.max(3, Math.round(7 * scaleFactor));

  const DUST_COLORS = [
    "#4da6e0", "#45c9a0", "#e0a033", "#e06070", "#40cc70", "#e0c040", "#60b8d0",
  ];

  // Sort by priority descending
  const sorted = [...movies].sort((a, b) => b.priority - a.priority);

  // Normalize x,y to fill the canvas
  const allXs = sorted.map((m) => m.x);
  const allYs = sorted.map((m) => m.y);
  const minX = Math.min(...allXs);
  const maxX = Math.max(...allXs);
  const minY = Math.min(...allYs);
  const maxY = Math.max(...allYs);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  // Compute mean and stddev for priority to normalize tile sizes
  const priorities = sorted.map((m) => m.priority);
  const mean = priorities.reduce((a, b) => a + b, 0) / priorities.length;
  const variance = priorities.reduce((a, p) => a + (p - mean) ** 2, 0) / priorities.length;
  const stddev = Math.sqrt(variance) || 1;

  // Priority thresholds for dust visibility — z-score based, adaptive to data
  // z0: only above mean (top ~50%), z1: above mean-0.75σ (~77%), z2: above mean-1.75σ (~96%), z3: above mean-2.5σ (~99%)
  const DUST_THRESHOLD_Z0 = mean;
  const DUST_THRESHOLD_Z1 = mean - 0.75 * stddev;
  const DUST_THRESHOLD_Z2 = mean - 1.75 * stddev;
  const DUST_THRESHOLD_Z3 = mean - 2.5 * stddev;

  const positioned = sorted.map((movie, i) => {
    const relX = (movie.x - minX) / rangeX;
    const relY = (movie.y - minY) / rangeY;
    const worldX = PADDING + relX * (WORLD_W - 2 * PADDING);
    const worldY = PADDING + relY * (WORLD_H - 2 * PADDING);
    // Z-score normalization: map [-2σ, +2σ] → levels 1-20
    const zScore = (movie.priority - mean) / stddev;
    const normalized = (zScore + 2) / 4; // maps -2..+2 → 0..1
    const clamped = Math.min(Math.max(normalized, 0), 1);
    const size = Math.max(1, Math.ceil(clamped * 20)) as import("@/types").ShowSize;
    return { movie, relX, relY, worldX, worldY, size, idx: i };
  });

  // --- Z0 tiles ---
  const placedZ0: PlacedShow[] = [];
  const selectedZ0: { movie: Movie; relX: number; relY: number; worldX: number; worldY: number; size: import("@/types").ShowSize; idx: number; opacityPenalty: number }[] = [];
  const z0TileIdxs = new Set<number>();

  // Fill z0 slots from all positioned by priority order
  for (const p of positioned) {
    if (selectedZ0.length >= SHOWS_Z0) break;
    const result = resolveCollision(placedZ0, p.worldX, p.worldY, p.size);
    if (result) {
      const dims = ICON_SIZES[result.size];
      placedZ0.push({ worldX: p.worldX, worldY: p.worldY, w: dims.w, h: dims.h });
      selectedZ0.push({ ...p, size: result.size, opacityPenalty: result.opacityPenalty });
      z0TileIdxs.add(p.idx);
    }
  }

  // --- Z1 tiles ---
  const placedZ1: PlacedShow[] = [];
  const selectedZ1: typeof selectedZ0 = [];
  const z1TileIdxs = new Set<number>();
  for (const p of positioned) {
    if (selectedZ1.length >= SHOWS_Z1) break;
    const boostedSize = Math.max(4, p.size) as import("@/types").ShowSize;
    const dims = ICON_SIZES[boostedSize];
    const scaledW = dims.w / ZOOM_SCALE_1;
    const scaledH = dims.h / ZOOM_SCALE_1;
    let maxOverlap = 0;
    for (const placed of placedZ1) {
      const ratio = overlapRatio(placed, p.worldX, p.worldY, scaledW, scaledH);
      if (ratio > maxOverlap) maxOverlap = ratio;
    }
    if (maxOverlap <= 0.7) {
      const penalty = maxOverlap > 0.4 ? 0.3 : maxOverlap > 0.2 ? 0.15 : 0;
      const sizeReduction = maxOverlap > 0.4 ? 2 : maxOverlap > 0.2 ? 1 : 0;
      const newSize = Math.max(4, boostedSize - sizeReduction) as import("@/types").ShowSize;
      placedZ1.push({ worldX: p.worldX, worldY: p.worldY, w: scaledW, h: scaledH });
      selectedZ1.push({ ...p, size: newSize, opacityPenalty: penalty });
      z1TileIdxs.add(p.idx);
    }
  }

  // --- Z2 tiles ---
  const placedZ2: PlacedShow[] = [];
  const selectedZ2: typeof selectedZ0 = [];
  const z2TileIdxs = new Set<number>();
  for (const p of positioned) {
    if (selectedZ2.length >= SHOWS_Z2) break;
    const boostedSize2 = Math.max(9, p.size) as import("@/types").ShowSize;
    const dims = ICON_SIZES[boostedSize2];
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
      const newSize = Math.max(9, boostedSize2 - sizeReduction) as import("@/types").ShowSize;
      placedZ2.push({ worldX: p.worldX, worldY: p.worldY, w: scaledW, h: scaledH });
      selectedZ2.push({ ...p, size: newSize, opacityPenalty: penalty });
      z2TileIdxs.add(p.idx);
    }
  }

  // --- Z3 tiles ---
  const placedZ3: PlacedShow[] = [];
  const selectedZ3: typeof selectedZ0 = [];
  const z3TileIdxs = new Set<number>();
  for (const p of positioned) {
    if (selectedZ3.length >= SHOWS_Z3) break;
    const boostedSize3 = Math.max(12, p.size) as import("@/types").ShowSize;
    const dims3 = ICON_SIZES[boostedSize3];
    const scaledW = dims3.w / ZOOM_SCALE_3;
    const scaledH = dims3.h / ZOOM_SCALE_3;
    let maxOverlap = 0;
    for (const placed of placedZ3) {
      const ratio = overlapRatio(placed, p.worldX, p.worldY, scaledW, scaledH);
      if (ratio > maxOverlap) maxOverlap = ratio;
    }
    if (maxOverlap <= 0.7) {
      const penalty = maxOverlap > 0.4 ? 0.3 : maxOverlap > 0.2 ? 0.15 : 0;
      const sizeReduction = maxOverlap > 0.4 ? 2 : maxOverlap > 0.2 ? 1 : 0;
      const newSize = Math.max(12, boostedSize3 - sizeReduction) as import("@/types").ShowSize;
      placedZ3.push({ worldX: p.worldX, worldY: p.worldY, w: scaledW, h: scaledH });
      selectedZ3.push({ ...p, size: newSize, opacityPenalty: penalty });
      z3TileIdxs.add(p.idx);
    }
  }

  // Build Show objects
  const z0Shows = selectedZ0.map((p) => makeShowV2(p));
  const z1Shows = selectedZ1.map((p) => makeShowV2(p));
  const z2Shows = selectedZ2.map((p) => makeShowV2(p));
  const z3Shows = selectedZ3.map((p) => makeShowV2(p));

  // --- Dust generation with grid-based collision culling ---
  // Helper: generate dust for a zoom level, excluding tiles at that level
  function generateDust(
    tileIdxs: Set<number>,
    priorityThreshold: number,
    gridSize: number,
    zoomScale: number,
  ): DustParticle[] {
    const grid = new Map<string, { priority: number; particle: DustParticle }>();

    for (const p of positioned) {
      if (tileIdxs.has(p.idx)) continue; // skip tiles
      if (p.movie.priority < priorityThreshold) continue; // below threshold

      const worldX = p.worldX;
      const worldY = p.worldY;

      // Grid cell key — at higher zoom, effective grid is finer
      const cellX = Math.floor(worldX / (gridSize / zoomScale));
      const cellY = Math.floor(worldY / (gridSize / zoomScale));
      const key = `${cellX},${cellY}`;

      // Keep highest priority per cell
      if (grid.has(key) && grid.get(key)!.priority >= p.movie.priority) continue;

      // 12 dust sizes based on z-score: map [-2σ, +2σ] → sizes 2-30px
      const dustZ = (p.movie.priority - mean) / stddev;
      const dustNorm = Math.min(Math.max((dustZ + 2) / 4, 0), 1); // 0..1
      // 12 levels: 2, 4, 6, 8, 10, 12, 15, 18, 21, 24, 27, 30
      const DUST_SIZE_LEVELS = [2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 21, 24];
      const dustLevel = Math.min(11, Math.floor(dustNorm * 12));
      const dustSize = DUST_SIZE_LEVELS[dustLevel];

      // Opacity scales with z-score
      const dustOpacity = (0.12 + dustNorm * 0.65) * 0.6; // reduced 40%

      // Big dust (> +1.5σ) gets a poster thumbnail
      const poster = dustZ >= 1.5 && p.movie.image_link
        ? p.movie.image_link.replace("/w92/", "/w200/")
        : undefined;

      grid.set(key, {
        priority: p.movie.priority,
        particle: {
          id: `dust-${p.idx}`,
          worldX,
          worldY,
          size: dustSize,
          color: DUST_COLORS[(p.idx * 13 + 3) % DUST_COLORS.length],
          opacity: dustOpacity,
          poster,
        },
      });
    }

    return Array.from(grid.values()).map((v) => v.particle);
  }

  const dustZ0 = generateDust(z0TileIdxs, DUST_THRESHOLD_Z0, DUST_GRID_Z0, 1);
  const dustZ1 = generateDust(z1TileIdxs, DUST_THRESHOLD_Z1, DUST_GRID_Z1, ZOOM_SCALE_1);
  const dustZ2 = generateDust(z2TileIdxs, DUST_THRESHOLD_Z2, DUST_GRID_Z2, ZOOM_SCALE_2);
  const dustZ3 = generateDust(z3TileIdxs, DUST_THRESHOLD_Z3, DUST_GRID_Z3, ZOOM_SCALE_3);

  log(`V2 — Z0: ${z0Shows.length} tiles + ${dustZ0.length} dust, Z1: ${z1Shows.length} tiles + ${dustZ1.length} dust, Z2: ${z2Shows.length} tiles + ${dustZ2.length} dust, Z3: ${z3Shows.length} tiles + ${dustZ3.length} dust`);
  return { z0: z0Shows, z1: z1Shows, z2: z2Shows, z3: z3Shows, dust: dustZ0, dustZ0, dustZ1, dustZ2, dustZ3, bounds: { minX, maxX, minY, maxY, worldW: WORLD_W, worldH: WORLD_H, padding: PADDING } };
}

function makeShowV2(
  p: { movie: Movie; relX: number; relY: number; worldX: number; worldY: number; size: import("@/types").ShowSize; idx: number; opacityPenalty?: number },
): import("@/types").Show {
  const { movie, relX, relY, worldX, worldY, size, idx, opacityPenalty } = p;
  const genre = movie.genres?.[0] || "unknown";
  return {
    id: `movie-${idx}`,
    title: movie.movie_name,
    year: 2020,
    runtime: "2h",
    genres: genre,
    description: movie.synopsis || `Rating: ${movie.vote_average}/10`,
    match: Math.round(movie.priority),
    category: genre.toLowerCase(),
    relX,
    relY,
    worldX,
    worldY,
    size,
    opacityPenalty: opacityPenalty || 0,
    poster: movie.image_link ? movie.image_link.replace("/w92/", "/w500/") : "",
    gradient: `linear-gradient(135deg, hsl(${(idx * 37) % 360}, 60%, 30%), hsl(${(idx * 37 + 60) % 360}, 50%, 20%))`,
    language: movie.language || "en",
    actors: movie.casts?.slice(0, 3) || [],
    tags: movie.keywords?.slice(0, 3) || [],
    watched: movie.is_watched,
    voteCount: movie.vote_count || 0,
  };
}
