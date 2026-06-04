/**
 * Recommendation algorithms — similar, mood (category), wildcard.
 * Uses session metrics to personalize picks.
 */

import type { Show, CategoryKey, SessionMetrics } from "@/types";

export interface Recommendation {
  show: Show;
  type: "similar" | "mood" | "wildcard";
  reasoning: string;
}

/**
 * Get the user's top categories by dwell time + clicks.
 */
function getTopCategories(metrics: SessionMetrics): CategoryKey[] {
  const scores: Record<string, number> = {};

  // Dwell time weight
  for (const [key, ms] of Object.entries(metrics.categoryDwell)) {
    scores[key] = (scores[key] || 0) + ms / 1000;
  }

  // Click weight (heavier)
  for (const [key, count] of Object.entries(metrics.regionClicks)) {
    scores[key] = (scores[key] || 0) + count * 5;
  }

  // Show click category weight
  for (const click of metrics.showClicks) {
    scores[click.category] = (scores[click.category] || 0) + 3;
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key as CategoryKey);
}

/**
 * Get clicked show IDs to avoid recommending already-seen shows.
 */
function getClickedIds(metrics: SessionMetrics): Set<string> {
  return new Set(metrics.showClicks.map((c) => c.title));
}

/**
 * "SIMILAR TO YOU" — pick from the user's most-dwelled category,
 * preferring high-match shows they haven't clicked.
 */
function getSimilarRec(shows: Show[], metrics: SessionMetrics): Recommendation | null {
  const topCats = getTopCategories(metrics);
  const clickedTitles = getClickedIds(metrics);
  const targetCat = topCats[0] || "drama";

  const candidates = shows
    .filter((s) => s.category === targetCat && !clickedTitles.has(s.title))
    .sort((a, b) => b.match - a.match);

  if (candidates.length === 0) {
    const fallback = shows.filter((s) => s.category === targetCat).sort((a, b) => b.match - a.match);
    if (fallback.length === 0) return null;
    const pick = fallback[Math.floor(Math.random() * Math.min(3, fallback.length))];
    return { show: pick, type: "similar", reasoning: `Based on your interest in ${targetCat} shows` };
  }

  const pick = candidates[Math.floor(Math.random() * Math.min(5, candidates.length))];
  return {
    show: pick,
    type: "similar",
    reasoning: `You've been exploring ${targetCat} — this is a ${pick.match}% match`,
  };
}

/**
 * "YOUR CATEGORY" — pick from the category the user is currently in or
 * their second-most-dwelled category.
 */
function getMoodRec(shows: Show[], metrics: SessionMetrics): Recommendation | null {
  const topCats = getTopCategories(metrics);
  const clickedTitles = getClickedIds(metrics);
  const currentCat = metrics.currentCategory;
  const targetCat = currentCat || topCats[1] || topCats[0] || "action";

  const candidates = shows
    .filter((s) => s.category === targetCat && !clickedTitles.has(s.title))
    .sort((a, b) => b.match - a.match);

  if (candidates.length === 0) {
    const fallback = shows.filter((s) => s.category === targetCat).sort((a, b) => b.match - a.match);
    if (fallback.length === 0) return null;
    const pick = fallback[Math.floor(Math.random() * Math.min(3, fallback.length))];
    return { show: pick, type: "mood", reasoning: `A top pick from ${targetCat}` };
  }

  const pick = candidates[Math.floor(Math.random() * Math.min(5, candidates.length))];
  return {
    show: pick,
    type: "mood",
    reasoning: `Fits your current ${targetCat} mood — ${pick.match}% match`,
  };
}

/**
 * "WILDCARD" — pick from a random category the user hasn't explored much.
 * Encourages discovery.
 */
function getWildcardRec(shows: Show[], metrics: SessionMetrics): Recommendation | null {
  const topCats = getTopCategories(metrics);
  const clickedTitles = getClickedIds(metrics);

  // Find under-explored categories
  const allCats: CategoryKey[] = ["drama", "sci-fi", "comedy", "action", "thriller", "romance", "crime", "fantasy", "horror"];
  const unexplored = allCats.filter((c) => !topCats.slice(0, 3).includes(c));
  const targetCat = unexplored.length > 0
    ? unexplored[Math.floor(Math.random() * unexplored.length)]
    : allCats[Math.floor(Math.random() * allCats.length)];

  const candidates = shows
    .filter((s) => s.category === targetCat && !clickedTitles.has(s.title))
    .sort((a, b) => b.match - a.match);

  if (candidates.length === 0) {
    const fallback = shows.filter((s) => s.category === targetCat);
    if (fallback.length === 0) return null;
    const pick = fallback[Math.floor(Math.random() * Math.min(3, fallback.length))];
    return { show: pick, type: "wildcard", reasoning: `Something different from ${targetCat}` };
  }

  const pick = candidates[Math.floor(Math.random() * Math.min(5, candidates.length))];
  return {
    show: pick,
    type: "wildcard",
    reasoning: `Venture into ${targetCat} — you might love this!`,
  };
}

/**
 * Get 3 recommendations: similar, mood, wildcard.
 * Ensures no duplicates across the 3 picks.
 */
export function getRecommendations(shows: Show[], metrics: SessionMetrics): Recommendation[] {
  const recs: Recommendation[] = [];
  const usedIds = new Set<string>();

  const similar = getSimilarRec(shows, metrics);
  if (similar) {
    recs.push(similar);
    usedIds.add(similar.show.id);
  }

  // Filter out already-picked for mood
  const moodShows = shows.filter((s) => !usedIds.has(s.id));
  const mood = getMoodRec(moodShows, metrics);
  if (mood) {
    recs.push(mood);
    usedIds.add(mood.show.id);
  }

  // Filter out already-picked for wildcard
  const wildShows = shows.filter((s) => !usedIds.has(s.id));
  const wildcard = getWildcardRec(wildShows, metrics);
  if (wildcard) {
    recs.push(wildcard);
  }

  return recs;
}
