package main

import (
	"log"
	"net/http"

	"cinebula/backend/internal/auth"
	"cinebula/backend/internal/search"
	spacestitcher "cinebula/backend/internal/space-stitcher"
	"cinebula/backend/internal/user"
)

func main() {
	mux := http.NewServeMux()

	// Auth
	mux.HandleFunc("POST /auth/login", auth.LoginHandler)

	// Space navigation
	mux.HandleFunc("GET /space/tile", spacestitcher.TileHandler)
	mux.HandleFunc("GET /top-spaces", spacestitcher.TopSpacesHandler)

	// Search (within user's 9 stitched spaces)
	mux.HandleFunc("GET /search", search.Handler)

	// User profile (JWT protected)
	mux.Handle("GET /user/profile", auth.Middleware(http.HandlerFunc(user.ProfileHandler)))

	log.Println("Cinebula backend listening on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
