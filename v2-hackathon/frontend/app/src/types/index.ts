export type ShowSize = "l" | "m" | "s" | "xs";

export type CategoryKey = string;

export interface Show {
  id: string;
  title: string;
  year: number;
  runtime: string;
  genres: string;
  description: string;
  match: number;
  category: CategoryKey;
  /** Relative X within category subregion (0–1) */
  relX: number;
  /** Relative Y within category subregion (0–1) */
  relY: number;
  /** Computed absolute world position — set by frontend */
  worldX: number;
  /** Computed absolute world position — set by frontend */
  worldY: number;
  size: ShowSize;
  poster: string;
  gradient: string;
  language: string;
  actors: string[];
  tags: string[];
  watched?: boolean;
}

export interface Category {
  key: CategoryKey;
  label: string;
  accent: string;
  /** Normalized position in world space (0–1) */
  position: { x: number; y: number; z: number };
}

export type Connection = [string, string];

// --- API response types ---

export interface APICategoryResponse {
  categories: Category[];
}

export interface APIShowsResponse {
  category: CategoryKey;
  shows: Omit<Show, "worldX" | "worldY">[];
}

export interface ShowClick {
  title: string;
  category: CategoryKey;
  genres: string;
  openedAt: number;
  closedAt: number;
  duration: number;
}

export interface SessionMetrics {
  startTime: number;
  categoryDwell: Record<string, number>;
  showClicks: ShowClick[];
  regionClicks: Record<string, number>;
  genreClicks: Record<string, number>;
  currentCategory: CategoryKey | null;
}
