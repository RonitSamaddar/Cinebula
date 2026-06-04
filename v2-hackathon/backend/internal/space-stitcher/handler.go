package spacestitcher

import (
	"encoding/json"
	"net/http"
	"strconv"

	"cinebula/backend/internal/user"
)

// TileHandler handles GET /space/tile?userId=N&cx=0&cy=0&l=300&b=300
//
// Returns all stitched entries whose coordinates fall within the viewport
// [cx-l/2, cx+l/2] × [cy-b/2, cy+b/2], with circular wrapping applied.
func TileHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	userID, err := strconv.Atoi(q.Get("userId"))
	if err != nil || userID <= 0 {
		http.Error(w, "invalid userId", http.StatusBadRequest)
		return
	}
	cx, _ := strconv.ParseFloat(q.Get("cx"), 64)
	cy, _ := strconv.ParseFloat(q.Get("cy"), 64)
	l, err := strconv.ParseFloat(q.Get("l"), 64)
	if err != nil || l <= 0 {
		http.Error(w, "l must be a positive number", http.StatusBadRequest)
		return
	}
	b, err := strconv.ParseFloat(q.Get("b"), 64)
	if err != nil || b <= 0 {
		http.Error(w, "b must be a positive number", http.StatusBadRequest)
		return
	}

	u, err := user.GetByID(userID)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	stitched, err := BuildStitchedSpace(u.TopGenres)
	if err != nil {
		http.Error(w, "failed to build space: "+err.Error(), http.StatusInternalServerError)
		return
	}

	result := make([]StitchedEntry, 0)
	for _, e := range stitched {
		if InViewport(e.X, e.Y, cx, cy, l, b) {
			result = append(result, e)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// TopSpacesHandler handles GET /top-spaces?userId=N
//
// Returns the full stitched 9-quadrant space for the user — all entries
// from their top-9 genre spaces with stitched coordinates applied.
func TopSpacesHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.Atoi(r.URL.Query().Get("userId"))
	if err != nil || userID <= 0 {
		http.Error(w, "invalid userId", http.StatusBadRequest)
		return
	}

	u, err := user.GetByID(userID)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	stitched, err := BuildStitchedSpace(u.TopGenres)
	if err != nil {
		http.Error(w, "failed to build space: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if stitched == nil {
		stitched = []StitchedEntry{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stitched)
}
