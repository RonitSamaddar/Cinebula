/**
 * Recommendation algorithms — 4 picks based on priority and vote data.
 */

import type { Show, SessionMetrics } from "@/types";

export interface Recommendation {
  show: Show;
  type: "watched" | "trending" | "hidden-gem" | "wildcard";
  reasoning: string;
}

/**
 * Get 4 recommendations:
 * 1. Watched Pick — top priority with is_watched=true, else 3rd highest priority
 * 2. Trending — highest priority overall
 * 3. Hidden Gem — from top 20, the one with lowest voteCount
 * 4. Wildcard — the 100th priority movie (deep cut)
 */
export function getRecommendations(shows: Show[], _metrics: SessionMetrics): Recommendation[] {
  if (shows.length === 0) return [];

  // Sort all shows by priority (match) descending
  const sorted = [...shows].sort((a, b) => b.match - a.match);
  const recs: Recommendation[] = [];
  const usedIds = new Set<string>();

  // 1. Watched Pick — top priority with watched=true, else 3rd highest
  const watchedHighPriority = sorted.find((s) => s.watched);
  if (watchedHighPriority) {
    recs.push({
      show: watchedHighPriority,
      type: "watched",
      reasoning: "You've seen this — revisit a favorite",
    });
    usedIds.add(watchedHighPriority.id);
  } else {
    // Fall back to 3rd highest priority
    const fallback = sorted.filter((s) => !usedIds.has(s.id))[2];
    if (fallback) {
      recs.push({
        show: fallback,
        type: "watched",
        reasoning: "A top pick you might enjoy",
      });
      usedIds.add(fallback.id);
    }
  }

  // 2. Trending — highest priority overall
  const trending = sorted.find((s) => !usedIds.has(s.id));
  if (trending) {
    recs.push({
      show: trending,
      type: "trending",
      reasoning: "Highest rated in your galaxy",
    });
    usedIds.add(trending.id);
  }

  // 3. Hidden Gem — from top 20 by priority, pick the one with lowest voteCount
  const top20 = sorted.slice(0, 20).filter((s) => !usedIds.has(s.id));
  if (top20.length > 0) {
    const gem = top20.reduce((min, s) => (s.voteCount || 0) < (min.voteCount || 0) ? s : min, top20[0]);
    recs.push({
      show: gem,
      type: "hidden-gem",
      reasoning: "High quality, low exposure — a hidden gem",
    });
    usedIds.add(gem.id);
  }

  // 4. Wildcard — 100th priority movie (deep exploration)
  const remaining = sorted.filter((s) => !usedIds.has(s.id));
  const wildcardIdx = Math.min(99, remaining.length - 1);
  if (wildcardIdx >= 0) {
    const wildcard = remaining[wildcardIdx];
    recs.push({
      show: wildcard,
      type: "wildcard",
      reasoning: "A deep cut from the far reaches",
    });
  }

  return recs;
}
