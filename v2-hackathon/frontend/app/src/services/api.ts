/**
 * API service layer — currently returns mock data.
 * Swap implementations to real fetch() calls when backend is ready.
 */

import type { Category, CategoryKey, Show } from "@/types";
import { CATEGORIES } from "@/data/categories";
import { MOCK_SHOWS_BY_CATEGORY } from "@/data/shows";
import {
  WORLD_W,
  WORLD_H,
  CATEGORY_SUBREGION_RADIUS,
  INITIAL_VISIBLE_PER_CATEGORY,
  SHOWS_PER_CATEGORY,
} from "@/config/galaxy";

// --- Backend base URL (swap when ready) ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

// --- Autocomplete data (swap to real API when ready) ---

export async function fetchActors(): Promise<string[]> {
  // TODO: replace with real API call
  // const res = await fetch(`${API_BASE}/api/actors`);
  // return res.json();
  return [];
}

export async function fetchLanguages(): Promise<string[]> {
  // TODO: replace with real API call
  // const res = await fetch(`${API_BASE}/api/languages`);
  // return res.json();
  return [];
}

// --- Category fetching ---

export async function fetchCategories(): Promise<Category[]> {
  // TODO: replace with real API call
  // const res = await fetch(`${API_BASE}/api/categories`);
  // const data: APICategoryResponse = await res.json();
  // return data.categories;
  return CATEGORIES;
}

// --- Show fetching ---

/**
 * Fetch shows for a single category.
 * Returns shows with worldX/worldY computed from relX/relY + category position.
 */
export async function fetchShowsByCategory(
  categoryKey: CategoryKey,
  categories: Category[],
  limit?: number,
): Promise<Show[]> {
  // TODO: replace with real API call
  // const res = await fetch(`${API_BASE}/api/shows?category=${categoryKey}&limit=${limit}`);
  // const data: APIShowsResponse = await res.json();
  // const rawShows = data.shows;
  const rawShows = MOCK_SHOWS_BY_CATEGORY[categoryKey] ?? [];

  const cat = categories.find((c) => c.key === categoryKey);
  if (!cat) return [];

  const sliced = limit ? rawShows.slice(0, limit) : rawShows;
  return mapShowsToWorld(sliced, cat);
}

/**
 * Fetch initial visible shows for all categories.
 */
export async function fetchAllInitialShows(
  categories: Category[],
): Promise<Show[]> {
  const results = await Promise.all(
    categories.map((cat) =>
      fetchShowsByCategory(cat.key, categories, INITIAL_VISIBLE_PER_CATEGORY)
    ),
  );
  return results.flat();
}

/**
 * Fetch ALL shows for all categories (used when zoomed in).
 */
export async function fetchAllZoomedShows(
  categories: Category[],
): Promise<Show[]> {
  const results = await Promise.all(
    categories.map((cat) =>
      fetchShowsByCategory(cat.key, categories, SHOWS_PER_CATEGORY)
    ),
  );
  return results.flat();
}

/**
 * Map shows with relative coords to absolute world positions.
 * relX/relY (0–1) → offset from category center within subregion radius.
 */
function mapShowsToWorld(
  shows: Omit<Show, "worldX" | "worldY">[],
  category: Category,
): Show[] {
  const cx = category.position.x * WORLD_W;
  const cy = category.position.y * WORLD_H;
  const r = CATEGORY_SUBREGION_RADIUS;

  return shows.map((show) => ({
    ...show,
    worldX: cx + (show.relX - 0.5) * 2 * r,
    worldY: cy + (show.relY - 0.5) * 2 * r,
  }));
}
