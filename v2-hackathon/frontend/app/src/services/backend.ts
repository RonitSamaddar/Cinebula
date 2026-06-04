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
 * Convert backend movies into frontend Show[] mapped to galaxy positions.
 * Each top genre from backend IS a category — no mapping needed.
 * Uses actual x,y from backend as relative coordinates within each genre's region.
 * Normalizes x,y per genre to [0,1] range, then maps to world space.
 *
 * Two zoom states:
 * - Zoom-out: 5 shows per region (highest priority)
 * - Zoom-in (3x): 100 shows per region
 * We store up to 100 per region; the page controls which subset is visible.
 */
export function backendMoviesToShows(
  topGenres: GenreWeight[],
  moviesByGenre: Record<string, MoviesResponse>,
  categories: import("@/types").Category[],
): { zoomOutShows: import("@/types").Show[]; zoomInShows: import("@/types").Show[] } {
  const WORLD_W = 1400;
  const WORLD_H = 1800;
  const SUBREGION_RADIUS = 280;
  const SHOWS_PER_REGION_ZOOMOUT = 5;
  const SHOWS_PER_REGION_ZOOMIN = 100;

  const zoomOutShows: import("@/types").Show[] = [];
  const zoomInShows: import("@/types").Show[] = [];

  for (let gi = 0; gi < topGenres.length; gi++) {
    const g = topGenres[gi];
    const genreData = moviesByGenre[g.genre];
    if (!genreData?.movies?.length) continue;

    // Each genre IS a category — use the category at same index
    const catKey = g.genre.toLowerCase();
    const cat = categories.find((c) => c.key === catKey);
    if (!cat) continue;

    const cx = cat.position.x * WORLD_W;
    const cy = cat.position.y * WORLD_H;

    // Sort by priority descending
    const sorted = [...genreData.movies].sort((a, b) => b.priority - a.priority);
    // Cap at max for zoom-in
    const capped = sorted.slice(0, SHOWS_PER_REGION_ZOOMIN);

    // Compute x,y bounds for normalization within this genre's movies
    const xs = capped.map((m) => m.x);
    const ys = capped.map((m) => m.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    capped.forEach((movie, i) => {
      // Normalize backend x,y to [0,1] relative coords within this genre
      const relX = (movie.x - minX) / rangeX;
      const relY = (movie.y - minY) / rangeY;

      // Map to world space within category subregion
      const worldX = cx + (relX - 0.5) * 2 * SUBREGION_RADIUS;
      const worldY = cy + (relY - 0.5) * 2 * SUBREGION_RADIUS;

      // Determine size based on priority (0-100)
      let size: import("@/types").ShowSize = "xs";
      if (movie.priority > 80) size = "l";
      else if (movie.priority > 50) size = "m";
      else if (movie.priority > 30) size = "s";

      const show: import("@/types").Show = {
        id: `${catKey}-${i}`,
        title: movie.movie_name,
        year: 2020,
        runtime: "2h",
        genres: g.genre,
        description: movie.synopsis || `Rating: ${movie.vote_average}/10`,
        match: Math.round(movie.priority),
        category: catKey,
        relX,
        relY,
        worldX,
        worldY,
        size,
        poster: movie.image_link || "",
        gradient: `linear-gradient(135deg, hsl(${(i * 37) % 360}, 60%, 30%), hsl(${(i * 37 + 60) % 360}, 50%, 20%))`,
        language: movie.language || "en",
        actors: movie.casts?.slice(0, 3) || [],
        tags: movie.keywords?.slice(0, 3) || [],
        watched: movie.is_watched,
      };

      // Top 5 per region go into zoom-out set
      if (i < SHOWS_PER_REGION_ZOOMOUT) {
        zoomOutShows.push(show);
      }
      // All go into zoom-in set
      zoomInShows.push(show);
    });
  }

  log(`Converted shows: ${zoomOutShows.length} zoom-out, ${zoomInShows.length} zoom-in across ${topGenres.length} genres`);
  return { zoomOutShows, zoomInShows };
}
