package search

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	spacestitcher "cinebula/backend/internal/space-stitcher"
	"cinebula/backend/internal/user"
)

// Handler handles GET /search?q=<query>&userId=N
//
// Performs a case-insensitive title search within the user's 9 stitched genre spaces
// and returns matching entries with their stitched (x, y) coordinates.
func Handler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	query := strings.TrimSpace(q.Get("q"))
	if query == "" {
		http.Error(w, "q is required", http.StatusBadRequest)
		return
	}
	userID, err := strconv.Atoi(q.Get("userId"))
	if err != nil || userID <= 0 {
		http.Error(w, "invalid userId", http.StatusBadRequest)
		return
	}

	u, err := user.GetByID(userID)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	stitched, err := spacestitcher.BuildStitchedSpace(u.TopGenres)
	if err != nil {
		http.Error(w, "failed to build space: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Collect matches, keeping only the lowest-rank (top genre) occurrence per content ID.
	// This means the user sees each title once; the coordinate points to their top genre for it.
	lq := strings.ToLower(query)
	best := map[string]spacestitcher.StitchedEntry{} // contentID → best entry
	for _, e := range stitched {
		if !strings.Contains(strings.ToLower(e.Title), lq) {
			continue
		}
		if existing, seen := best[e.ID]; !seen || e.Rank < existing.Rank {
			best[e.ID] = e
		}
	}
	results := make([]spacestitcher.StitchedEntry, 0, len(best))
	for _, e := range best {
		results = append(results, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}
