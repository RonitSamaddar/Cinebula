// Transform k n-dimensional vectors to k 2D vectors using:
// 1. Neighborhood-based projection: t-SNE
// 2. Linear projection: PCA
//
// Uses Python's sklearn for the actual computation to ensure
// exact reproducibility with the original transform.py output.
package main

import (
	"encoding/csv"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
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
// main
// ---------------------------------------------------------------------------

func main() {
	method := flag.String("method", "", "Reduction method: tsne, umap, or pca")
	csvPath := flag.String("csv", "", "Path to CSV file with vectors (each row = one vector)")
	output := flag.String("output", "", "Path to save the 2D output as CSV")
	flag.Parse()

	var labels []string
	var vectors [][]float64

	if *csvPath != "" {
		labels, vectors = loadVectorsFromCSV(*csvPath)
		fmt.Printf("Loaded %d vectors of %d dimensions from %s\n",
			len(vectors), len(vectors[0]), *csvPath)
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
