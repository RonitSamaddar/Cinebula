package topgenres

import (
	"encoding/json"
	"math"
	"net/http"
	"os"
	"sort"
	"strconv"

	acrprocessor "cinebula/backend/internal/acr-data-processor"
	"cinebula/backend/internal/user"
)

const dataConstsPath = "./data-dirs/data-consts.json"

// Handler handles GET /top-genres
//
// Optional query params:
//   deviceId=<uuid>  — match against ACR data by device ID
//   userId=<int>     — look up user record; if the user has a device_id, use ACR data
//
// Resolution order:
//  1. If deviceId provided (or userId resolves to a user with a device_id) →
//     ACR lookup by device_id; fallback to case 2 on miss.
//  2. No device_id resolvable → top-9 from genreRankMatrix,
//     weights 1.0 (rank 1) … 0.2 (rank 9) in 0.1 steps.
func Handler(w http.ResponseWriter, r *http.Request) {
	deviceID := r.URL.Query().Get("deviceId")
	userID := 0
	if s := r.URL.Query().Get("userId"); s != "" {
		userID, _ = strconv.Atoi(s)
	}

	// Resolve device_id from the user record if not supplied directly.
	if deviceID == "" && userID > 0 {
		if u, err := user.GetByID(userID); err == nil {
			deviceID = u.DeviceID
		}
	}

	// Case 1/2: ACR lookup when we have a device_id.
	if deviceID != "" {
		acr, err := acrprocessor.TopGenresForDevice(deviceID)
		if err == nil && len(acr) > 0 {
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
			json.NewEncoder(w).Encode(TopGenresResponse{UserID: userID, Genres: genres})
			return
		}
	}

	// Fallback: genreRankMatrix top-9 with fixed descending weights.
	genres, err := fallbackGenres()
	if err != nil {
		http.Error(w, "failed to load genre data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(TopGenresResponse{UserID: userID, Genres: genres})
}

// fallbackGenres returns one representative genre per rank (1–9) from
// genreRankMatrix, picking the genre with the highest TMDB count within each
// rank tie-group. Weights are assigned linearly: rank 1 = 1.0, rank 9 = 0.2.
func fallbackGenres() ([]GenreWeight, error) {
	raw, err := os.ReadFile(dataConstsPath)
	if err != nil {
		return nil, err
	}
	var consts struct {
		GenreRankMatrix  map[string]int `json:"genreRankMatrix"`
		GenreCountMatrix map[string]int `json:"genreCountMatrix"`
	}
	if err := json.Unmarshal(raw, &consts); err != nil {
		return nil, err
	}

	// Group genres by rank.
	byRank := map[int][]string{}
	for genre, rank := range consts.GenreRankMatrix {
		byRank[rank] = append(byRank[rank], genre)
	}

	result := make([]GenreWeight, 0, 9)
	for rank := 1; rank <= 9; rank++ {
		candidates := byRank[rank]
		if len(candidates) == 0 {
			continue
		}
		// Pick genre with highest TMDB count; break ties alphabetically.
		sort.Slice(candidates, func(i, j int) bool {
			ci := consts.GenreCountMatrix[candidates[i]]
			cj := consts.GenreCountMatrix[candidates[j]]
			if ci != cj {
				return ci > cj
			}
			return candidates[i] < candidates[j]
		})
		weight := math.Round((1.0-float64(rank-1)*0.1)*10) / 10
		result = append(result, GenreWeight{
			Genre:  candidates[0],
			Rank:   rank,
			Weight: weight,
		})
	}

	return result, nil
}

