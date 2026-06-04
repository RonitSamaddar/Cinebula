/**
 * Galaxy configuration — all tunable constants in one place.
 */

// World dimensions (px)
export const WORLD_W = 1600;
export const WORLD_H = 2200;

// Category layout
export const CATEGORY_COUNT = 9;
export const CATEGORY_SUBREGION_RADIUS = 200; // px radius per genre region

// Max shows visible on screen at any time (hard cap)
export const MAX_SHOWS_ON_SCREEN = 10;

// Shows per region at each zoom level
export const SHOWS_PER_REGION_Z0 = 30;
export const SHOWS_PER_REGION_Z1 = 60;
export const SHOWS_PER_REGION_Z2 = 90;

// Zoom states — 3 discrete levels
export const ZOOM_LEVEL_0 = 1;   // galaxy overview
export const ZOOM_LEVEL_1 = 2.5; // mid zoom
export const ZOOM_LEVEL_2 = 5;   // deep zoom

// Show card sizes (px) — 3 fixed sizes, same at all zoom levels
export const SHOW_SIZE_PX: Record<string, number> = {
  l: 90,
  m: 70,
  s: 50,
};

// Icon collision dimensions (w × h at aspect ratio 1:1.4)
export const ICON_DIMS: Record<string, { w: number; h: number }> = {
  l: { w: 90, h: 126 },
  m: { w: 70, h: 98 },
  s: { w: 50, h: 70 },
};

// Camera / physics
export const MOMENTUM_DECAY = 0.95;
export const VELOCITY_THRESHOLD = 0.1;

// Parallax multipliers
export const STAR_PARALLAX = 0.15;
export const NEBULA_PARALLAX = 0.12;

// Canvas tile sizes
export const STAR_CANVAS_W = 1600;
export const STAR_CANVAS_H = 2200;
export const NEBULA_CANVAS_W = 1400;
export const NEBULA_CANVAS_H = 1400;

// Glow
export const GLOW_DISTANCE_FACTOR = 0.00001;

// Effects
export const MAX_SHOOTING_STARS = 2;
export const TWINKLE_COUNT = 50;
export const DUST_COUNT = 20;
