package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// ── Input JSON schema ──────────────────────────────────────────────────

const MODEL_NAME = "nomic-embed-text"

type Movie struct {
	MovieName        string   `json:"movie"`
	Genre            []string `json:"genre"`
	Cast             []string `json:"cast"`
	ProductionHouses []string `json:"productionHouses"`
	Director         string   `json:"director"`
	Synopsis         string   `json:"synopsis"`
	Tags			 string `json:"tags"`
}

// ── Ollama API types ───────────────────────────────────────────────────

type EmbedRequest struct {
	Model string `json:"model"`
	Input string `json:"input"`
}

type EmbedResponse struct {
	Embeddings [][]float64 `json:"embeddings"`
}

// ── Main ───────────────────────────────────────────────────────────────

func main() {

	inputPath := "movie.json"
	outputPath := "final.csv"

	// Read input JSON
	data, err := os.ReadFile(inputPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading %s: %v\n", inputPath, err)
		os.Exit(1)
	}

	var movies []Movie
	if err := json.Unmarshal(data, &movies); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing JSON: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Loaded %d movies\n", len(movies))

	// Build CSV lines
	var csvLines []string
	csvLines = append(csvLines, "movie,vector")

	for i, m := range movies {
		// Build a rich text representation of the movie for embedding
		text := buildText(m)
		fmt.Printf("[%d/%d] Embedding: %s ...\n", i+1, len(movies), m.MovieName)

		embedding, err := getEmbedding(text)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting embedding for %s: %v\n", m.MovieName, err)
			os.Exit(1)
		}

		// Format: moviename (lowercase),val1,val2,...,valN
		name := strings.ToLower(m.MovieName)
		vecParts := make([]string, len(embedding))
		for j, v := range embedding {
			vecParts[j] = fmt.Sprintf("%v", v)
		}
		line := name + "," + strings.Join(vecParts, ",")
		csvLines = append(csvLines, line)

		fmt.Printf("  → %d dimensions\n", len(embedding))
	}

	// Write CSV
	output := strings.Join(csvLines, "\n") + "\n"
	if err := os.WriteFile(outputPath, []byte(output), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing %s: %v\n", outputPath, err)
		os.Exit(1)
	}

	fmt.Printf("Written %d movies to %s\n", len(movies), outputPath)
}

// buildText creates a single text string from all movie fields for embedding
func buildText(m Movie) string {
	var sb strings.Builder
	sb.WriteString(m.MovieName)
	sb.WriteString(". ")
	// sb.WriteString("Genre: ")
	// sb.WriteString(strings.Join(m.Genre, ", "))
	// sb.WriteString(". ")
	// sb.WriteString("Director: ")
	// sb.WriteString(m.Director)
	// sb.WriteString(". ")
	// sb.WriteString("Cast: ")
	// sb.WriteString(strings.Join(m.Cast, ", "))
	// sb.WriteString(". ")
	// sb.WriteString("Production: ")
	// sb.WriteString(strings.Join(m.ProductionHouses, ", "))
	// sb.WriteString(". ")
	// sb.WriteString(m.Synopsis)
	// sb.WriteString(". ")
	sb.WriteString("Tags: ")
	// sb.WriteString(strings.Join(m.Tags, ", "))
	sb.WriteString(m.Tags)
	return sb.String()
}

// getEmbedding calls the Ollama embed API and returns the embedding vector
func getEmbedding(text string) ([]float64, error) {
	reqBody := EmbedRequest{
		Model: MODEL_NAME,
		Input: text,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	resp, err := http.Post("http://localhost:11434/api/embed", "application/json", bytes.NewReader(jsonData))
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned %d: %s", resp.StatusCode, string(body))
	}

	var embedResp EmbedResponse
	if err := json.Unmarshal(body, &embedResp); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	if len(embedResp.Embeddings) == 0 {
		return nil, fmt.Errorf("no embeddings returned")
	}

	return embedResp.Embeddings[0], nil
}
