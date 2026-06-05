package qr

import (
	"encoding/json"
	"io"
	"net/http"
	"sync"

	"cinebula/backend/internal/logger"
)

type ScanEvent struct {
	DeviceID string `json:"device_id"`
	Token    string `json:"token"`
}

var (
	mu    sync.RWMutex
	event *ScanEvent
)

func cors(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

// POST /api/qr — phone signals successful QR scan
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

	var ev ScanEvent
	if err := json.Unmarshal(body, &ev); err != nil {
		http.Error(w, "invalid JSON", 400)
		return
	}

	mu.Lock()
	event = &ev
	mu.Unlock()

	logger.Log("QR scan registered: device_id=%s", ev.DeviceID)

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}

// GET /api/qr — TV checks if a phone has connected
func GetHandler(w http.ResponseWriter, r *http.Request) {
	cors(w)
	mu.RLock()
	ev := event
	mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	if ev == nil {
		w.Write([]byte(`{"connected":false}`))
		return
	}
	data, _ := json.Marshal(map[string]interface{}{
		"connected": true,
		"device_id": ev.DeviceID,
		"token":     ev.Token,
	})
	w.Write(data)
}

// DELETE /api/qr — reset (used on startup or after TV acknowledges)
func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	cors(w)
	mu.Lock()
	event = nil
	mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}
