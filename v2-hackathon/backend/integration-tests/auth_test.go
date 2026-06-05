package integrationtest

import (
	"testing"
)

// TestLogin_Anonymous sends an empty body and expects a new user_id + token.
func TestLogin_Anonymous(t *testing.T) {
	resp := post(t, "/auth/login", map[string]any{})
	assertStatus(t, resp, 200)

	var result struct {
		UserID   int    `json:"user_id"`
		Token    string `json:"token"`
		DeviceID string `json:"device_id"`
	}
	decodeJSON(t, resp, &result)

	if result.UserID <= 0 {
		t.Errorf("expected user_id > 0, got %d", result.UserID)
	}
	if result.Token == "" {
		t.Error("expected a non-empty JWT token")
	}
	if result.DeviceID != "" {
		t.Errorf("expected no device_id in response, got %q", result.DeviceID)
	}
}

// TestLogin_DeviceIDOnly sends only a device_id and expects the matching seeded user.
func TestLogin_DeviceIDOnly(t *testing.T) {
	const knownDeviceID = "46426f9c-ssss-4593-9399-21798b0d1148" // userId=1 (Ronit)

	resp := post(t, "/auth/login", map[string]any{
		"device_id": knownDeviceID,
	})
	assertStatus(t, resp, 200)

	var result struct {
		UserID   int    `json:"user_id"`
		Token    string `json:"token"`
		DeviceID string `json:"device_id"`
	}
	decodeJSON(t, resp, &result)

	if result.UserID != 1 {
		t.Errorf("expected user_id=1 for known device, got %d", result.UserID)
	}
	if result.DeviceID != knownDeviceID {
		t.Errorf("expected device_id echoed back, got %q", result.DeviceID)
	}
	if result.Token == "" {
		t.Error("expected a non-empty JWT token")
	}
}

// TestLogin_FullRequest sends all fields including device_id.
func TestLogin_FullRequest(t *testing.T) {
	const knownDeviceID = "5336afe5-ssss-4677-9b27-61253b9f6fc3" // userId=2 (Pratikesh)

	resp := post(t, "/auth/login", map[string]any{
		"name":       "Pratikesh",
		"age":        22,
		"gender":     "male",
		"top_genres": []string{"Sci-Fi", "Action", "Drama", "Thriller", "Comedy"},
		"device_id":  knownDeviceID,
	})
	assertStatus(t, resp, 200)

	var result struct {
		UserID int `json:"user_id"`
	}
	decodeJSON(t, resp, &result)

	if result.UserID != 2 {
		t.Errorf("expected user_id=2 for Pratikesh's device, got %d", result.UserID)
	}
}

// TestLogin_SameNameReturnsExistingUser logs in twice with the same name.
func TestLogin_SameNameReturnsExistingUser(t *testing.T) {
	body := map[string]any{"name": "IntegrationTestUser-Idempotent"}

	resp1 := post(t, "/auth/login", body)
	assertStatus(t, resp1, 200)
	var r1 struct{ UserID int `json:"user_id"` }
	decodeJSON(t, resp1, &r1)

	resp2 := post(t, "/auth/login", body)
	assertStatus(t, resp2, 200)
	var r2 struct{ UserID int `json:"user_id"` }
	decodeJSON(t, resp2, &r2)

	if r1.UserID != r2.UserID {
		t.Errorf("expected same user_id on repeat login, got %d then %d", r1.UserID, r2.UserID)
	}
}

// TestLogin_InvalidGenre expects 400 when an unknown genre is given.
func TestLogin_InvalidGenre(t *testing.T) {
	resp := post(t, "/auth/login", map[string]any{
		"name":       "BadGenreUser",
		"top_genres": []string{"NotAGenre"},
	})
	assertStatus(t, resp, 400)
	resp.Body.Close()
}
