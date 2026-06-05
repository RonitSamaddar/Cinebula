package filter

import (
	"encoding/json"
	"net/http"
	"os"
)

const dataConstsPath = "./data-dirs/data-consts.json"

// dataConsts holds only the fields we need from data-consts.json.
type dataConsts struct {
	Genres    []string `json:"genres"`
	Languages []string `json:"languages"`
	Cast      []string `json:"cast"`
}

// Handler handles GET /api/filters
//
// Returns the three filter dimensions (genre, language, cast) with their
// available values loaded from data-consts.json.
func Handler(w http.ResponseWriter, r *http.Request) {
	raw, err := os.ReadFile(dataConstsPath)
	if err != nil {
		http.Error(w, "failed to load filter data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var consts dataConsts
	if err := json.Unmarshal(raw, &consts); err != nil {
		http.Error(w, "failed to parse filter data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	resp := FiltersResponse{
		Filters: []FilterOption{
			{
				ID:     "genre",
				Label:  "Genre",
				Values: consts.Genres,
			},
			{
				ID:     "language",
				Label:  "Language",
				Values: consts.Languages,
			},
			{
				ID:     "cast",
				Label:  "Cast",
				Values: consts.Cast,
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
