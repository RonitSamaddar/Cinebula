// Transform k n-dimensional vectors to k 2D vectors using:
// 1. Neighborhood-based projection: t-SNE
// 2. Linear projection: PCA
//
// Uses Python's sklearn for the actual computation to ensure
// exact reproducibility with the original transform.py output.
package main

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gocql/gocql"
)

// ---------------------------------------------------------------------------
// CSV I/O
// ---------------------------------------------------------------------------

// loadVectorsFromCSV reads k n-dimensional vectors from a CSV file.
// First column is label_name, rest are numeric dimensions.
func loadVectorsFromCSV(path string) ([]string, [][]float64) {
	data, err := os.ReadFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading file: %v\n", err)
		os.Exit(1)
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")

	var labels []string
	var rows [][]float64

	for _, line := range lines[1:] { // skip header
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.Split(line, ",")
		// Walk from the end to find where numbers stop and label begins
		var vec []float64
		labelEnd := 0
		for i := len(parts) - 1; i > 0; i-- {
			v, err := strconv.ParseFloat(parts[i], 64)
			if err != nil {
				labelEnd = i
				break
			}
			vec = append(vec, v)
		}
		// reverse vec (was appended in reverse order)
		for i, j := 0, len(vec)-1; i < j; i, j = i+1, j-1 {
			vec[i], vec[j] = vec[j], vec[i]
		}
		label := strings.TrimSpace(strings.Join(parts[:labelEnd+1], ","))
		if len(vec) > 0 && label != "" {
			labels = append(labels, label)
			rows = append(rows, vec)
		}
	}
	return labels, rows
}

// saveCSV writes the 2D projection results to a CSV file.
func saveCSV(path string, labels []string, result [][]float64) {
	f, err := os.Create(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating file: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	w := csv.NewWriter(f)
	w.UseCRLF = true // match Python csv writer's default \r\n line endings
	defer w.Flush()

	_ = w.Write([]string{"label_name", "x", "y"})
	for i, label := range labels {
		x := strconv.FormatFloat(float64(float32(result[i][0])), 'f', -1, 32)
		y := strconv.FormatFloat(float64(float32(result[i][1])), 'f', -1, 32)
		_ = w.Write([]string{label, x, y})
	}
}

// ---------------------------------------------------------------------------
// Temp-file helpers for the Python bridge
// ---------------------------------------------------------------------------

// writeVectorsCSV writes raw numeric vectors to a CSV (no headers, no labels).
func writeVectorsCSV(path string, vectors [][]float64) {
	f, err := os.Create(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating temp file: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()

	for _, vec := range vectors {
		row := make([]string, len(vec))
		for j, v := range vec {
			row[j] = strconv.FormatFloat(v, 'g', -1, 64)
		}
		_ = w.Write(row)
	}
}

// readResultCSV reads 2-column (x, y) results produced by Python.
func readResultCSV(path string) [][]float64 {
	f, err := os.Open(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading result file: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	r := csv.NewReader(f)
	records, err := r.ReadAll()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing result CSV: %v\n", err)
		os.Exit(1)
	}

	var result [][]float64
	for _, rec := range records {
		x, _ := strconv.ParseFloat(rec[0], 64)
		y, _ := strconv.ParseFloat(rec[1], 64)
		result = append(result, []float64{x, y})
	}
	return result
}

// ---------------------------------------------------------------------------
// Dimensionality reduction via Python sklearn
// ---------------------------------------------------------------------------

func runReduce(vectors [][]float64, method string, perplexity int, randomState int, scale float64) [][]float64 {
	tmpDir, err := os.MkdirTemp("", "nd-transformer-*")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating temp dir: %v\n", err)
		os.Exit(1)
	}
	defer os.RemoveAll(tmpDir)

	inputPath := filepath.Join(tmpDir, "input.csv")
	outputPath := filepath.Join(tmpDir, "output.csv")

	writeVectorsCSV(inputPath, vectors)

	pyScript := fmt.Sprintf(`
import numpy as np, csv, sys
X = np.loadtxt(%q, delimiter=',')
method = %q
perplexity = min(%d, len(X) - 1)
scale = %f
random_state = %d

if method == 'tsne':
    from sklearn.manifold import TSNE
    result = TSNE(n_components=2, perplexity=perplexity, random_state=random_state).fit_transform(X) * scale
elif method == 'pca':
    from sklearn.decomposition import PCA
    result = PCA(n_components=2).fit_transform(X)
elif method == 'umap':
    import umap
    n_neighbors = min(15, len(X) - 1)
    result = umap.UMAP(n_components=2, n_neighbors=n_neighbors, random_state=random_state).fit_transform(X)
else:
    sys.exit('unsupported method: ' + method)

with open(%q, 'w', newline='') as f:
    w = csv.writer(f)
    for row in result:
        w.writerow([row[0], row[1]])
`, inputPath, method, perplexity, scale, randomState, outputPath)

	cmd := exec.Command("python3", "-c", pyScript)
	// Try venv Python first, fall back to system python3
	venvPython := filepath.Join(filepath.Dir(filepath.Dir(inputPath)), "..", "..", "..", ".venv", "bin", "python")
	// Look for .venv relative to the executable or working directory
	if wd, err2 := os.Getwd(); err2 == nil {
		candidates := []string{
			filepath.Join(wd, ".venv", "bin", "python"),
			filepath.Join(wd, "..", ".venv", "bin", "python"),
			filepath.Join(wd, "..", "..", ".venv", "bin", "python"),
		}
		for _, c := range candidates {
			if _, err3 := os.Stat(c); err3 == nil {
				venvPython = c
				break
			}
		}
	}
	if _, err2 := os.Stat(venvPython); err2 == nil {
		cmd = exec.Command(venvPython, "-c", pyScript)
	}
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Python sklearn bridge failed: %v\nMake sure scikit-learn is installed: pip install scikit-learn\n", err)
		os.Exit(1)
	}

	return readResultCSV(outputPath)
}

