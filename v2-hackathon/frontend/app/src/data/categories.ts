import { Category, CategoryKey } from "@/types";

/**
 * 9 grid positions for category regions in world space.
 * Each top genre from backend gets assigned one position in order.
 */
export const CATEGORY_POSITIONS: { x: number; y: number; z: number }[] = [
  { x: 0.50, y: 0.08, z: 0 },
  { x: 0.16, y: 0.24, z: 0 },
  { x: 0.84, y: 0.24, z: 0 },
  { x: 0.50, y: 0.40, z: 0 },
  { x: 0.18, y: 0.56, z: 0 },
  { x: 0.82, y: 0.56, z: 0 },
  { x: 0.38, y: 0.72, z: 0 },
  { x: 0.68, y: 0.72, z: 0 },
  { x: 0.50, y: 0.90, z: 0 },
];

const ACCENT_COLORS = [
  "#b56cff", "#6fa8e8", "#3fb89e", "#ff9f43", "#ff7a6c",
  "#e6b04a", "#7c8a99", "#e056a0", "#c44040",
];

/**
 * Build categories dynamically from backend top genres.
 * Each genre gets a position from the grid and an accent color.
 */
export function buildCategories(genreNames: string[]): Category[] {
  return genreNames.slice(0, 9).map((genre, i) => ({
    key: genre.toLowerCase() as CategoryKey,
    label: genre.toUpperCase(),
    accent: ACCENT_COLORS[i % ACCENT_COLORS.length],
    position: CATEGORY_POSITIONS[i],
  }));
}

/** Fallback default categories (used before backend responds) */
export const CATEGORIES: Category[] = buildCategories([
  "Adventure", "Action", "Fantasy", "Sci-Fi", "Family",
  "Animation", "Comedy", "Western", "Drama",
]);

export const CATEGORY_MAP: Record<CategoryKey, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
) as Record<CategoryKey, Category>;

export const CATEGORY_ACCENTS: Record<CategoryKey, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.accent])
) as Record<CategoryKey, string>;
