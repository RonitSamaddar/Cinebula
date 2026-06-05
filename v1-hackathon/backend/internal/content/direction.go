package content

import (
	"math"
	"sort"
	"strings"
)

// DirectionResult describes what the user will find in a given direction.
type DirectionResult struct {
	Direction string        `json:"direction"`
	Summary   string        `json:"summary"`
	TopTags   []ScoredTag   `json:"top_tags"`
	Movies    []ScoredMovie `json:"sample_movies"`
}

type ScoredTag struct {
	Tag   string  `json:"tag"`
	Score float64 `json:"score"`
}

type ScoredMovie struct {
	Title string  `json:"title"`
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Score float64 `json:"score"`
}

// directionVectors maps direction names to unit vectors (x, y).
// Note: "up" in screen space is negative y in math, but here we use
// the convention where y increases upward (as in the data space).
var directionVectors = map[string][2]float64{
	"up":         {0, 1},
	"down":       {0, -1},
	"left":       {-1, 0},
	"right":      {1, 0},
	"up-left":    {-0.7071, 0.7071},
	"up-right":   {0.7071, 0.7071},
	"down-left":  {-0.7071, -0.7071},
	"down-right": {0.7071, -0.7071},
}

// QueryDirection returns the top tags and sample movies found in a given
// direction from the user's current position.
//
// Parameters:
//   - userX, userY: current position in the normalized coordinate space
//   - direction: "up", "down", "left", "right", "up-left", "up-right", "down-left", "down-right"
//     OR an angle in degrees (0=right, 90=up, 180=left, 270=down)
//   - radius: how far to look (0 = use default of 60 units)
//   - topN: how many tags to return (0 = default 8)
func QueryDirection(userX, userY float64, direction string, radius float64, topN int) *DirectionResult {
	if store == nil {
		return nil
	}
	if radius <= 0 {
		radius = 60.0
	}
	if topN <= 0 {
		topN = 8
	}

	// Resolve direction to unit vector
	dirX, dirY := resolveDirection(direction)
	if dirX == 0 && dirY == 0 {
		return nil
	}

	// Gather all movies from all clusters with their scores
	type movieScore struct {
		title string
		x, y  float64
		score float64
	}
	var scored []movieScore

	for _, c := range store.Clusters {
		for _, m := range c.Movies {
			// Vector from user to movie
			dx := m.X - userX
			dy := m.Y - userY
			dist := math.Sqrt(dx*dx + dy*dy)

			if dist < 0.01 {
				continue // skip if movie is at exact same position
			}
			if dist > radius {
				continue // outside search radius
			}

			// Direction alignment: cosine of angle between direction vector and movie vector
			// cos(θ) = (dirX*dx + dirY*dy) / dist  (since dir is unit vector)
			cosAngle := (dirX*dx + dirY*dy) / dist

			// Only consider movies with positive alignment (in the forward cone)
			if cosAngle <= 0 {
				continue
			}

			// Use cos^2 for sharper directional focus (narrower cone weighting)
			dirWeight := cosAngle * cosAngle

			// Distance weight: closer movies matter more (inverse with smooth decay)
			distWeight := 1.0 / (1.0 + dist*0.1)

			score := dirWeight * distWeight

			if score > 0.001 {
				scored = append(scored, movieScore{
					title: m.Title,
					x:     m.X,
					y:     m.Y,
					score: score,
				})
			}
		}
	}

	if len(scored) == 0 {
		return &DirectionResult{
			Direction: direction,
			Summary:   "nothing notable in this direction",
			TopTags:   []ScoredTag{},
			Movies:    []ScoredMovie{},
		}
	}

	// Aggregate tag scores
	tagScores := make(map[string]float64)
	for _, ms := range scored {
		title := strings.ToLower(strings.TrimSpace(ms.title))
		tags := store.movieTags[title]
		for _, tag := range tags {
			tagScores[tag] += ms.score
		}
	}

	// Sort tags by score
	type tagEntry struct {
		tag   string
		score float64
	}
	tagList := make([]tagEntry, 0, len(tagScores))
	for t, s := range tagScores {
		tagList = append(tagList, tagEntry{t, s})
	}
	sort.Slice(tagList, func(i, j int) bool {
		return tagList[i].score > tagList[j].score
	})
	if len(tagList) > topN {
		tagList = tagList[:topN]
	}

	// Normalize scores relative to max
	maxScore := 0.0
	if len(tagList) > 0 {
		maxScore = tagList[0].score
	}
	resultTags := make([]ScoredTag, len(tagList))
	for i, t := range tagList {
		resultTags[i] = ScoredTag{
			Tag:   t.tag,
			Score: math.Round(t.score/maxScore*100) / 100,
		}
	}

	// Top 5 sample movies by score
	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})
	sampleCount := 5
	if len(scored) < sampleCount {
		sampleCount = len(scored)
	}
	sampleMovies := make([]ScoredMovie, sampleCount)
	for i := 0; i < sampleCount; i++ {
		sampleMovies[i] = ScoredMovie{
			Title: scored[i].title,
			X:     scored[i].x,
			Y:     scored[i].y,
			Score: math.Round(scored[i].score*1000) / 1000,
		}
	}

	// Build summary: top 2 keywords only
	summaryTags := make([]string, 0, 2)
	for i := 0; i < 2 && i < len(resultTags); i++ {
		summaryTags = append(summaryTags, resultTags[i].Tag)
	}
	summary := strings.Join(summaryTags, ", ")

	return &DirectionResult{
		Direction: direction,
		Summary:   summary,
		TopTags:   resultTags,
		Movies:    sampleMovies,
	}
}

// resolveDirection converts a direction string or angle to a unit vector.
func resolveDirection(dir string) (float64, float64) {
	dir = strings.ToLower(strings.TrimSpace(dir))

	// Check named directions
	if v, ok := directionVectors[dir]; ok {
		return v[0], v[1]
	}

	// Try parsing as angle in degrees (0=right, 90=up, counterclockwise)
	// Not using strconv to avoid import; parse manually
	angle := 0.0
	negative := false
	hasDigit := false
	for _, ch := range dir {
		if ch == '-' {
			negative = true
		} else if ch >= '0' && ch <= '9' {
			angle = angle*10 + float64(ch-'0')
			hasDigit = true
		} else if ch == '.' {
			// skip decimal for simplicity, integer degrees are fine
			break
		}
	}
	if !hasDigit {
		return 0, 0
	}
	if negative {
		angle = -angle
	}

	rad := angle * math.Pi / 180.0
	return math.Cos(rad), math.Sin(rad)
}
