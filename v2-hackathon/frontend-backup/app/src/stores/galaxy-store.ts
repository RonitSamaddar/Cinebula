/**
 * Galaxy store — camera, categories, shows, zoom state.
 */

import { create } from "zustand";
import type { Category, CategoryKey, Show } from "@/types";
import { WORLD_W, WORLD_H, INITIAL_VISIBLE_PER_CATEGORY } from "@/config/galaxy";

interface GalaxyState {
  // Categories
  categories: Category[];
  setCategories: (cats: Category[]) => void;

  // Shows
  shows: Show[];
  visibleShows: Show[];
  setShows: (shows: Show[]) => void;

  // Visible count per category (increases on zoom)
  visiblePerCategory: number;
  setVisiblePerCategory: (n: number) => void;

  // Camera
  cameraX: number;
  cameraY: number;
  setCamera: (x: number, y: number) => void;

  // Current category (nearest to camera)
  currentCategory: CategoryKey | null;
  setCurrentCategory: (key: CategoryKey | null) => void;

  // Zoom
  isZoomed: boolean;
  zoomedCategory: CategoryKey | null;
  zoomIn: (key: CategoryKey) => void;
  zoomOut: () => void;

  // Loading
  isLoading: boolean;
  setLoading: (v: boolean) => void;
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  categories: [],
  setCategories: (cats) => set({ categories: cats }),

  shows: [],
  visibleShows: [],
  setShows: (shows) => {
    const n = get().visiblePerCategory;
    const counts: Record<string, number> = {};
    const visible = shows.filter((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
      return counts[s.category] <= n;
    });
    set({ shows, visibleShows: visible });
  },

  visiblePerCategory: INITIAL_VISIBLE_PER_CATEGORY,
  setVisiblePerCategory: (n) => {
    const shows = get().shows;
    const counts: Record<string, number> = {};
    const visible = shows.filter((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
      return counts[s.category] <= n;
    });
    set({ visiblePerCategory: n, visibleShows: visible });
  },

  cameraX: WORLD_W / 2,
  cameraY: WORLD_H / 2,
  setCamera: (x, y) => set({ cameraX: x, cameraY: y }),

  currentCategory: null,
  setCurrentCategory: (key) => set({ currentCategory: key }),

  isZoomed: false,
  zoomedCategory: null,
  zoomIn: (key) => set({ isZoomed: true, zoomedCategory: key }),
  zoomOut: () => set({ isZoomed: false, zoomedCategory: null }),

  isLoading: true,
  setLoading: (v) => set({ isLoading: v }),
}));
