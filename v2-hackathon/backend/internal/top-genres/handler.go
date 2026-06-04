package topgenres

import (
	"encoding/json"
	"net/http"
	"strconv"

	acrprocessor "cinebula/backend/internal/acr-data-processor"
)

// noACRUserIDs is the set of user IDs that have no ACR watch data.
// For these users /top-genres returns 422 Unprocessable Entity.
var noACRUserIDs = map[int]bool{
	100: true,
}

// Handler handles GET /top-genres?userId=N
//
// Returns the user's top-9 genres with priority weights.
// Weight is linearly normalised: rank 1 = 1.0, rank N = 1/N.
// The phone uses these weights and genre names to decide which genre spaces
// to fetch first via GET /api/movies?genre=<genre>.
func Handler(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.Atoi(r.URL.Query().Get("userId"))
	if err != nil || userID <= 0 {
		http.Error(w, "invalid userId", http.StatusBadRequest)
		return
	}

	if noACRUserIDs[userID] {
		http.Error(w, "no ACR data available for this user", http.StatusUnprocessableEntity)
		return
	}

	acr, err := acrprocessor.TopGenresForUser(userID)
	if err != nil {
		http.Error(w, "no ACR data available for this user: "+err.Error(), http.StatusUnprocessableEntity)
		return
	}

	n := len(acr)
	if n > 9 {
		n = 9
	}
	genres := make([]GenreWeight, n)
	for i := 0; i < n; i++ {
		genres[i] = GenreWeight{
			Genre:  acr[i].Genre,
			Rank:   i + 1,
			Weight: acr[i].Weight,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(TopGenresResponse{
		UserID: userID,
		Genres: genres,
	})
}
