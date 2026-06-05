package topgenres

// GenreWeight pairs a genre name with its computed priority weight.
type GenreWeight struct {
	Genre  string  `json:"genre"`
	Rank   int     `json:"rank"`
	Weight float64 `json:"weight"`
}

// TopGenresResponse is returned by GET /top-genres.
type TopGenresResponse struct {
	UserID int           `json:"user_id"`
	Genres []GenreWeight `json:"genres"`
}
