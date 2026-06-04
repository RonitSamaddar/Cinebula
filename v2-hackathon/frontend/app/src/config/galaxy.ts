/**
 * Galaxy configuration — all tunable constants in one place.
 */

// World dimensions (px)
export const WORLD_W = 1400;
export const WORLD_H = 1800;

// Category layout
export const CATEGORY_COUNT = 9;
export const CATEGORY_SUBREGION_RADIUS = 280; // px radius around each category center

// Region = 9x screen size. Max 5 shows per screen bounds → 45 per region zoomed out
export const SHOWS_PER_SCREEN = 5;
export const REGION_SCREEN_MULTIPLE = 9;
export const SHOWS_ZOOMED_OUT = SHOWS_PER_SCREEN * REGION_SCREEN_MULTIPLE; // 45
export const SHOWS_ZOOMED_IN = 100; // shows visible when zoomed in

// Zoom states
export const ZOOM_OUT_SCALE = 1;
export const ZOOM_IN_SCALE = 3;

// Show card sizes (px) — 3 fixed sizes
export const SHOW_SIZE_PX: Record<string, number> = {
  l: 90,
  m: 70,
  s: 50,
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