// ---------------------------------------------------------------------------
// OpenSearch vector storage
// ---------------------------------------------------------------------------

const (
	indexName = "movie-vectors"
)

func getOpensearchURL() string {
	if url := os.Getenv("OPENSEARCH_URL"); url != "" {
		return url
	}
	return "http://localhost:9200"
}

func getCassandraHost() string {
	if host := os.Getenv("CASSANDRA_HOST"); host != "" {
		return host
	}
	return "127.0.0.1"
}

// waitForOpenSearch waits until OpenSearch is reachable (up to 30s).
func waitForOpenSearch() bool {
	for i := 0; i < 30; i++ {
		resp, err := http.Get(getOpensearchURL())
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return true
			}
		}
		time.Sleep(1 * time.Second)
	}
	return false
}

// createIndexIfNotExists creates the knn index with the correct dimension.
func createIndexIfNotExists(dim int) error {
	// Check if index exists
	resp, err := http.Get(getOpensearchURL() + "/" + indexName)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode == 200 {
		return nil // already exists
	}

	mapping := map[string]interface{}{
		"settings": map[string]interface{}{
			"index": map[string]interface{}{
				"knn": true,
			},
		},
		"mappings": map[string]interface{}{
			"properties": map[string]interface{}{
				"movie": map[string]interface{}{
					"type": "text",
				},
				"movie_keyword": map[string]interface{}{
					"type": "keyword",
				},
				"vector": map[string]interface{}{
					"type":      "knn_vector",
					"dimension": dim,
				},
			},
		},
	}

	body, _ := json.Marshal(mapping)
	req, _ := http.NewRequest("PUT", getOpensearchURL()+"/"+indexName, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to create index: %s", string(b))
	}
	return nil
}

