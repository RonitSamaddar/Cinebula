package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	meilisearch "github.com/meilisearch/meilisearch-go"
)

// MovieDoc mirrors the fields in data-dirs/titles/titles.json.
type MovieDoc struct {
	ID        int    `json:"id"`
	MovieName string `json:"movie_name"`
}

const batchSize = 500

func main() {
	host := os.Getenv("MEILI_HOST")
	if host == "" {
		host = "http://127.0.0.1:7700"
	}
	apiKey := os.Getenv("MEILI_API_KEY")

	client := meilisearch.New(host, meilisearch.WithAPIKey(apiKey))

	// ── Skip if index already populated ──────────────────────────────────
	stats, err := client.Index("movies").GetStats(nil)
	if err == nil && stats.NumberOfDocuments > 0 {
		log.Printf("Meilisearch 'movies' index already has %d documents — skipping re-index.", stats.NumberOfDocuments)
		return
	}

	// ── Load titles.json ─────────────────────────────────────────────────
	data, err := os.ReadFile("./data-dirs/titles/titles.json")
	if err != nil {
		log.Fatalf("read titles.json: %v", err)
	}
	var docs []MovieDoc
	if err := json.Unmarshal(data, &docs); err != nil {
		log.Fatalf("parse titles.json: %v", err)
	}
	log.Printf("Loaded %d movies from titles.json", len(docs))

	idx := client.Index("movies")

	// ── Configure index settings ─────────────────────────────────────────
	log.Println("Applying index settings...")
	settingsTask, err := idx.UpdateSettings(&meilisearch.Settings{
		SearchableAttributes: []string{"movie_name"},
	})
	if err != nil {
		log.Fatalf("update settings: %v", err)
	}
	waitTask(client, settingsTask.TaskUID, "settings")

	// ── Batch upload via AddDocumentsInBatches ────────────────────────────
	pk := "id"
	start := time.Now()

	log.Printf("Uploading %d documents in batches of %d...", len(docs), batchSize)
	tasks, err := idx.AddDocumentsInBatches(docs, batchSize, &meilisearch.DocumentOptions{
		PrimaryKey: &pk,
	})
	if err != nil {
		log.Fatalf("add documents in batches: %v", err)
	}

	for i, t := range tasks {
		waitTask(client, t.TaskUID, fmt.Sprintf("batch %d/%d", i+1, len(tasks)))
	}

	log.Printf("✓ Indexed %d movies in %.2fs", len(docs), time.Since(start).Seconds())
}

func waitTask(client meilisearch.ServiceManager, taskUID int64, label string) {
	t, err := client.WaitForTask(taskUID, 50*time.Millisecond)
	if err != nil {
		log.Fatalf("wait for %s: %v", label, err)
	}
	if t.Status == meilisearch.TaskStatusFailed {
		log.Fatalf("%s task failed: %s", label, t.Error.Message)
	}
}
