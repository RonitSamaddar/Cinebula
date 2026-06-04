package user

import (
	"encoding/json"
	"net/http"

	"cinebula/backend/internal/auth"
)

// ProfileHandler handles GET /user/profile (JWT protected).
func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth.ContextKeyUserID).(int)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	u, err := GetByID(userID)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(u)
}
