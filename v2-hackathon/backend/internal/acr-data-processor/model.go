package acrprocessor

// ACRUser is one entry from data-dirs/ACR-data/acr-data.json.
type ACRUser struct {
	UserID   int          `json:"userId"`
	Sessions []ACRSession `json:"sessions"`
}

// ACRSession represents one viewing session.
type ACRSession struct {
	ShowGenres               []string `json:"show_genres"`
	SessionStartTimestampUTC string   `json:"session_start_timestamp_utc"`
	SessionEndTimestampUTC   string   `json:"session_end_timestamp_utc"`
}

// GenreWeight holds a genre and its watch-time-derived weight, normalised to [0, 1].
type GenreWeight struct {
	Genre  string
	Weight float64
}

// dataConsts mirrors the fields we need from data-dirs/data-consts.json.
type dataConsts struct {
	GenreWeightMatrix map[string]float64 `json:"genreWeightMatrix"`
}
