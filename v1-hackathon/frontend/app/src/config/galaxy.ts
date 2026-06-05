/**
 * Galaxy configuration — all tunable constants in one place.
 */

// World dimensions (px)
export const WORLD_W = 1400;
export const WORLD_H = 1800;

// Category layout
export const CATEGORY_COUNT = 9;
export const CATEGORY_SUBREGION_RADIUS = 280; // px radius around each category center

// Show counts
export const SHOWS_PER_CATEGORY = 50;
export const INITIAL_VISIBLE_PER_CATEGORY = 20; // loaded per category at galaxy zoom
export const ZOOMED_VISIBLE_PER_CATEGORY = 50; // loaded when zoomed into a category
export const MAX_ON_SCREEN = 10; // max show cards visible on screen at once

// Show card sizes (px)
export const SHOW_SIZE_PX: Record<string, number> = {
  l: 90,
  m: 70,
  s: 50,
  xs: 36,
};

// Camera / physics
export const MOMENTUM_DECAY = 0.95;
export const VELOCITY_THRESHOLD = 0.1;

// Parallax multipliers
export const STAR_PARALLAX = 0.15;
export const NEBULA_PARALLAX = 0.12;

// Canvas tile sizes
export const STAR_CANVAS_W = 1400;
export const STAR_CANVAS_H = 1800;
export const NEBULA_CANVAS_W = 1200;
export const NEBULA_CANVAS_H = 1200;

// Glow
export const GLOW_DISTANCE_FACTOR = 0.00001;

// Effects
export const MAX_SHOOTING_STARS = 2;
export const TWINKLE_COUNT = 50;
export const DUST_COUNT = 20;
