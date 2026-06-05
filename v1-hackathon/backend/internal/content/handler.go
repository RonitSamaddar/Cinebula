package content

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

// SearchHandler handles GET /content/search?genres=action,drama&tags=revenge,survival&n=10&max_per_cluster=20
func SearchHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	var genres []string
	if g := strings.TrimSpace(q.Get("genres")); g != "" {
		genres = strings.Split(g, ",")
	}

	var tags []string
	if t := strings.TrimSpace(q.Get("tags")); t != "" {
		tags = strings.Split(t, ",")
	}

	if len(genres) == 0 && len(tags) == 0 {
		http.Error(w, "genres or tags required", http.StatusBadRequest)
		return
	}

	n := 15
	if nStr := q.Get("n"); nStr != "" {
		if v, err := strconv.Atoi(nStr); err == nil && v > 0 {
			n = v
		}
	}

	maxPerCluster := 20
	if mStr := q.Get("max_per_cluster"); mStr != "" {
		if v, err := strconv.Atoi(mStr); err == nil && v > 0 {
			maxPerCluster = v
		}
	}

	results := Query(genres, tags, n, maxPerCluster)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// ClustersHandler handles GET /content/clusters - returns all clusters with names and centroids.
func ClustersHandler(w http.ResponseWriter, r *http.Request) {
	clusters := GetAllClusters()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(clusters)
}

// DirectionHandler handles GET /content/direction?x=50&y=30&dir=up&radius=60&n=8
//
// Returns the top tags and sample movies found in the given direction from (x, y).
// dir can be: up, down, left, right, up-left, up-right, down-left, down-right, or an angle in degrees.
func DirectionHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	xStr := q.Get("x")
	yStr := q.Get("y")
	dir := q.Get("dir")

	if xStr == "" || yStr == "" || dir == "" {
		http.Error(w, "x, y, and dir are required", http.StatusBadRequest)
		return
	}

	x, err := strconv.ParseFloat(xStr, 64)
	if err != nil {
		http.Error(w, "invalid x", http.StatusBadRequest)
		return
	}
	y, err := strconv.ParseFloat(yStr, 64)
	if err != nil {
		http.Error(w, "invalid y", http.StatusBadRequest)
		return
	}

	radius := 0.0
	if rStr := q.Get("radius"); rStr != "" {
		if v, err := strconv.ParseFloat(rStr, 64); err == nil && v > 0 {
			radius = v
		}
	}

	n := 0
	if nStr := q.Get("n"); nStr != "" {
		if v, err := strconv.Atoi(nStr); err == nil && v > 0 {
			n = v
		}
	}

	result := QueryDirection(x, y, dir, radius, n)
	if result == nil {
		http.Error(w, "invalid direction", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// CurrentGenreHandler handles GET /content/current-genre?x=50&y=30&zoom=10
// Returns the top 2 genres of the area around the given position.
// zoom controls how wide an area is considered (higher zoom = smaller area).
func CurrentGenreHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	xStr := q.Get("x")
	yStr := q.Get("y")

	if xStr == "" || yStr == "" {
		http.Error(w, "x and y are required", http.StatusBadRequest)
		return
	}

	x, err := strconv.ParseFloat(xStr, 64)
	if err != nil {
		http.Error(w, "invalid x", http.StatusBadRequest)
		return
	}
	y, err := strconv.ParseFloat(yStr, 64)
	if err != nil {
		http.Error(w, "invalid y", http.StatusBadRequest)
		return
	}

	zoom := 0.0
	if zStr := q.Get("zoom"); zStr != "" {
		if v, err := strconv.ParseFloat(zStr, 64); err == nil && v > 0 {
			zoom = v
		}
	}

	result := GetCurrentGenre(x, y, zoom)
	if result == nil {
		http.Error(w, "no cluster data available", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
