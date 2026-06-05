package spacestitcher

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
)

const (
	D         = 300.0 // spacing between quadrant centres (quadrantWidth from data-consts)
	TotalSize = 900.0 // 3 × D — total stitched space dimension
)

// rankOffset maps genre rank (1–9) to the stitched space centre offset (dx, dy).
//
//	Grid:
//	  rank7(-D,+D)  rank4(0,+D)  rank6(+D,+D)
//	  rank3(-D, 0)  rank1(0, 0)  rank2(+D, 0)
//	  rank9(-D,-D)  rank5(0,-D)  rank8(+D,-D)
var rankOffset = [10][2]float64{
	{},       // index 0 — unused
	{0, 0},   // rank 1: centre       (top genre)
	{D, 0},   // rank 2: right
	{-D, 0},  // rank 3: left
	{0, D},   // rank 4: up
	{0, -D},  // rank 5: down
	{D, D},   // rank 6: top-right
	{-D, D},  // rank 7: top-left
	{D, -D},  // rank 8: bottom-right
	{-D, -D}, // rank 9: bottom-left
}

const genreDir = "./data-dirs/2D-space/genres"

// BuildStitchedSpace loads up to 9 of the user's top genres from disk and
// returns all their entries with stitched (x, y) coordinates applied.
func BuildStitchedSpace(topGenres []string) ([]StitchedEntry, error) {
	n := len(topGenres)
	if n > 9 {
		n = 9
	}

	var result []StitchedEntry
	for i := 0; i < n; i++ {
		rank := i + 1
		genre := topGenres[i]
		offset := rankOffset[rank]

		entries, err := loadGenre(genre)
		if err != nil {
			return nil, fmt.Errorf("load genre %q: %w", genre, err)
		}
		for _, e := range entries {
			result = append(result, StitchedEntry{
				ID:    e.ID,
				Title: e.Title,
				X:     e.X + offset[0],
				Y:     e.Y + offset[1],
				Genre: genre,
				Rank:  rank,
			})
		}
	}
	return result, nil
}

// loadGenre reads data-dirs/2D-space/genres/{genre}.json.
func loadGenre(genre string) ([]GenreEntry, error) {
	path := filepath.Join(genreDir, genre+".json")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var entries []GenreEntry
	return entries, json.Unmarshal(data, &entries)
}

// InViewport reports whether stitched point (tx, ty) falls within the viewport
// centred at (cx, cy) with half-widths l/2 and b/2, accounting for circular wrapping.
// Wrapping is checked by testing all 9 offset positions (±TotalSize in each axis).
func InViewport(tx, ty, cx, cy, l, b float64) bool {
	for _, dx := range [3]float64{-TotalSize, 0, TotalSize} {
		for _, dy := range [3]float64{-TotalSize, 0, TotalSize} {
			x := tx + dx
			y := ty + dy
			if x >= cx-l/2 && x <= cx+l/2 && y >= cy-b/2 && y <= cy+b/2 {
				return true
			}
		}
	}
	return false
}

// WrapCoord normalises a coordinate into [-TotalSize/2, TotalSize/2).
func WrapCoord(c float64) float64 {
	half := TotalSize / 2.0
	c = math.Mod(c+half, TotalSize)
	if c < 0 {
		c += TotalSize
	}
	return c - half
}
