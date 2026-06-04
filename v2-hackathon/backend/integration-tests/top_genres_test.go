package integrationtest

import (
	"testing"
)

// seeded ACR device IDs (matching databases/users.csv rows 1–4)
var seededDeviceIDs = []string{
	"46426f9c-ssss-4593-9399-21798b0d1148", // userId=1
	"5336afe5-ssss-4677-9b27-61253b9f6fc3", // userId=2
	"46d102f5-ssss-4826-accb-2815acc9378a", // userId=3
	"9e7f94f2-ssss-47a0-9ed4-bf6d91da9988", // userId=4
}

// loginWithDevice logs in via a known device_id and returns the JWT.
func loginWithDevice(t *testing.T, deviceID string) string {
	t.Helper()
	resp := post(t, "/auth/login", map[string]any{"device_id": deviceID})
	assertStatus(t, resp, 200)
	var r struct {
		Token string `json:"token"`
	}
	decodeJSON(t, resp, &r)
	if r.Token == "" {
		t.Fatal("login returned empty token")
	}
	return r.Token
}

// TestTopGenres_WithACR checks that each seeded ACR user gets personalised genres.
func TestTopGenres_WithACR(t *testing.T) {
	for i, deviceID := range seededDeviceIDs {
		i, deviceID := i, deviceID
		t.Run(itoa(i+1), func(t *testing.T) {
			token := loginWithDevice(t, deviceID)
			resp := get(t, "/top-genres", map[string]string{
				"Authorization": "Bearer " + token,
			})
			assertStatus(t, resp, 200)

			var result struct {
				UserID int `json:"user_id"`
				Genres []struct {
					Genre  string  `json:"genre"`
					Rank   int     `json:"rank"`
					Weight float64 `json:"weight"`
				} `json:"genres"`
			}
			decodeJSON(t, resp, &result)

			if len(result.Genres) == 0 {
				t.Errorf("device %s: expected genres, got empty list", deviceID)
			}
			// Weights must be descending.
			for j := 1; j < len(result.Genres); j++ {
				if result.Genres[j].Weight > result.Genres[j-1].Weight {
					t.Errorf("device %s: weights not descending at index %d (%f > %f)",
						deviceID, j, result.Genres[j].Weight, result.Genres[j-1].Weight)
				}
			}
			// Ranks must be 1-based sequential.
			for j, g := range result.Genres {
				if g.Rank != j+1 {
					t.Errorf("device %s: rank at position %d = %d, expected %d", deviceID, j, g.Rank, j+1)
				}
			}
		})
	}
}

// TestTopGenres_DeviceIDOverride checks that ?deviceId= overrides the token's user device.
func TestTopGenres_DeviceIDOverride(t *testing.T) {
	// Login as user 2, but request genres for user 1's device.
	token := loginWithDevice(t, seededDeviceIDs[1])

	byOverride := get(t, "/top-genres?deviceId="+seededDeviceIDs[0], map[string]string{
		"Authorization": "Bearer " + token,
	})
	assertStatus(t, byOverride, 200)

	// Direct login as user 1 for comparison.
	token1 := loginWithDevice(t, seededDeviceIDs[0])
	byDirect := get(t, "/top-genres", map[string]string{
		"Authorization": "Bearer " + token1,
	})
	assertStatus(t, byDirect, 200)

	var ro, rd struct {
		Genres []struct {
			Genre string `json:"genre"`
		} `json:"genres"`
	}
	decodeJSON(t, byOverride, &ro)
	decodeJSON(t, byDirect, &rd)

	if len(ro.Genres) == 0 {
		t.Fatal("deviceId override returned empty genres")
	}
	if len(ro.Genres) != len(rd.Genres) {
		t.Errorf("override and direct returned different genre counts: %d vs %d",
			len(ro.Genres), len(rd.Genres))
	}
	for i := range ro.Genres {
		if ro.Genres[i].Genre != rd.Genres[i].Genre {
			t.Errorf("genre mismatch at rank %d: override=%q direct=%q",
				i+1, ro.Genres[i].Genre, rd.Genres[i].Genre)
		}
	}
}

// TestTopGenres_Fallback expects the genreRankMatrix fallback for a user with no device_id.
func TestTopGenres_Fallback(t *testing.T) {
	// Anonymous login → no device_id → fallback.
	_, token := loginAndGetToken(t)

	resp := get(t, "/top-genres", map[string]string{
		"Authorization": "Bearer " + token,
	})
	assertStatus(t, resp, 200)

	var result struct {
		Genres []struct {
			Rank   int     `json:"rank"`
			Weight float64 `json:"weight"`
		} `json:"genres"`
	}
	decodeJSON(t, resp, &result)

	if len(result.Genres) != 9 {
		t.Errorf("expected 9 fallback genres, got %d", len(result.Genres))
	}
	if result.Genres[0].Weight != 1.0 {
		t.Errorf("expected rank-1 weight=1.0, got %f", result.Genres[0].Weight)
	}
	last := result.Genres[len(result.Genres)-1]
	if last.Rank != 9 {
		t.Errorf("expected last rank=9, got %d", last.Rank)
	}
}

// TestTopGenres_UnknownDeviceID falls back gracefully when no ACR data matches.
func TestTopGenres_UnknownDeviceID(t *testing.T) {
	_, token := loginAndGetToken(t)

	resp := get(t, "/top-genres?deviceId=00000000-0000-0000-0000-000000000000", map[string]string{
		"Authorization": "Bearer " + token,
	})
	assertStatus(t, resp, 200)

	var result struct {
		Genres []struct{ Genre string `json:"genre"` } `json:"genres"`
	}
	decodeJSON(t, resp, &result)

	if len(result.Genres) != 9 {
		t.Errorf("expected 9 fallback genres for unknown device, got %d", len(result.Genres))
	}
}

// TestTopGenres_NoToken expects 401 when Authorization header is missing.
func TestTopGenres_NoToken(t *testing.T) {
	resp := get(t, "/top-genres", nil)
	assertStatus(t, resp, 401)
	resp.Body.Close()
}

// itoa is a tiny int-to-string helper to avoid importing strconv.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	buf := make([]byte, 0, 10)
	for n > 0 {
		buf = append([]byte{byte('0' + n%10)}, buf...)
		n /= 10
	}
	if neg {
		buf = append([]byte{'-'}, buf...)
	}
	return string(buf)
}



