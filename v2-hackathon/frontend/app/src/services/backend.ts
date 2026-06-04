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
  vote_average: number;
  priority: number;
  x: number;
  y: number;
  is_watched: boolean;
  keywords?: string[];
  language?: string;
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

  // Step 4: Movies per top genre
  const moviesByGenre: Record<string, MoviesResponse> = {};
  for (const g of topGenres.slice(0, 5)) {
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
