/**
 * Galaxy configuration — all tunable constants in one place.
 */

// World dimensions (px)
export const WORLD_W = 1600;
export const WORLD_H = 2200;

// Category layout
export const CATEGORY_COUNT = 9;
export const CATEGORY_SUBREGION_RADIUS = 450; // px radius per genre region

// Max shows visible on screen at any time (per tier)
export const MAX_SHOWS_BIG = 3;    // size 8-10
export const MAX_SHOWS_MED = 4;    // size 5-7
export const MAX_SHOWS_SMALL = 8;  // size 1-4
export const MAX_SHOWS_ON_SCREEN = MAX_SHOWS_BIG + MAX_SHOWS_MED + MAX_SHOWS_SMALL;

// Shows per region at each zoom level
export const SHOWS_PER_REGION_Z0 = 30;
export const SHOWS_PER_REGION_Z1 = 60;
export const SHOWS_PER_REGION_Z2 = 90;

// Zoom states — 3 discrete levels
export const ZOOM_LEVEL_0 = 1;   // galaxy overview
export const ZOOM_LEVEL_1 = 2.5; // mid zoom
export const ZOOM_LEVEL_2 = 5;   // deep zoom

// Show card sizes (px) — 10 levels based on priority, aspect 1:1.4
// Range: 10px (size 1) to 50px (size 10)
export const SHOW_SIZE_PX: Record<number, number> = {
  1: 13,
  2: 18,
  3: 23,
  4: 30,
  5: 36,
  6: 42,
  7: 48,
  8: 55,
  9: 60,
  10: 65,
};

// Icon collision dimensions (w × h at aspect ratio 1:1.4)
export const ICON_DIMS: Record<number, { w: number; h: number }> = {
  1: { w: 13, h: 17 },
  2: { w: 18, h: 25 },
  3: { w: 23, h: 33 },
  4: { w: 30, h: 42 },
  5: { w: 36, h: 49 },
  6: { w: 42, h: 57 },
  7: { w: 48, h: 68 },
  8: { w: 55, h: 77 },
  9: { w: 60, h: 83 },
  10: { w: 65, h: 92 },
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
