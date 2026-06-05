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

// Show card sizes (px) — 20 levels based on priority, aspect 1:1.4
// Level 1 = 17px (area-continuous with biggest dust 24px circle)
// Level 20 = 54px
export const SHOW_SIZE_PX: Record<number, number> = {
  1: 17,
  2: 18,
  3: 20,
  4: 22,
  5: 24,
  6: 26,
  7: 28,
  8: 30,
  9: 32,
  10: 34,
  11: 36,
  12: 38,
  13: 40,
  14: 42,
  15: 44,
  16: 46,
  17: 48,
  18: 50,
  19: 52,
  20: 54,
};

// Icon collision dimensions (w × h at aspect ratio 1:1.4)
// 20 levels: Level 1 = 17×24, Level 20 = 54×76
export const ICON_DIMS: Record<number, { w: number; h: number }> = {
  1: { w: 17, h: 24 },
  2: { w: 18, h: 25 },
  3: { w: 20, h: 28 },
  4: { w: 22, h: 31 },
  5: { w: 24, h: 34 },
  6: { w: 26, h: 36 },
  7: { w: 28, h: 39 },
  8: { w: 30, h: 42 },
  9: { w: 32, h: 45 },
  10: { w: 34, h: 48 },
  11: { w: 36, h: 50 },
  12: { w: 38, h: 53 },
  13: { w: 40, h: 56 },
  14: { w: 42, h: 59 },
  15: { w: 44, h: 62 },
  16: { w: 46, h: 64 },
  17: { w: 48, h: 67 },
  18: { w: 50, h: 70 },
  19: { w: 52, h: 73 },
  20: { w: 54, h: 76 },
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
