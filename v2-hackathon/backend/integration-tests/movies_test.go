package integrationtest

import (
	"io"
	"net/http"
	"testing"
)

// skipOn502 skips the test if the response is a 502 (upstream unavailable).
func skipOn502(t *testing.T, resp *http.Response) {
	t.Helper()
	if resp.StatusCode == 502 {
		io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
		t.Skip("upstream data service unreachable")
	}
}

// movieItem is the common shape returned by /api/movies and /api/similar.
type movieItem struct {
	MovieName   string   `json:"movie_name"`
	X           float64  `json:"x"`
	Y           float64  `json:"y"`
	Priority    float64  `json:"priority"`
	IsWatched   bool     `json:"is_watched"`
	VoteAverage float64  `json:"vote_average"`
	Language    string   `json:"language"`
	Keywords    []string `json:"keywords"`
}

type moviesResponse struct {
	Count  int         `json:"count"`
	Movies []movieItem `json:"movies"`
}

// TestMovies_ByGenre checks that genre filtering returns a non-empty movie list.
func TestMovies_ByGenre(t *testing.T) {
	resp := get(t, "/api/movies?genre=action", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	if result.Count == 0 {
		t.Error("expected count > 0 for genre=action")
	}
	if len(result.Movies) == 0 {
		t.Error("expected movies array to be non-empty")
	}
	for _, m := range result.Movies {
		if m.MovieName == "" {
			t.Error("movie with empty movie_name returned")
		}
	}
}

// TestMovies_GenreKeywordLanguage checks combined filters.
func TestMovies_GenreKeywordLanguage(t *testing.T) {
	resp := get(t, "/api/movies?genre=action&keyword=heist&language=en", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	for _, m := range result.Movies {
		if m.Language != "en" {
			t.Errorf("expected language=en, got %q", m.Language)
		}
	}
}

// TestMovies_TitleSearch checks that movie_name returns matching results.
func TestMovies_TitleSearch(t *testing.T) {
	resp := get(t, "/api/movies?movie_name=inception", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	if result.Count == 0 {
		t.Skip("no results for movie_name=inception")
	}

	found := false
	for _, m := range result.Movies {
		if m.MovieName == "Inception" {
			found = true
			break
		}
	}
	if !found {
		t.Error("Inception not found in movie_name=inception results")
	}
}

// TestMovies_NoParams checks that a no-filter request returns movies.
func TestMovies_NoParams(t *testing.T) {
	resp := get(t, "/api/movies", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	if result.Count == 0 {
		t.Error("expected count > 0 for no-filter request")
	}
}

// TestMovies_PriorityField checks that every movie in a genre response has a
// non-negative priority score.
func TestMovies_PriorityField(t *testing.T) {
	resp := get(t, "/api/movies?genre=action", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	if len(result.Movies) == 0 {
		t.Skip("no movies returned")
	}
	for _, m := range result.Movies {
		if m.Priority < 0 {
			t.Errorf("movie %q has negative priority %f", m.MovieName, m.Priority)
		}
	}
}

// TestMovies_IsWatchedDefaultFalse checks that is_watched is false for every
// movie when no JWT is sent.
func TestMovies_IsWatchedDefaultFalse(t *testing.T) {
	resp := get(t, "/api/movies?genre=action", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	if len(result.Movies) == 0 {
		t.Skip("no movies returned")
	}
	for _, m := range result.Movies {
		if m.IsWatched {
			t.Errorf("movie %q has is_watched=true without a JWT", m.MovieName)
		}
	}
}

// TestMovies_IsWatchedWithACRUser checks that at least one movie is marked
// is_watched=true when the request is made with a JWT for a user who has ACR data.
func TestMovies_IsWatchedWithACRUser(t *testing.T) {
	// userId=1 has ACR data including "Deadpool" (Action genre).
	token := loginWithDevice(t, seededDeviceIDs[0])

	resp := get(t, "/api/movies?genre=action", map[string]string{
		"Authorization": "Bearer " + token,
	})
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	if len(result.Movies) == 0 {
		t.Skip("no movies returned")
	}

	watched := 0
	for _, m := range result.Movies {
		if m.IsWatched {
			watched++
		}
	}
	if watched == 0 {
		t.Error("expected at least one is_watched=true movie for ACR user 1 on genre=action")
	}
}

// TestMovies_IsWatchedGuestFalse checks that a freshly registered guest (no ACR
// data) receives all is_watched=false.
func TestMovies_IsWatchedGuestFalse(t *testing.T) {
	resp := post(t, "/auth/login", map[string]any{})
	assertStatus(t, resp, 200)
	var login struct {
		Token string `json:"token"`
	}
	decodeJSON(t, resp, &login)

	moviesResp := get(t, "/api/movies?genre=action", map[string]string{
		"Authorization": "Bearer " + login.Token,
	})
	skipOn502(t, moviesResp)
	assertStatus(t, moviesResp, 200)

	var result moviesResponse
	decodeJSON(t, moviesResp, &result)

	for _, m := range result.Movies {
		if m.IsWatched {
			t.Errorf("guest user: movie %q unexpectedly has is_watched=true", m.MovieName)
		}
	}
}
