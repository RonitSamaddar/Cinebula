package content

import (
	"encoding/json"
	"math"
	"os"
	"strings"
)

const clustersPath = "./data-dirs/global-data/clusters.json"
const moviesPath = "./data-dirs/global-data/movies_enriched.json"

// Cluster represents a movie cluster with centroid and metadata.
type Cluster struct {
	ClusterID  int                `json:"cluster_id"`
	Name       string             `json:"name"`
	CentroidX  float64            `json:"centroid_x"`
	CentroidY  float64            `json:"centroid_y"`
	MovieCount int                `json:"movie_count"`
	Genres     map[string]float64 `json:"genres"`
	TopTags    []string           `json:"top_tags"`
	Movies     []ClusterMovie     `json:"movies"`
}

type ClusterMovie struct {
	Title string  `json:"title"`
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
}

// MovieEntry from enriched movie data (for tag lookup).
type MovieEntry struct {
	MovieName string   `json:"movie_name"`
	Genres    []string `json:"genres"`
	Keywords  []string `json:"keywords"`
}

// ClusterStore holds loaded cluster data for queries.
type ClusterStore struct {
	Clusters []Cluster
	// movieTags maps lowercase movie title -> normalized tags
	movieTags map[string][]string
	// clusterTagCounts maps cluster_id -> tag -> count
	clusterTagCounts map[int]map[string]int
}

var store *ClusterStore

// Init loads cluster data. Call once at startup.
func Init() error {
	data, err := os.ReadFile(clustersPath)
	if err != nil {
		return err
	}
	var clusters []Cluster
	if err := json.Unmarshal(data, &clusters); err != nil {
		return err
	}

	s := &ClusterStore{
		Clusters:         clusters,
		movieTags:        make(map[string][]string),
		clusterTagCounts: make(map[int]map[string]int),
	}

	// Load enriched movie data for tag searching
	if mdata, err := os.ReadFile(moviesPath); err == nil {
		var movies []MovieEntry
		if json.Unmarshal(mdata, &movies) == nil {
			for _, m := range movies {
				name := strings.ToLower(strings.TrimSpace(m.MovieName))
				tags := make([]string, 0, len(m.Keywords))
				for _, k := range m.Keywords {
					tags = append(tags, normalizeTag(k))
				}
				s.movieTags[name] = tags
			}
		}
	}

	// Build per-cluster tag counts
	for i := range clusters {
		c := &clusters[i]
		tagCounts := make(map[string]int)
		for _, m := range c.Movies {
			title := strings.ToLower(strings.TrimSpace(m.Title))
			for _, tag := range s.movieTags[title] {
				tagCounts[tag]++
			}
		}
		s.clusterTagCounts[c.ClusterID] = tagCounts
	}

	store = s
	return nil
}

func normalizeTag(tag string) string {
	t := strings.ToLower(tag)
	t = strings.ReplaceAll(t, "-", " ")
	t = strings.ReplaceAll(t, "_", " ")
	// collapse whitespace
	parts := strings.Fields(t)
	return strings.Join(parts, " ")
}

// QueryResult is a single cluster match from a search query.
type QueryResult struct {
	ClusterID   int            `json:"cluster_id"`
	ClusterName string         `json:"cluster_name"`
	CentroidX   float64        `json:"centroid_x"`
	CentroidY   float64        `json:"centroid_y"`
	Score       float64        `json:"score"`
	Count       int            `json:"count"`
	Movies      []ClusterMovie `json:"movies"`
}

// Query searches clusters by genres and/or tags, returns top N results.
func Query(genres []string, tags []string, n int, maxPerCluster int) []QueryResult {
	if store == nil {
		return nil
	}
	if n <= 0 {
		n = 15
	}
	if maxPerCluster <= 0 {
		maxPerCluster = 20
	}

	// Normalize inputs
	normGenres := make([]string, 0, len(genres))
	for _, g := range genres {
		g = strings.TrimSpace(strings.ToLower(g))
		if g != "" {
			normGenres = append(normGenres, g)
		}
	}
	normTags := make([]string, 0, len(tags))
	for _, t := range tags {
		t = normalizeTag(t)
		if t != "" {
			normTags = append(normTags, t)
		}
	}

	type scored struct {
		idx   int
		score float64
	}
	var results []scored

	for i, c := range store.Clusters {
		if c.MovieCount == 0 {
			continue
		}

		// Genre score: fraction of cluster's genre-tagged movies matching query genres
		genreScore := 0.0
		if len(normGenres) > 0 {
			totalGenreMovies := 0.0
			for _, cnt := range c.Genres {
				totalGenreMovies += cnt
			}
			if totalGenreMovies > 0 {
				matchedGenres := 0.0
				for _, g := range normGenres {
					if cnt, ok := c.Genres[g]; ok {
						matchedGenres += cnt
					}
				}
				genreScore = matchedGenres / totalGenreMovies
			}
		}

		// Tag score: fraction of cluster movies matching any query tag
		tagScore := 0.0
		if len(normTags) > 0 {
			tagCounts := store.clusterTagCounts[c.ClusterID]
			hits := 0
			for _, t := range normTags {
				if cnt, ok := tagCounts[t]; ok {
					hits += cnt
				}
			}
			tagScore = float64(hits) / float64(c.MovieCount)
			if tagScore > 1.0 {
				tagScore = 1.0
			}
		}

		// Coverage: how many query genres are present at all
		coverage := 0.0
		if len(normGenres) > 0 {
			present := 0
			for _, g := range normGenres {
				if _, ok := c.Genres[g]; ok {
					present++
				}
			}
			coverage = float64(present) / float64(len(normGenres))
		}

		// Combined scoring
		var score float64
		if len(normGenres) > 0 && len(normTags) > 0 {
			score = 0.4*genreScore + 0.4*tagScore + 0.2*coverage
		} else if len(normGenres) > 0 {
			score = 0.7*genreScore + 0.3*coverage
		} else if len(normTags) > 0 {
			score = tagScore
		}

		if score > 0 {
			results = append(results, scored{idx: i, score: score})
		}
	}

	// Sort by score descending
	for i := 0; i < len(results)-1; i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].score > results[i].score {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	if len(results) > n {
		results = results[:n]
	}

	output := make([]QueryResult, len(results))
	for i, r := range results {
		c := store.Clusters[r.idx]
		movies := c.Movies
		if len(movies) > maxPerCluster {
			movies = movies[:maxPerCluster]
		}
		output[i] = QueryResult{
			ClusterID:   c.ClusterID,
			ClusterName: c.Name,
			CentroidX:   c.CentroidX,
			CentroidY:   c.CentroidY,
			Score:       math.Round(r.score*10000) / 10000,
			Count:       len(c.Movies),
			Movies:      movies,
		}
	}
	return output
}

// GetAllClusters returns all clusters with names and centroids (no movie lists).
func GetAllClusters() []QueryResult {
	if store == nil {
		return nil
	}
	out := make([]QueryResult, len(store.Clusters))
	for i, c := range store.Clusters {
		out[i] = QueryResult{
			ClusterID:   c.ClusterID,
			ClusterName: c.Name,
			CentroidX:   c.CentroidX,
			CentroidY:   c.CentroidY,
			Count:       c.MovieCount,
		}
	}
	return out
}
