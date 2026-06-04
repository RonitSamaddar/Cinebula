/**
 * Full-text search across shows — matches title, genres, description, actors, tags, language.
 */

import type { Show, CategoryKey } from "@/types";

export interface SearchFilters {
  query: string;
  genres: CategoryKey[];
  language: string;
  actor: string;
}

const EMPTY_FILTERS: SearchFilters = {
  query: "",
  genres: [],
  language: "",
  actor: "",
};

export function emptyFilters(): SearchFilters {
  return { ...EMPTY_FILTERS };
}

export function hasActiveFilters(f: SearchFilters): boolean {
  return f.query.trim() !== "" || f.genres.length > 0 || f.language !== "" || f.actor !== "";
}

/**
 * Search and filter shows. Returns matching subset.
 */
export function searchShows(shows: Show[], filters: SearchFilters): Show[] {
  let results = shows;

  // Genre filter
  if (filters.genres.length > 0) {
    results = results.filter((s) => filters.genres.includes(s.category));
  }

  // Language filter
  if (filters.language) {
    const lang = filters.language.toLowerCase();
    results = results.filter((s) => s.language.toLowerCase() === lang);
  }

  // Actor filter
  if (filters.actor.trim()) {
    const actorQ = filters.actor.trim().toLowerCase();
    results = results.filter((s) =>
      s.actors.some((a) => a.toLowerCase().includes(actorQ))
    );
  }

  // Full-text query
  if (filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    const terms = q.split(/\s+/);
    results = results.filter((show) => {
      const haystack = [
        show.title,
        show.genres,
        show.description,
        show.language,
        show.category,
        ...show.actors,
        ...show.tags,
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

  return results;
}

/**
 * Get unique languages from shows.
 */
export function getLanguages(shows: Show[]): string[] {
  const set = new Set<string>();
  for (const s of shows) {
    if (s.language) set.add(s.language);
  }
  return Array.from(set).sort();
}

/**
 * Get unique actors from shows.
 */
export function getActors(shows: Show[]): string[] {
  const set = new Set<string>();
  for (const s of shows) {
    for (const a of s.actors) set.add(a);
  }
  return Array.from(set).sort();
}

/**
 * Lay out search results in a spiral pattern centered on screen.
 * Returns shows with modified worldX/worldY.
 */
export function spiralLayout(shows: Show[], centerX: number, centerY: number): Show[] {
  const golden = (1 + Math.sqrt(5)) / 2;
  const spacing = 65; // px between items

  return shows.map((show, i) => {
    const theta = 2 * Math.PI * i / (golden * golden);
    const r = spacing * Math.sqrt(i + 1);
    return {
      ...show,
      worldX: centerX + Math.cos(theta) * r,
      worldY: centerY + Math.sin(theta) * r,
    };
  });
}
