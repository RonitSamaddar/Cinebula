import { Category, CategoryKey } from "@/types";

/**
 * Default 9 categories — will be replaced by backend response.
 * Positions are normalized (0–1) in world space.
 */
export const CATEGORIES: Category[] = [
  {
    key: "drama",
    label: "DRAMA · EMOTIONAL",
    accent: "#b56cff",
    position: { x: 0.50, y: 0.08, z: 0 },
  },
  {
    key: "sci-fi",
    label: "SCI-FI · MIND-BENDING",
    accent: "#6fa8e8",
    position: { x: 0.16, y: 0.24, z: 0 },
  },
  {
    key: "comedy",
    label: "COMEDY · LIGHT",
    accent: "#3fb89e",
    position: { x: 0.84, y: 0.24, z: 0 },
  },
  {
    key: "action",
    label: "ACTION · INTENSE",
    accent: "#ff9f43",
    position: { x: 0.50, y: 0.40, z: 0 },
  },
  {
    key: "thriller",
    label: "THRILLER · GRIPPING",
    accent: "#ff7a6c",
    position: { x: 0.18, y: 0.56, z: 0 },
  },
  {
    key: "romance",
    label: "ROMANCE · WARM",
    accent: "#e6b04a",
    position: { x: 0.82, y: 0.56, z: 0 },
  },
  {
    key: "crime",
    label: "CRIME · GRITTY",
    accent: "#7c8a99",
    position: { x: 0.38, y: 0.72, z: 0 },
  },
  {
    key: "fantasy",
    label: "FANTASY · EPIC",
    accent: "#e056a0",
    position: { x: 0.68, y: 0.72, z: 0 },
  },
  {
    key: "horror",
    label: "HORROR · DARK",
    accent: "#c44040",
    position: { x: 0.50, y: 0.90, z: 0 },
  },
];

export const CATEGORY_MAP: Record<CategoryKey, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
) as Record<CategoryKey, Category>;

export const CATEGORY_ACCENTS: Record<CategoryKey, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.accent])
) as Record<CategoryKey, string>;
