package spacestitcher

// GenreEntry is one entry from a per-genre JSON file (data-dirs/2D-space/genres/{genre}.json).
type GenreEntry struct {
	ID    string  `json:"id"`
	Title string  `json:"title"`
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
}

// StitchedEntry is a GenreEntry with stitched coordinates applied for the 9-quadrant space.
type StitchedEntry struct {
	ID    string  `json:"id"`
	Title string  `json:"title"`
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Genre string  `json:"genre"`
	Rank  int     `json:"rank"`
}
