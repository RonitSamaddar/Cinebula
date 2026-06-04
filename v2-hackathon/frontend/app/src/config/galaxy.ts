/**
 * Galaxy configuration — all tunable constants in one place.
 */

// World dimensions (px)
export const WORLD_W = 1400;
export const WORLD_H = 1800;

// Category layout
export const CATEGORY_COUNT = 9;
export const CATEGORY_SUBREGION_RADIUS = 280; // px radius around each category center

// Region = 9 × screen size total. At any time 1 screen is visible.
// Zoom-out: max 5 shows visible per screen → 5 per region shown
// Zoom-in: scale 3x, region has 100 content
export const SHOWS_PER_SCREEN_ZOOMOUT = 5; // max shows on one screen in zoom-out
export const SHOWS_PER_REGION_ZOOMOUT = SHOWS_PER_SCREEN_ZOOMOUT; // visible per region in zoom-out (since 1 region ≈ 1 screen)
export const SHOWS_PER_REGION_ZOOMIN = 100; // shows visible per region when zoomed in
export const ZOOM_IN_SCALE = 3; // zoom-in multiplier
export const ZOOM_OUT_SCALE = 1; // default zoom level

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
