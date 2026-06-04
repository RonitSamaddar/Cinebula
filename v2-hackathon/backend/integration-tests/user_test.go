package integrationtest

import (
	"testing"
)

// loginAndGetToken is a helper that logs in and returns the JWT token.
func loginAndGetToken(t *testing.T) (int, string) {
	t.Helper()
	resp := post(t, "/auth/login", map[string]any{
		"name": "IntegrationTestUser-Profile",
	})
	assertStatus(t, resp, 200)

	var result struct {
		UserID int    `json:"user_id"`
		Token  string `json:"token"`
	}
	decodeJSON(t, resp, &result)

	if result.Token == "" {
		t.Fatal("login returned empty token")
	}
	return result.UserID, result.Token
}

// TestUserProfile_Valid expects 200 with correct profile fields.
func TestUserProfile_Valid(t *testing.T) {
	userID, token := loginAndGetToken(t)

	resp := get(t, "/user/profile", map[string]string{
		"Authorization": "Bearer " + token,
	})
	assertStatus(t, resp, 200)

	var result struct {
		UserID    int    `json:"user_id"`
		Name      string `json:"name"`
		CreatedAt string `json:"created_at"`
	}
	decodeJSON(t, resp, &result)

	if result.UserID != userID {
		t.Errorf("profile user_id=%d, expected %d", result.UserID, userID)
	}
	if result.Name == "" {
		t.Error("expected non-empty name in profile")
	}
	if result.CreatedAt == "" {
		t.Error("expected non-empty created_at in profile")
	}
}

// TestUserProfile_NoToken expects 401 when no Authorization header is sent.
func TestUserProfile_NoToken(t *testing.T) {
	resp := get(t, "/user/profile", nil)
	assertStatus(t, resp, 401)
	resp.Body.Close()
}

// TestUserProfile_BadToken expects 401 for a malformed token.
func TestUserProfile_BadToken(t *testing.T) {
	resp := get(t, "/user/profile", map[string]string{
		"Authorization": "Bearer this.is.not.a.valid.jwt",
	})
	assertStatus(t, resp, 401)
	resp.Body.Close()
}

// TestUserProfile_ExpiredToken expects 401 for an expired / wrong-secret token.
func TestUserProfile_ExpiredToken(t *testing.T) {
	// A real JWT signed with a different secret
	const badToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
		"eyJ1c2VyX2lkIjoxLCJuYW1lIjoiZmFrZSJ9." +
		"INVALID_SIGNATURE_HERE"

	resp := get(t, "/user/profile", map[string]string{
		"Authorization": "Bearer " + badToken,
	})
	assertStatus(t, resp, 401)
	resp.Body.Close()
}