// documentExists checks if a movie document already exists in the index.
func documentExists(movie string) bool {
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"term": map[string]interface{}{
				"movie_keyword": movie,
			},
		},
	}
	body, _ := json.Marshal(query)
	resp, err := http.Post(getOpensearchURL()+"/"+indexName+"/_search", "application/json", bytes.NewReader(body))
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	var result struct {
		Hits struct {
			Total struct {
				Value int `json:"value"`
			} `json:"total"`
		} `json:"hits"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false
	}
	return result.Hits.Total.Value > 0
}

// storeVector stores a single movie vector in OpenSearch.
func storeVector(movie string, vector []float64) error {
	doc := map[string]interface{}{
		"movie":         movie,
		"movie_keyword": movie,
		"vector":        vector,
	}
	body, _ := json.Marshal(doc)
	resp, err := http.Post(getOpensearchURL()+"/"+indexName+"/_doc", "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to index document: %s", string(b))
	}
	return nil
}

// storeVectorsInOpenSearch stores all vectors from the CSV into OpenSearch,
// skipping any that already exist.
func storeVectorsInOpenSearch(labels []string, vectors [][]float64) {
	if !waitForOpenSearch() {
		fmt.Println("⚠ OpenSearch not reachable at", getOpensearchURL(), "— skipping vector storage")
		return
	}
	fmt.Println("\nConnected to OpenSearch")

	dim := len(vectors[0])
	if err := createIndexIfNotExists(dim); err != nil {
		fmt.Printf("⚠ Failed to create index: %v\n", err)
		return
	}

	stored, skipped := 0, 0
	for i, label := range labels {
		if documentExists(label) {
			skipped++
			continue
		}
		if err := storeVector(label, vectors[i]); err != nil {
			fmt.Printf("⚠ Failed to store %q: %v\n", label, err)
			continue
		}
		stored++
	}
	fmt.Printf("OpenSearch: stored %d vectors, skipped %d (already present)\n", stored, skipped)
}

// getMovieVector retrieves the vector for a given movie name from OpenSearch.
func getMovieVector(movie string) ([]float64, error) {
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"term": map[string]interface{}{
				"movie_keyword": movie,
			},
		},
		"_source": []string{"vector"},
	}
	body, _ := json.Marshal(query)
	resp, err := http.Post(getOpensearchURL()+"/"+indexName+"/_search", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Hits struct {
			Hits []struct {
				Source struct {
					Vector []float64 `json:"vector"`
				} `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	if len(result.Hits.Hits) == 0 {
		return nil, fmt.Errorf("movie %q not found", movie)
	}
	return result.Hits.Hits[0].Source.Vector, nil
}

