/**
 * Queue store — shows queued for "Send to TV".
 */

import { create } from "zustand";
import type { Show } from "@/types";

interface QueueState {
  items: Show[];
  add: (show: Show) => void;
  remove: (showId: string) => void;
  clear: () => void;
  has: (showId: string) => boolean;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],
  add: (show) => {
    if (get().items.some((s) => s.id === show.id)) return;
    set({ items: [...get().items, show] });
  },
  remove: (showId) => set({ items: get().items.filter((s) => s.id !== showId) }),
  clear: () => set({ items: [] }),
  has: (showId) => get().items.some((s) => s.id === showId),
}));
