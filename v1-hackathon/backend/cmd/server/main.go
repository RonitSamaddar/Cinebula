package main

import (
	"log"
	"net/http"

	"cinebula/backend/internal/auth"
	"cinebula/backend/internal/content"
	"cinebula/backend/internal/search"
	spacestitcher "cinebula/backend/internal/space-stitcher"
	"cinebula/backend/internal/user"
)

func main() {
	// Initialize content/cluster store
	if err := content.Init(); err != nil {
		log.Printf("WARNING: content.Init failed: %v (cluster search disabled)", err)
	}

	mux := http.NewServeMux()

	// Auth
	mux.HandleFunc("POST /auth/login", auth.LoginHandler)

	// Space navigation
	mux.HandleFunc("GET /space/tile", spacestitcher.TileHandler)
	mux.HandleFunc("GET /top-spaces", spacestitcher.TopSpacesHandler)

	// Search (within user's 9 stitched spaces)
	mux.HandleFunc("GET /search", search.Handler)

	// Content / cluster search
	mux.HandleFunc("GET /content/search", content.SearchHandler)
	mux.HandleFunc("GET /content/clusters", content.ClustersHandler)
	mux.HandleFunc("GET /content/direction", content.DirectionHandler)

	// User profile (JWT protected)
	mux.Handle("GET /user/profile", auth.Middleware(http.HandlerFunc(user.ProfileHandler)))

	log.Println("Cinebula backend listening on :8082")
	if err := http.ListenAndServe(":8082", mux); err != nil {
		log.Fatal(err)
	}
}
