package acrprocessor

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"sort"
	"strings"
	"time"
)

const (
	acrDataPath    = "./data-dirs/ACR-data/acr-data.json"
	dataConstsPath = "./data-dirs/data-consts.json"
)

// TopGenresForUser computes watch-time-weighted genre scores for the given userID.
func TopGenresForUser(userID int) ([]GenreWeight, error) {
	users, consts, err := loadACRData()
	if err != nil {
		return nil, err
	}

	var found *ACRUser
	for i := range users {
		if users[i].UserID == userID {
			found = &users[i]
			break
		}
	}
	if found == nil {
		return nil, fmt.Errorf("user %d not found in ACR data", userID)
	}

	return computeTopGenres(found, consts.GenreWeightMatrix)
}

// TopGenresForDevice looks up a user by device_id and returns their top genres.
func TopGenresForDevice(deviceID string) ([]GenreWeight, error) {
	users, consts, err := loadACRData()
	if err != nil {
		return nil, err
	}

	var found *ACRUser
	for i := range users {
		if users[i].DeviceID == deviceID {
			found = &users[i]
			break
		}
	}
	if found == nil {
		return nil, fmt.Errorf("device %q not found in ACR data", deviceID)
	}

	return computeTopGenres(found, consts.GenreWeightMatrix)
}

// WatchedTitlesForUser returns a set of lower-cased movie titles the user has
// watched, keyed for O(1) lookup. Returns an empty map (not an error) when the
// user has no ACR data.
func WatchedTitlesForUser(userID int) (map[string]bool, error) {
	acrRaw, err := os.ReadFile(acrDataPath)
	if err != nil {
		return map[string]bool{}, fmt.Errorf("read ACR data: %w", err)
	}
	var users []ACRUser
	if err := json.Unmarshal(acrRaw, &users); err != nil {
		return map[string]bool{}, fmt.Errorf("parse ACR data: %w", err)
	}

	watched := map[string]bool{}
	for _, u := range users {
		if u.UserID != userID {
			continue
		}
		for _, s := range u.Sessions {
			if t := strings.TrimSpace(strings.ToLower(s.ShowTitle)); t != "" {
				watched[t] = true
			}
		}
		break
	}
	return watched, nil
}

// loadACRData loads and parses acr-data.json and data-consts.json.
func loadACRData() ([]ACRUser, dataConsts, error) {
	var consts dataConsts

	acrRaw, err := os.ReadFile(acrDataPath)
	if err != nil {
		return nil, consts, fmt.Errorf("read ACR data: %w", err)
	}
	var users []ACRUser
	if err := json.Unmarshal(acrRaw, &users); err != nil {
		return nil, consts, fmt.Errorf("parse ACR data: %w", err)
	}

	constsRaw, err := os.ReadFile(dataConstsPath)
	if err != nil {
		return nil, consts, fmt.Errorf("read data-consts: %w", err)
	}
	if err := json.Unmarshal(constsRaw, &consts); err != nil {
		return nil, consts, fmt.Errorf("parse data-consts: %w", err)
	}

	return users, consts, nil
}

// computeTopGenres computes watch-time-weighted genre scores for the given ACR user.
//
// Algorithm:
//  1. For each session, compute duration in seconds.
//  2. Distribute duration equally across all genres of that title.
//  3. Apply per-genre bias from genreWeightMatrix (dampens over-represented genres).
//  4. Normalise adjusted totals to [0, 1].
//  5. Return genres with weight > 0, sorted descending.
func computeTopGenres(found *ACRUser, wm map[string]float64) ([]GenreWeight, error) {
	// step 1+2: accumulate seconds per genre
	genreSeconds := map[string]float64{}
	for _, s := range found.Sessions {
		dur := sessionDurationSeconds(s)
		if dur <= 0 || len(s.ShowGenres) == 0 {
			continue
		}
		perGenre := dur / float64(len(s.ShowGenres))
		for _, g := range s.ShowGenres {
			genreSeconds[g] += perGenre
		}
	}
	if len(genreSeconds) == 0 {
		return nil, fmt.Errorf("no watch data for user/device")
	}

	// step 3: apply genre bias matrix
	adjusted := make(map[string]float64, len(genreSeconds))
	for g, secs := range genreSeconds {
		bias := wm[g]
		if bias == 0 {
			bias = 1.0
		}
		adjusted[g] = secs * bias
	}

	// step 4: normalise to [0, 1]
	var total float64
	for _, v := range adjusted {
		total += v
	}
	if total == 0 {
		total = 1
	}

	result := make([]GenreWeight, 0, len(adjusted))
	for g, v := range adjusted {
		w := math.Round((v/total)*10000) / 10000 // 4 decimal places
		if w > 0 {
			result = append(result, GenreWeight{Genre: g, Weight: w})
		}
	}

	// step 5: sort descending by weight
	sort.Slice(result, func(i, j int) bool {
		if result[i].Weight != result[j].Weight {
			return result[i].Weight > result[j].Weight
		}
		return result[i].Genre < result[j].Genre // stable tie-break
	})

	return result, nil
}

// sessionDurationSeconds returns the viewing duration in seconds for a session.
// Returns 0 if either timestamp is missing or unparseable.
func sessionDurationSeconds(s ACRSession) float64 {
	if s.SessionStartTimestampUTC == "" || s.SessionEndTimestampUTC == "" {
		return 0
	}
	start, err1 := time.Parse(time.RFC3339Nano, s.SessionStartTimestampUTC)
	end, err2 := time.Parse(time.RFC3339Nano, s.SessionEndTimestampUTC)
	if err1 != nil || err2 != nil {
		return 0
	}
	d := end.Sub(start).Seconds()
	if d < 0 {
		return 0
	}
	return d
}
