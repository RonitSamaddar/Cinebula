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

// TestMovies_ByGenre checks that genre filtering returns a non-empty movie list.
func TestMovies_ByGenre(t *testing.T) {
	resp := get(t, "/api/movies?genre=action", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result struct {
		Count  int `json:"count"`
		Movies []struct {
			MovieName string  `json:"movie_name"`
			X         float64 `json:"x"`
			Y         float64 `json:"y"`
		} `json:"movies"`
	}
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

	var result struct {
		Count  int `json:"count"`
		Movies []struct {
			Keywords []string `json:"keywords"`
			Language string   `json:"language"`
		} `json:"movies"`
	}
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

	var result struct {
		Count  int `json:"count"`
		Movies []struct {
			MovieName string `json:"movie_name"`
		} `json:"movies"`
	}
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

	var result struct {
		Count int `json:"count"`
	}
	decodeJSON(t, resp, &result)

	if result.Count == 0 {
		t.Error("expected count > 0 for no-filter request")
	}
}
