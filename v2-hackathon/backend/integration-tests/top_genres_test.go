package integrationtest

import (
	"testing"
)

// knownACRDeviceID belongs to userId=1 in acr-data.json.
const knownACRDeviceID = "46426f9c-ssss-4593-9399-21798b0d1148"

// TestTopGenres_ByUserID_WithACR expects ACR-derived genres for a seeded user.
func TestTopGenres_ByUserID_WithACR(t *testing.T) {
	for _, id := range []int{1, 2, 3, 4} {
		t.Run("userId", func(t *testing.T) {
			resp := get(t, "/top-genres?userId="+itoa(id), nil)
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
				t.Errorf("userId=%d: expected genres, got empty list", id)
			}
			// Weights must be in (0, 1] and descending
			for i := 1; i < len(result.Genres); i++ {
				if result.Genres[i].Weight > result.Genres[i-1].Weight {
					t.Errorf("userId=%d: weights not descending at index %d (%f > %f)",
						id, i, result.Genres[i].Weight, result.Genres[i-1].Weight)
				}
			}
			// Ranks must start at 1 and increase
			for i, g := range result.Genres {
				if g.Rank != i+1 {
					t.Errorf("userId=%d: rank at position %d = %d, expected %d", id, i, g.Rank, i+1)
				}
			}
		})
	}
}

// TestTopGenres_ByDeviceID expects the same ACR result as userId=1.
func TestTopGenres_ByDeviceID(t *testing.T) {
	byDevice := get(t, "/top-genres?deviceId="+knownACRDeviceID, nil)
	assertStatus(t, byDevice, 200)

	byUser := get(t, "/top-genres?userId=1", nil)
	assertStatus(t, byUser, 200)

	var rd, ru struct {
		Genres []struct {
			Genre  string  `json:"genre"`
			Weight float64 `json:"weight"`
		} `json:"genres"`
	}
	decodeJSON(t, byDevice, &rd)
	decodeJSON(t, byUser, &ru)

	if len(rd.Genres) == 0 {
		t.Fatal("deviceId query returned empty genres")
	}
	if len(rd.Genres) != len(ru.Genres) {
		t.Errorf("deviceId and userId=1 returned different genre counts: %d vs %d",
			len(rd.Genres), len(ru.Genres))
	}
	for i := range rd.Genres {
		if rd.Genres[i].Genre != ru.Genres[i].Genre {
			t.Errorf("genre mismatch at rank %d: deviceId=%q userId=%q",
				i+1, rd.Genres[i].Genre, ru.Genres[i].Genre)
		}
	}
}

// TestTopGenres_Fallback_NoParams expects the genreRankMatrix fallback (9 genres, 1.0→0.2).
func TestTopGenres_Fallback_NoParams(t *testing.T) {
	resp := get(t, "/top-genres", nil)
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

	if result.UserID != 0 {
		t.Errorf("expected user_id=0 for no-param fallback, got %d", result.UserID)
	}
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

// TestTopGenres_Fallback_UserWithNoDevice expects fallback for userId=100 (no device_id).
func TestTopGenres_Fallback_UserWithNoDevice(t *testing.T) {
	resp := get(t, "/top-genres?userId=100", nil)
	assertStatus(t, resp, 200)

	var result struct {
		Genres []struct {
			Genre  string  `json:"genre"`
			Weight float64 `json:"weight"`
		} `json:"genres"`
	}
	decodeJSON(t, resp, &result)

	if len(result.Genres) != 9 {
		t.Errorf("expected 9 fallback genres for userId=100, got %d", len(result.Genres))
	}
	if result.Genres[0].Weight != 1.0 {
		t.Errorf("expected rank-1 weight=1.0, got %f", result.Genres[0].Weight)
	}
}

// TestTopGenres_UnknownDeviceID falls back gracefully when no ACR data matches.
func TestTopGenres_UnknownDeviceID(t *testing.T) {
	resp := get(t, "/top-genres?deviceId=00000000-0000-0000-0000-000000000000", nil)
	assertStatus(t, resp, 200)

	var result struct {
		Genres []struct{ Genre string `json:"genre"` } `json:"genres"`
	}
	decodeJSON(t, resp, &result)

	if len(result.Genres) != 9 {
		t.Errorf("expected 9 fallback genres for unknown device, got %d", len(result.Genres))
	}
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
