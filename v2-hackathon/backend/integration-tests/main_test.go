package integrationtest

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"cinebula/backend/internal/auth"
	dataservice "cinebula/backend/internal/data-service"
	topgenres "cinebula/backend/internal/top-genres"
	"cinebula/backend/internal/user"
)

var testServer *httptest.Server

func TestMain(m *testing.M) {
	// Go sets the working directory to the package directory (integration-tests/).
	// All service handlers resolve paths relative to the backend root, so step up one level.
	if err := os.Chdir(".."); err != nil {
		log.Fatalf("chdir to backend root: %v", err)
	}

	// Snapshot users.csv before tests so we can restore it afterwards.
	const csvPath = "./databases/users.csv"
	snapshot, err := os.ReadFile(csvPath)
	if err != nil {
		log.Fatalf("read users.csv snapshot: %v", err)
	}

	// Build the same mux as cmd/server/main.go.
	mux := http.NewServeMux()
	mux.HandleFunc("POST /auth/login", auth.LoginHandler)
	mux.HandleFunc("GET /top-genres", topgenres.Handler)
	mux.HandleFunc("GET /api/movies", dataservice.Handler)
	mux.Handle("GET /user/profile", auth.Middleware(http.HandlerFunc(user.ProfileHandler)))
	testServer = httptest.NewServer(mux)

	code := m.Run()

	testServer.Close()

	// Restore users.csv to its original state.
	if err := os.WriteFile(csvPath, snapshot, 0644); err != nil {
		log.Printf("warn: could not restore users.csv: %v", err)
	}

	os.Exit(code)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func post(t *testing.T, path string, body any) *http.Response {
	t.Helper()
	b, _ := json.Marshal(body)
	resp, err := http.Post(testServer.URL+path, "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatalf("POST %s: %v", path, err)
	}
	return resp
}

func get(t *testing.T, path string, headers map[string]string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest(http.MethodGet, testServer.URL+path, nil)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET %s: %v", path, err)
	}
	return resp
}

func decodeJSON(t *testing.T, r *http.Response, dst any) {
	t.Helper()
	defer r.Body.Close()
	body, _ := io.ReadAll(r.Body)
	if err := json.Unmarshal(body, dst); err != nil {
		t.Fatalf("decode JSON: %v\nbody: %s", err, body)
	}
}

func assertStatus(t *testing.T, resp *http.Response, want int) {
	t.Helper()
	if resp.StatusCode != want {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		t.Fatalf("expected status %d, got %d\nbody: %s", want, resp.StatusCode, body)
	}
}
