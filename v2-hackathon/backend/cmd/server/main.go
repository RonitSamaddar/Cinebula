package main

import (
	"log"
	"net/http"

	"cinebula/backend/internal/auth"
	dataservice "cinebula/backend/internal/data-service"
	topgenres "cinebula/backend/internal/top-genres"
	"cinebula/backend/internal/user"
)

func main() {
	mux := http.NewServeMux()

	// Auth
	mux.HandleFunc("POST /auth/login", auth.LoginHandler)

	// Top genres — user's ranked genres with priority weights
	mux.HandleFunc("GET /top-genres", topgenres.Handler)

	// Movies — proxy to TKACR data service (genre / keyword / language / movie_name)
	mux.HandleFunc("GET /api/movies", dataservice.Handler)

	// User profile (JWT protected)
	mux.Handle("GET /user/profile", auth.Middleware(http.HandlerFunc(user.ProfileHandler)))

	log.Println("Cinebula backend listening on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
