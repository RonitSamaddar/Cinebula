/**
 * Queue store — shows queued for "Send to TV".
 * Persists to localStorage so the TV mock page can read it.
 */

import { create } from "zustand";
import type { Show } from "@/types";

const LS_KEY = "cinebula-queue";

interface QueueState {
  items: Show[];
  add: (show: Show) => void;
  remove: (showId: string) => void;
  clear: () => void;
  has: (showId: string) => boolean;
}

function persist(items: Show[]) {
  const payload = items.map(s => ({
    id: s.id, title: s.title, poster: s.poster, match: s.match,
    genres: s.genres, year: s.year, runtime: s.runtime, description: s.description,
    category: s.category, language: s.language,
  }));
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch {}
  // POST to backend via Next.js proxy so it works from the phone
  fetch("/api/proxy?path=/api/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],
  add: (show) => {
    if (get().items.some((s) => s.id === show.id)) return;
    const next = [...get().items, show];
    set({ items: next });
    persist(next);
  },
  remove: (showId) => {
    const next = get().items.filter((s) => s.id !== showId);
    set({ items: next });
    persist(next);
  },
  clear: () => {
    set({ items: [] });
    persist([]);
  },
  has: (showId) => get().items.some((s) => s.id === showId),
}));
