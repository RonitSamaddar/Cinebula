package main

import (
	"log"
	"net/http"

	"cinebula/backend/internal/auth"
	dataservice "cinebula/backend/internal/data-service"
	"cinebula/backend/internal/filter"
	"cinebula/backend/internal/logger"
	"cinebula/backend/internal/search"
	topgenres "cinebula/backend/internal/top-genres"
	"cinebula/backend/internal/user"
)

func main() {
	logger.Init()

	mux := http.NewServeMux()

	// Auth
	mux.HandleFunc("POST /auth/login", auth.LoginHandler)

	// Top genres — user's ranked genres with priority weights (JWT required)
	mux.Handle("GET /top-genres", auth.Middleware(http.HandlerFunc(topgenres.Handler)))

	// Movies — proxy to TKACR data service (genre / keyword / language / movie_name)
	mux.HandleFunc("GET /api/movies", dataservice.Handler)

	// Similar — proxy to TKACR similar endpoint (movie + optional k)
	mux.HandleFunc("GET /api/similar", dataservice.SimilarHandler)

	// Filters — available filter dimensions (genre, language, cast)
	mux.HandleFunc("GET /api/filters", filter.Handler)

	// Search — typo-tolerant title search via Meilisearch, returns stitched (x,y) coords (JWT required)
	mux.Handle("GET /search", auth.Middleware(http.HandlerFunc(search.Handler)))

	// User profile (JWT protected)
	mux.Handle("GET /user/profile", auth.Middleware(http.HandlerFunc(user.ProfileHandler)))

	logger.Log("Cinebula backend listening on :8080")
	if err := http.ListenAndServe(":8080", logger.Middleware(mux)); err != nil {
		log.Fatal(err)
	}
}
