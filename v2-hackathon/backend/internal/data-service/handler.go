package dataservice

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	acrprocessor "cinebula/backend/internal/acr-data-processor"
	"cinebula/backend/internal/auth"
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

	cacheKey := "movies:" + genre + ":" + keyword + ":" + language + ":" + movieName

	var result *MoviesResponse
	if cached, ok := cacheGet(cacheKey); ok {
		result = cached
	} else {
		var err error
		result, err = Fetch(genre, keyword, language, movieName)
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

		cacheSet(cacheKey, result)
	}

	// Copy movies slice so is_watched annotation doesn't mutate the cache.
	movies := make([]Movie, len(result.Movies))
	copy(movies, result.Movies)

	// Enrich is_watched from ACR data if a valid JWT is present.
	if authHeader := r.Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if claims, err := auth.ParseToken(tokenStr); err == nil {
			if watched, err := acrprocessor.WatchedTitlesForUser(claims.UserID); err == nil && len(watched) > 0 {
				for i, m := range movies {
					if watched[strings.ToLower(strings.TrimSpace(m.MovieName))] {
						movies[i].IsWatched = true
					}
				}
			}
		}
	}

	out := &MoviesResponse{Count: result.Count, Movies: movies}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

// HandlerV2 handles GET /api/movies/v2
// Returns the full movie catalog with no filters. Proxies to TKACR /api/movies
// with no query params. Computes priority and enriches is_watched like Handler.
func HandlerV2(w http.ResponseWriter, r *http.Request) {
	cacheKey := "movies-v2"

	var result *MoviesResponse
	if cached, ok := cacheGet(cacheKey); ok {
		result = cached
	} else {
		var err error
		result, err = Fetch("", "", "", "")
		if err != nil {
			http.Error(w, "upstream error: "+err.Error(), http.StatusBadGateway)
			return
		}

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

		cacheSet(cacheKey, result)
	}

	// Copy movies slice so is_watched annotation doesn't mutate the cache.
	movies := make([]Movie, len(result.Movies))
	copy(movies, result.Movies)

	if authHeader := r.Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if claims, err := auth.ParseToken(tokenStr); err == nil {
			if watched, err := acrprocessor.WatchedTitlesForUser(claims.UserID); err == nil && len(watched) > 0 {
				for i, m := range movies {
					if watched[strings.ToLower(strings.TrimSpace(m.MovieName))] {
						movies[i].IsWatched = true
					}
				}
			}
		}
	}

	out := &MoviesResponse{Count: result.Count, Movies: movies}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

// SimilarHandler handles GET /api/similar
//
// Required query param:
//
//	movie – title to find similar movies for, e.g. ?movie=Inception
//
// Optional query param:
//
//	k – max results to return (default: upstream decides)
//
// If a valid JWT is present in the Authorization header, each movie in the
// response is annotated with is_watched=true/false from ACR data.
func SimilarHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	movie := strings.TrimSpace(q.Get("movie"))
	if movie == "" {
		http.Error(w, "movie is required", http.StatusBadRequest)
		return
	}

	k := 0
	if kStr := strings.TrimSpace(q.Get("k")); kStr != "" {
		if v, err := strconv.Atoi(kStr); err == nil && v > 0 {
			k = v
		}
	}

	cacheKey := "similar:" + strings.ToLower(movie) + ":" + strconv.Itoa(k)

	var result *MoviesResponse
	if cached, ok := cacheGet(cacheKey); ok {
		result = cached
	} else {
		var err error
		result, err = FetchSimilar(movie, k)
		if err != nil {
			http.Error(w, "upstream error: "+err.Error(), http.StatusBadGateway)
			return
		}

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

		cacheSet(cacheKey, result)
	}

	// Copy movies slice so is_watched annotation doesn't mutate the cache.
	movies := make([]Movie, len(result.Movies))
	copy(movies, result.Movies)

	if authHeader := r.Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if claims, err := auth.ParseToken(tokenStr); err == nil {
			if watched, err := acrprocessor.WatchedTitlesForUser(claims.UserID); err == nil && len(watched) > 0 {
				for i, m := range movies {
					if watched[strings.ToLower(strings.TrimSpace(m.MovieName))] {
						movies[i].IsWatched = true
					}
				}
			}
		}
	}

	out := &MoviesResponse{Count: result.Count, Movies: movies}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}
