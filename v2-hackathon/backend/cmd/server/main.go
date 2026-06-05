package main

import (
	"log"
	"net/http"

	"cinebula/backend/internal/auth"
	dataservice "cinebula/backend/internal/data-service"
	"cinebula/backend/internal/filter"
	"cinebula/backend/internal/logger"
	"cinebula/backend/internal/qr"
	"cinebula/backend/internal/queue"
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

	// Movies V2 — full catalog, no filters
	mux.HandleFunc("GET /api/movies/v2", dataservice.HandlerV2)

	// Similar — proxy to TKACR similar endpoint (movie + optional k)
	mux.HandleFunc("GET /api/similar", dataservice.SimilarHandler)

	// Filters — available filter dimensions (genre, language, cast)
	mux.HandleFunc("GET /api/filters", filter.Handler)

	// Search — typo-tolerant title search via Meilisearch, returns stitched (x,y) coords (JWT required)
	mux.Handle("GET /search", auth.Middleware(http.HandlerFunc(search.Handler)))

	// User profile (JWT protected)
	mux.Handle("GET /user/profile", auth.Middleware(http.HandlerFunc(user.ProfileHandler)))

	// Queue — phone sends queue, TV page reads it
	mux.HandleFunc("POST /api/queue", queue.PostHandler)
	mux.HandleFunc("GET /api/queue", queue.GetHandler)
	mux.HandleFunc("OPTIONS /api/queue", queue.PostHandler) // CORS preflight

	// QR — phone signals successful scan, TV checks connection status
	mux.HandleFunc("POST /api/qr", qr.PostHandler)
	mux.HandleFunc("GET /api/qr", qr.GetHandler)
	mux.HandleFunc("DELETE /api/qr", qr.DeleteHandler)
	mux.HandleFunc("OPTIONS /api/qr", qr.PostHandler) // CORS preflight

	logger.Log("Cinebula backend listening on :8080")
	if err := http.ListenAndServe(":8080", logger.Middleware(mux)); err != nil {
		log.Fatal(err)
	}
}