// findSimilarMovies uses OpenSearch KNN to find the k nearest movies.
func findSimilarMovies(movie string, k int) ([]map[string]interface{}, error) {
	vec, err := getMovieVector(movie)
	if err != nil {
		return nil, err
	}

	query := map[string]interface{}{
		"size": k + 1, // +1 to account for the query movie itself
		"query": map[string]interface{}{
			"knn": map[string]interface{}{
				"vector": map[string]interface{}{
					"vector": vec,
					"k":      k + 1,
				},
			},
		},
	}
	body, _ := json.Marshal(query)
	resp, err := http.Post(getOpensearchURL()+"/"+indexName+"/_search", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Hits struct {
			Hits []struct {
				Source struct {
					Movie string `json:"movie"`
				} `json:"_source"`
				Score float64 `json:"_score"`
			} `json:"hits"`
		} `json:"hits"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var similar []map[string]interface{}
	for _, hit := range result.Hits.Hits {
		if strings.EqualFold(hit.Source.Movie, movie) {
			continue // skip the query movie itself
		}
		similar = append(similar, map[string]interface{}{
			"movie": hit.Source.Movie,
			"score": hit.Score,
		})
	}
	if len(similar) > k {
		similar = similar[:k]
	}
	return similar, nil
}

// ---------------------------------------------------------------------------
// HTTP API Server
// ---------------------------------------------------------------------------

// corsMiddleware adds CORS headers to all responses.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// jsonError writes a JSON error response.
func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// ---------------------------------------------------------------------------
// Cassandra + Genre API
// ---------------------------------------------------------------------------

var cassandraSession *gocql.Session

func initCassandra() {
	fmt.Println(getCassandraHost())
	cluster := gocql.NewCluster(getCassandraHost())
	cluster.Port = 9042
	cluster.Keyspace = "cinebula"
	cluster.Consistency = gocql.Quorum
	cluster.Timeout = 30 * time.Second
	cluster.ConnectTimeout = 30 * time.Second

	// Retry connection up to 60 seconds (Cassandra can be slow to start)
	for i := 0; i < 30; i++ {
		sess, err := cluster.CreateSession()
		if err == nil {
			cassandraSession = sess
			fmt.Println("Connected to Cassandra (cinebula keyspace)")
			return
		}
		fmt.Printf("⚠ Cassandra not ready (attempt %d/30): %v\n", i+1, err)
		time.Sleep(2 * time.Second)
	}
	fmt.Println("⚠ Could not connect to Cassandra after 30 attempts")
}

// MovieResponse is the JSON response for each movie in the genre endpoint.
type MovieResponse struct {
	MovieName   string   `json:"movie_name"`
	ImageLink   string   `json:"image_link"`
	VoteAverage float64  `json:"vote_average"`
	VoteCount   int64    `json:"vote_count"`
	Revenue     int64    `json:"revenue"`
	Budget      int64    `json:"budget"`
	Popularity  float64  `json:"popularity"`
	Genres      []string `json:"genres"`
	Language    string   `json:"language"`
	IMDBRating  float64  `json:"imdb_rating"`
	Synopsis    string   `json:"synopsis"`
	Keywords    []string `json:"keywords"`
	Casts       []string `json:"casts"`
	X           float64  `json:"x"`
	Y           float64  `json:"y"`
}

// handleMovies handles GET /api/movies?genre=action&language=en&keyword=heist&cast=Tom+Hanks
// All filters are optional and combined with AND logic. Multiple values for the same
// filter can be comma-separated (e.g. genre=action,comedy) and are OR'd within the group.
func handleMovies(w http.ResponseWriter, r *http.Request) {
	if cassandraSession == nil {
		jsonError(w, "Cassandra not connected", http.StatusServiceUnavailable)
		return
	}

	// Parse filter params
	genreParam := r.URL.Query().Get("genre")
	keywordParam := r.URL.Query().Get("keyword")
	languageParam := r.URL.Query().Get("language")
	castParam := r.URL.Query().Get("cast")

	if genreParam == "" && keywordParam == "" && languageParam == "" && castParam == "" {
		jsonError(w, "at least one filter required: genre, keyword, language, cast", http.StatusBadRequest)
		return
	}

	// Build CQL WHERE clauses
	var conditions []string
	var values []interface{}

	// Genre filters use boolean flag columns
	for _, g := range splitAndSanitize(genreParam) {
		conditions = append(conditions, fmt.Sprintf("%s = ?", g))
		values = append(values, true)
	}

	// Keyword filter: keywords is list<text>, use CONTAINS
	if keywordParam != "" {
		for _, k := range strings.Split(keywordParam, ",") {
			k = strings.TrimSpace(k)
			if k != "" {
				conditions = append(conditions, "keywords CONTAINS ?")
				values = append(values, k)
			}
		}
	}

	// Language filter uses the language column with CONTAINS-like matching
	if languageParam != "" {
		conditions = append(conditions, "language = ?")
		values = append(values, strings.TrimSpace(languageParam))
	}

	// Cast filter: casts is list<text>, use CONTAINS
	if castParam != "" {
		for _, c := range strings.Split(castParam, ",") {
			c = strings.TrimSpace(c)
			if c != "" {
				conditions = append(conditions, "casts CONTAINS ?")
				values = append(values, c)
			}
		}
	}

	query := `SELECT movie_name, image_link, vote_average, vote_count, 
		revenue, budget, popularity, genres, language, imdb_rating, synopsis, keywords, casts 
		FROM movies`
	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ") + " ALLOW FILTERING"
	}

	// fmt.Printf("CQL: %s | values: %v\n", query, values)

	iter := cassandraSession.Query(query, values...).Iter()

	var movies []MovieResponse
	var movieNames []string

	var movieName, imageLink, language, synopsis string
	var voteAverage, popularity, imdbRating float64
	var voteCount, revenue, budget int64
	var genres, casts, keywords []string

	for iter.Scan(&movieName, &imageLink, &voteAverage, &voteCount,
		&revenue, &budget, &popularity, &genres, &language, &imdbRating, &synopsis, &keywords, &casts) {
		movies = append(movies, MovieResponse{
			MovieName:   movieName,
			ImageLink:   imageLink,
			VoteAverage: voteAverage,
			VoteCount:   voteCount,
			Revenue:     revenue,
			Budget:      budget,
			Popularity:  popularity,
			Genres:      genres,
			Language:    language,
			IMDBRating:  imdbRating,
			Synopsis:    synopsis,
			Casts:       casts,
			Keywords:    keywords,
		})
		movieNames = append(movieNames, movieName)
	}
	if err := iter.Close(); err != nil {
		jsonError(w, fmt.Sprintf("Cassandra query error: %v", err), http.StatusInternalServerError)
		return
	}

	if len(movies) == 0 {
		jsonError(w, "no movies found for the given filters", http.StatusNotFound)
		return
	}

	// Fetch vectors from OpenSearch for each movie
	var vectors [][]float64
	var validIndices []int
	for i, name := range movieNames {
		vec, err := getMovieVector(strings.ToLower(name))
		if err != nil {
			fmt.Printf("  ⚠ No vector for %q: %v\n", name, err)
			continue
		}
		vectors = append(vectors, vec)
		validIndices = append(validIndices, i)
	}

	// fmt.Printf("Query: %d movies from Cassandra, %d have vectors\n", len(movies), len(vectors))

	if len(vectors) < 2 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"count":  len(movies),
			"movies": movies,
		})
		return
	}

	// Run t-SNE to reduce to 2D
	perplexity := 30
	if len(vectors) <= 30 {
		perplexity = len(vectors) - 1
	}
	result := runReduce(vectors, "tsne", perplexity, 42, 1000.0)

	for idx, validIdx := range validIndices {
		if idx < len(result) {
			movies[validIdx].X = result[idx][0]
			movies[validIdx].Y = result[idx][1]
		}
	}

	var responseMovies []MovieResponse
	for _, idx := range validIndices {
		responseMovies = append(responseMovies, movies[idx])
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"count":  len(responseMovies),
		"movies": responseMovies,
	})
}

// splitAndSanitize splits a comma-separated param and sanitizes each value as a column name.
func splitAndSanitize(param string) []string {
	if param == "" {
		return nil
	}
	var result []string
	for _, p := range strings.Split(param, ",") {
		col := sanitizeGenreColumn(strings.TrimSpace(p))
		if col != "" {
			result = append(result, col)
		}
	}
	return result
}

func sanitizeGenreColumn(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var b strings.Builder
	for _, c := range s {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' {
			b.WriteRune(c)
		} else {
			b.WriteRune('_')
		}
	}
	result := b.String()
	if len(result) > 0 && result[0] >= '0' && result[0] <= '9' {
		result = "_" + result
	}
	return result
}
func handleSimilar(w http.ResponseWriter, r *http.Request) {
	movie := r.URL.Query().Get("movie")
	movie = strings.ToLower(movie)
	if movie == "" {
		jsonError(w, "missing required query parameter: movie", http.StatusBadRequest)
		return
	}

	k := 50
	if ks := r.URL.Query().Get("k"); ks != "" {
		if parsed, err := strconv.Atoi(ks); err == nil && parsed > 0 {
			k = parsed
		}
	}

	similar, err := findSimilarMovies(movie, k)
	if err != nil {
		jsonError(w, err.Error(), http.StatusNotFound)
		return
	}

	if cassandraSession == nil {
		jsonError(w, "Cassandra not connected", http.StatusServiceUnavailable)
		return
	}

	// Collect movie names from similar results
	var movieNames []string
	for _, s := range similar {
		if name, ok := s["movie"].(string); ok {
			movieNames = append(movieNames, name)
		}
	}

	// Build lowercase→original name lookup from Cassandra
	cassandraNameLookup := make(map[string]string)
	{
		iter := cassandraSession.Query(`SELECT movie_name FROM movies`).Iter()
		var mName string
		for iter.Scan(&mName) {
			cassandraNameLookup[strings.ToLower(mName)] = mName
		}
		iter.Close()
	}

	// Fetch metadata from Cassandra for each similar movie
	var movies []MovieResponse
	var vectors [][]float64
	var validIndices []int

	for i, name := range movieNames {
		// Resolve lowercase OpenSearch name to original Cassandra name
		cassandraName, ok := cassandraNameLookup[strings.ToLower(name)]
		if !ok {
			fmt.Printf("  ⚠ No Cassandra entry for %q\n", name)
			continue
		}

		query := `SELECT movie_name, image_link, vote_average, vote_count, 
			revenue, budget, popularity, genres, language, imdb_rating, synopsis, keywords, casts 
			FROM movies WHERE movie_name = ? LIMIT 1`
		var movieName, imageLink, language, synopsis string
		var voteAverage, popularity, imdbRating float64
		var voteCount, revenue, budget int64
		var genres, casts, keywords []string

		if err := cassandraSession.Query(query, cassandraName).Scan(&movieName, &imageLink, &voteAverage, &voteCount,
			&revenue, &budget, &popularity, &genres, &language, &imdbRating, &synopsis, &keywords, &casts); err != nil {
			fmt.Printf("  ⚠ No Cassandra data for %q: %v\n", cassandraName, err)
			continue
		}

		movies = append(movies, MovieResponse{
			MovieName:   movieName,
			ImageLink:   imageLink,
			VoteAverage: voteAverage,
			VoteCount:   voteCount,
			Revenue:     revenue,
			Budget:      budget,
			Popularity:  popularity,
			Genres:      genres,
			Language:    language,
			IMDBRating:  imdbRating,
			Synopsis:    synopsis,
			Casts:       casts,
			Keywords:    keywords,
		})

		vec, err := getMovieVector(strings.ToLower(name))
		if err == nil {
			vectors = append(vectors, vec)
			validIndices = append(validIndices, len(movies)-1)
		}
		_ = i
	}

	if len(movies) == 0 {
		jsonError(w, "no movie metadata found for similar results", http.StatusNotFound)
		return
	}

	// Run t-SNE on the vectors to get 2D coordinates
	if len(vectors) >= 2 {
		perplexity := 30
		if len(vectors) <= 30 {
			perplexity = len(vectors) - 1
		}
		result := runReduce(vectors, "tsne", perplexity, 42, 1000.0)

		for idx, validIdx := range validIndices {
			if idx < len(result) {
				movies[validIdx].X = result[idx][0]
				movies[validIdx].Y = result[idx][1]
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"movie":  movie,
		"k":      k,
		"count":  len(movies),
		"movies": movies,
	})
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

func main() {
	method := flag.String("method", "tsne", "Reduction method: tsne, umap, or pca")
	csvPath := flag.String("csv", "sample.csv", "Path to CSV file with vectors (each row = one vector)")
	output := flag.String("output", "", "Path to save the 2D output as CSV")
	serve := flag.Bool("serve", true, "Start HTTP API server instead of running reduction")
	port := flag.String("port", "8080", "Port for the API server")
	flag.Parse()

	// --- API server mode ---
	if *serve {
		initCassandra()
		if cassandraSession != nil {
			defer cassandraSession.Close()
		}
	}

	// Always load and ingest vectors into OpenSearch
	var labels []string
	var vectors [][]float64

	if *csvPath != "" {
		labels, vectors = loadVectorsFromCSV(*csvPath)
		fmt.Printf("Loaded %d vectors of %d dimensions from %s\n",
			len(vectors), len(vectors[0]), *csvPath)

		// Filter: only keep vectors whose movie exists in Cassandra
		if cassandraSession != nil {
			// Load all movie names from Cassandra and lowercase them for comparison
			cassandraMovies := make(map[string]bool)
			iter := cassandraSession.Query(`SELECT movie_name FROM movies`).Iter()
			var mName string
			for iter.Scan(&mName) {
				cassandraMovies[strings.ToLower(mName)] = true
			}
			iter.Close()
			fmt.Printf("Loaded %d movie names from Cassandra\n", len(cassandraMovies))

			var filteredLabels []string
			var filteredVectors [][]float64
			for i, label := range labels {
				if cassandraMovies[strings.ToLower(label)] {
					filteredLabels = append(filteredLabels, label)
					filteredVectors = append(filteredVectors, vectors[i])
				}
			}
			fmt.Printf("Filtered to %d vectors (out of %d) with Cassandra entries\n",
				len(filteredLabels), len(labels))
			labels = filteredLabels
			vectors = filteredVectors
		}

		fmt.Println(len(labels), "vectors after filtering with Cassandra")
		if len(vectors) > 0 {
			storeVectorsInOpenSearch(labels, vectors)
		}
	} else {
		rng := rand.New(rand.NewSource(0))
		k, n := 50, 10
		vectors = make([][]float64, k)
		labels = make([]string, k)
		for i := 0; i < k; i++ {
			vectors[i] = make([]float64, n)
			for j := 0; j < n; j++ {
				vectors[i][j] = rng.NormFloat64()
			}
			labels[i] = fmt.Sprintf("item_%d", i)
		}
		fmt.Printf("Using demo data: %d vectors of %d dimensions\n", k, n)
	}

	if *serve {

		mux := http.NewServeMux()
		mux.HandleFunc("/api/similar", handleSimilar)
		mux.HandleFunc("/api/movies", handleMovies)

		addr := ":" + *port
		fmt.Printf("\n🚀 API server listening on http://localhost%s\n", addr)
		fmt.Println("  GET /api/similar?movie=<name>&k=50")
		fmt.Println("  GET /api/movies?genre=action&keyword=heist&language=en&cast=Tom+Hanks")
		if err := http.ListenAndServe(addr, corsMiddleware(mux)); err != nil {
			fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
			os.Exit(1)
		}
		return
	}

	// --- CLI reduction mode ---
	methodNames := map[string]string{
		"tsne": "t-SNE (neighborhood-based)",
		"umap": "UMAP (neighborhood-based)",
		"pca":  "PCA (linear projection)",
	}
	name, ok := methodNames[*method]
	if !ok {
		fmt.Println("Invalid method. Use: tsne, umap, or pca")
		return
	}

	fmt.Printf("\nRunning %s...\n", name)
	result := runReduce(vectors, *method, 30, 42, 1000.0)

	fmt.Printf("Output shape: (%d, 2)\n", len(result))
	fmt.Println("First 5 projected 2D points:")
	for i := 0; i < 5 && i < len(result); i++ {
		fmt.Printf("  %s: (%f, %f)\n", labels[i], result[i][0], result[i][1])
	}

	if *output != "" {
		saveCSV(*output, labels, result)
		fmt.Printf("\nSaved 2D output to %s\n", *output)
	}
}
