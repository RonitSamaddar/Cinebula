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
	opensearchURL = "http://localhost:9200"
	indexName     = "movie-vectors"
)

// waitForOpenSearch waits until OpenSearch is reachable (up to 30s).
func waitForOpenSearch() bool {
	for i := 0; i < 30; i++ {
		resp, err := http.Get(opensearchURL)
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
	resp, err := http.Get(opensearchURL + "/" + indexName)
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
	req, _ := http.NewRequest("PUT", opensearchURL+"/"+indexName, bytes.NewReader(body))
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
	resp, err := http.Post(opensearchURL+"/"+indexName+"/_search", "application/json", bytes.NewReader(body))
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
	resp, err := http.Post(opensearchURL+"/"+indexName+"/_doc", "application/json", bytes.NewReader(body))
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
		fmt.Println("⚠ OpenSearch not reachable at", opensearchURL, "— skipping vector storage")
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
	resp, err := http.Post(opensearchURL+"/"+indexName+"/_search", "application/json", bytes.NewReader(body))
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
	resp, err := http.Post(opensearchURL+"/"+indexName+"/_search", "application/json", bytes.NewReader(body))
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

// handleSimilar handles GET /api/similar?movie=<name>&k=50
func handleSimilar(w http.ResponseWriter, r *http.Request) {
	movie := r.URL.Query().Get("movie")
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"movie":   movie,
		"k":       k,
		"results": similar,
	})
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

func main() {
	method := flag.String("method", "tsne", "Reduction method: tsne, umap, or pca")
	csvPath := flag.String("csv", "sample.csv", "Path to CSV file with vectors (each row = one vector)")
	output := flag.String("output", "", "Path to save the 2D output as CSV")
	serve := flag.Bool("serve", false, "Start HTTP API server instead of running reduction")
	port := flag.String("port", "8080", "Port for the API server")
	flag.Parse()

	// Always load and ingest vectors into OpenSearch
	var labels []string
	var vectors [][]float64

	if *csvPath != "" {
		labels, vectors = loadVectorsFromCSV(*csvPath)
		fmt.Printf("Loaded %d vectors of %d dimensions from %s\n",
			len(vectors), len(vectors[0]), *csvPath)
		storeVectorsInOpenSearch(labels, vectors)
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

	// --- API server mode ---
	if *serve {
		mux := http.NewServeMux()
		mux.HandleFunc("/api/similar", handleSimilar)

		addr := ":" + *port
		fmt.Printf("\n🚀 API server listening on http://localhost%s\n", addr)
		fmt.Println("  GET /api/similar?movie=<name>&k=50")
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
