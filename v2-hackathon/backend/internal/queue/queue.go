package queue

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"sync"

	"cinebula/backend/internal/logger"
)

var (
	mu       sync.RWMutex
	queueData []json.RawMessage
)

const queueFile = "data-dirs/queue.json"

func init() {
	// Load existing queue from file if present
	data, err := os.ReadFile(queueFile)
	if err == nil {
		_ = json.Unmarshal(data, &queueData)
	}
}

func persist() {
	data, _ := json.Marshal(queueData)
	_ = os.WriteFile(queueFile, data, 0644)
}

func cors(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

// POST /api/queue — replace the entire queue
func PostHandler(w http.ResponseWriter, r *http.Request) {
	cors(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(204)
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "bad request", 400)
		return
	}

	var items []json.RawMessage
	if err := json.Unmarshal(body, &items); err != nil {
		http.Error(w, "invalid JSON array", 400)
		return
	}

	mu.Lock()
	queueData = items
	persist()
	mu.Unlock()

	logger.Log("Queue updated: %d items", len(items))

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}

// GET /api/queue — return the current queue
func GetHandler(w http.ResponseWriter, r *http.Request) {
	cors(w)
	mu.RLock()
	data, _ := json.Marshal(queueData)
	mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}
