package auth

import (
	"encoding/json"
	"net/http"
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
// All fields are optional. Providing device_id links the account to ACR watch data.
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	// Validate genres only if provided
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
	json.NewEncoder(w).Encode(LoginResponse{UserID: userID, Token: token, DeviceID: req.DeviceID})
}
