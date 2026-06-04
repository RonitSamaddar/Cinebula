/**
 * UI store — overlay states, menu, popups.
 */

import { create } from "zustand";

interface UIState {
  // Menu drawer
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;

  // Queue panel
  isQueueOpen: boolean;
  openQueue: () => void;
  closeQueue: () => void;

  // Detail popup
  selectedShowId: string | null;
  selectShow: (id: string | null) => void;

  // Rec dialog
  isRecOpen: boolean;
  openRec: () => void;
  closeRec: () => void;

  // Audio
  isAudioOn: boolean;
  toggleAudio: () => void;

  // Any overlay open? (suppresses alien bubbles etc.)
  hasOverlay: () => boolean;
}

export const useUIStore = create<UIState>((set, get) => ({
  isMenuOpen: false,
  openMenu: () => set({ isMenuOpen: true }),
  closeMenu: () => set({ isMenuOpen: false }),
  toggleMenu: () => set({ isMenuOpen: !get().isMenuOpen }),

  isQueueOpen: false,
  openQueue: () => set({ isQueueOpen: true }),
  closeQueue: () => set({ isQueueOpen: false }),

  selectedShowId: null,
  selectShow: (id) => set({ selectedShowId: id }),

  isRecOpen: false,
  openRec: () => set({ isRecOpen: true }),
  closeRec: () => set({ isRecOpen: false }),

  isAudioOn: false,
  toggleAudio: () => set({ isAudioOn: !get().isAudioOn }),

  hasOverlay: () => {
    const s = get();
    return s.isMenuOpen || s.isQueueOpen || s.isRecOpen || s.selectedShowId !== null;
  },
}));
