/**
 * Session metrics store — tracks user behavior for recommendations.
 */

import { create } from "zustand";
import type { CategoryKey, ShowClick, SessionMetrics } from "@/types";

interface SessionState extends SessionMetrics {
  trackCategoryDwell: (key: CategoryKey, ms: number) => void;
  trackShowClick: (click: ShowClick) => void;
  trackRegionClick: (key: CategoryKey) => void;
  trackGenreClick: (genre: string) => void;
  setCurrentCategory: (key: CategoryKey | null) => void;
  reset: () => void;
}

const initialState: SessionMetrics = {
  startTime: Date.now(),
  categoryDwell: {},
  showClicks: [],
  regionClicks: {},
  genreClicks: {},
  currentCategory: null,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialState,

  trackCategoryDwell: (key, ms) =>
    set({
      categoryDwell: {
        ...get().categoryDwell,
        [key]: (get().categoryDwell[key] || 0) + ms,
      },
    }),

  trackShowClick: (click) =>
    set({ showClicks: [...get().showClicks, click] }),

  trackRegionClick: (key) =>
    set({
      regionClicks: {
        ...get().regionClicks,
        [key]: (get().regionClicks[key] || 0) + 1,
      },
    }),

  trackGenreClick: (genre) =>
    set({
      genreClicks: {
        ...get().genreClicks,
        [genre]: (get().genreClicks[genre] || 0) + 1,
      },
    }),

  setCurrentCategory: (key) => set({ currentCategory: key }),

  reset: () => set({ ...initialState, startTime: Date.now() }),
}));
