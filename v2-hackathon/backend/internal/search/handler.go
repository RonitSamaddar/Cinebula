package search

import (
	"encoding/json"
	"net/http"
	"strings"
)

// Handler handles GET /search?q=<query>
//
// Returns typo-tolerant, ranked movie titles from Meilisearch.
func Handler(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		http.Error(w, "q is required", http.StatusBadRequest)
		return
	}

	matchedNames, err := SearchMovies(query, 50)
	if err != nil {
		http.Error(w, "search error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(matchedNames)
}
