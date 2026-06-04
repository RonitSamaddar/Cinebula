package auth

import (
	"encoding/json"
	"net/http"
	"strings"
)

var validGenres = map[string]bool{
	"Action": true, "Adventure": true, "Animation": true,
	"Comedy": true, "Crime": true, "Documentary": true,
	"Drama": true, "Fantasy": true, "Horror": true,
	"Mystery": true, "Romance": true, "Sci-Fi": true,
	"Thriller": true, "Western": true, "Historical": true,
	"Musical": true, "Biographical": true, "Sports": true,
	"Family": true, "War": true,
}

// LoginHandler handles POST /auth/login.
// Body: { name, age, gender, top_genres[] (3-10) }
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Name) == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	if req.Age < 1 || req.Age > 120 {
		http.Error(w, "age must be between 1 and 120", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Gender) == "" {
		http.Error(w, "gender is required", http.StatusBadRequest)
		return
	}
	if len(req.TopGenres) < 3 || len(req.TopGenres) > 10 {
		http.Error(w, "top_genres must contain 3-10 genres", http.StatusBadRequest)
		return
	}
	for _, g := range req.TopGenres {
		if !validGenres[g] {
			http.Error(w, "unknown genre: "+g, http.StatusBadRequest)
			return
		}
	}

	userID, err := RegisterUser(req)
	if err != nil {
		http.Error(w, "failed to register user", http.StatusInternalServerError)
		return
	}

	token, err := IssueToken(userID, req.Name)
	if err != nil {
		http.Error(w, "failed to issue token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LoginResponse{UserID: userID, Token: token})
}
