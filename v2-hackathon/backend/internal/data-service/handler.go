package dataservice

import (
	"encoding/json"
	"net/http"
	"strings"

	"cinebula/backend/internal/priority"
)

// Handler handles GET /api/movies
//
// The phone can filter by any combination of the following query params:
//
//	genre      – genre name           e.g. ?genre=action
//	keyword    – keyword tag          e.g. ?keyword=heist
//	language   – ISO 639-1 code       e.g. ?language=en
//	movie_name – title substring      e.g. ?movie_name=inception
//
// All params are optional. Omitting all params returns the full catalog for
// the first call (top-genre space seeding). Params are forwarded verbatim to
// the upstream TKACR service; the response (including 2D x/y coordinates) is
// returned directly to the phone.
func Handler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	genre := strings.TrimSpace(q.Get("genre"))
	keyword := strings.TrimSpace(q.Get("keyword"))
	language := strings.TrimSpace(q.Get("language"))
	movieName := strings.TrimSpace(q.Get("movie_name"))

	result, err := Fetch(genre, keyword, language, movieName)
	if err != nil {
		http.Error(w, "upstream error: "+err.Error(), http.StatusBadGateway)
		return
	}

	// Compute priority scores (IMDb weighted rating, normalised 0–100)
	// using the catalog returned by this request as the scoring universe.
	if len(result.Movies) > 0 {
		avgs := make([]float64, len(result.Movies))
		counts := make([]int, len(result.Movies))
		for i, m := range result.Movies {
			avgs[i] = m.VoteAverage
			counts[i] = m.VoteCount
		}
		scores := priority.Compute(avgs, counts)
		for i := range result.Movies {
			result.Movies[i].Priority = scores[i]
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
