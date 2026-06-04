package priority

import (
	"math"
	"sort"
)

// Compute applies the IMDb weighted rating formula to a movie catalog and
// returns a priority score in [0, 100] for each entry, in input order.
//
// Formula (Bayesian weighted rating):
//
//	raw = (v / (v + m)) * R + (m / (v + m)) * C
//
//	R = vote_average for this movie
//	v = vote_count  for this movie
//	C = mean vote_average across the catalog
//	m = 75th-percentile vote_count across the catalog
//
// Raw scores are min-max normalised to [0, 100], rounded to 2 decimal places.
// Returns nil for an empty input.
func Compute(voteAverages []float64, voteCounts []int) []float64 {
	n := len(voteAverages)
	if n == 0 {
		return nil
	}

	// C — mean vote_average across the catalog
	var sumR float64
	for _, r := range voteAverages {
		sumR += r
	}
	C := sumR / float64(n)

	// m — 75th percentile of vote_count across the catalog
	sortedCounts := make([]int, n)
	copy(sortedCounts, voteCounts)
	sort.Ints(sortedCounts)
	m := float64(percentile(sortedCounts, 75))

	// raw IMDb weighted ratings
	raw := make([]float64, n)
	for i := 0; i < n; i++ {
		v := float64(voteCounts[i])
		R := voteAverages[i]
		if v+m == 0 {
			raw[i] = C
			continue
		}
		raw[i] = (v/(v+m))*R + (m/(v+m))*C
	}

	// min-max normalise to [0, 100]
	minP, maxP := raw[0], raw[0]
	for _, p := range raw {
		if p < minP {
			minP = p
		}
		if p > maxP {
			maxP = p
		}
	}

	result := make([]float64, n)
	spread := maxP - minP
	for i, p := range raw {
		if spread == 0 {
			result[i] = 100
		} else {
			result[i] = math.Round(((p-minP)/spread*100)*100) / 100
		}
	}
	return result
}

// percentile returns the value at the given percentile (0–100) of a sorted slice.
func percentile(sorted []int, pct float64) int {
	if len(sorted) == 0 {
		return 0
	}
	idx := int(math.Ceil(pct/100*float64(len(sorted)))) - 1
	if idx < 0 {
		idx = 0
	}
	return sorted[idx]
}
