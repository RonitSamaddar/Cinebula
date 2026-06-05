package dataservice

// Movie mirrors the movie object returned by the TKACR external API.
// x and y are the pre-computed 2D space coordinates for this title.
// Priority is computed by the priority module (IMDb weighted rating, normalised 0–100).
type Movie struct {
	MovieName   string   `json:"movie_name"`
	ImageLink   string   `json:"image_link"`
	VoteAverage float64  `json:"vote_average"`
	VoteCount   int      `json:"vote_count"`
	Revenue     int64    `json:"revenue"`
	Budget      int64    `json:"budget"`
	Popularity  float64  `json:"popularity"`
	Genres      []string `json:"genres"`
	Language    string   `json:"language"`
	ImdbRating  float64  `json:"imdb_rating"`
	Synopsis    string   `json:"synopsis"`
	Keywords    []string `json:"keywords"`
	Casts       []string `json:"casts"`
	X           float64  `json:"x"`
	Y           float64  `json:"y"`
	Priority    float64  `json:"priority"`
	IsWatched   bool     `json:"is_watched"`
}

// MoviesResponse mirrors the top-level response envelope from the TKACR API.
type MoviesResponse struct {
	Count  int     `json:"count"`
	Movies []Movie `json:"movies"`
}
