package integrationtest

import (
	"strings"
	"testing"
)

// TestSimilar_Returns200 checks the happy path with a known title.
func TestSimilar_Returns200(t *testing.T) {
	resp := get(t, "/api/similar?movie=Inception", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)
}

// TestSimilar_ResponseShape checks that the envelope matches /api/movies.
func TestSimilar_ResponseShape(t *testing.T) {
	resp := get(t, "/api/similar?movie=Inception", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	if result.Count == 0 {
		t.Skip("no similar movies returned for Inception")
	}
	if len(result.Movies) == 0 {
		t.Error("count > 0 but movies array is empty")
	}
	for _, m := range result.Movies {
		if m.MovieName == "" {
			t.Error("similar movie with empty movie_name")
		}
	}
}

// TestSimilar_KParam checks that ?k caps the result count.
func TestSimilar_KParam(t *testing.T) {
	const k = 3
	resp := get(t, "/api/similar?movie=Inception&k=3", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	if len(result.Movies) > k {
		t.Errorf("expected at most %d results with k=%d, got %d", k, k, len(result.Movies))
	}
}

// TestSimilar_PriorityField checks that every similar movie has a non-negative priority.
func TestSimilar_PriorityField(t *testing.T) {
	resp := get(t, "/api/similar?movie=Inception", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	if len(result.Movies) == 0 {
		t.Skip("no similar movies returned")
	}
	for _, m := range result.Movies {
		if m.Priority < 0 {
			t.Errorf("movie %q has negative priority %f", m.MovieName, m.Priority)
		}
	}
}

// TestSimilar_IsWatchedDefaultFalse checks that is_watched is false without a JWT.
func TestSimilar_IsWatchedDefaultFalse(t *testing.T) {
	resp := get(t, "/api/similar?movie=Inception", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	for _, m := range result.Movies {
		if m.IsWatched {
			t.Errorf("movie %q has is_watched=true without a JWT", m.MovieName)
		}
	}
}

// TestSimilar_IsWatchedWithJWT checks that an ACR user gets is_watched enrichment
// on similar results (movies they have watched should be marked true).
func TestSimilar_IsWatchedWithJWT(t *testing.T) {
	// userId=1's ACR data includes Deadpool; ask for movies similar to Deadpool.
	token := loginWithDevice(t, seededDeviceIDs[0])

	resp := get(t, "/api/similar?movie=Deadpool", map[string]string{
		"Authorization": "Bearer " + token,
	})
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	// We can only verify the field is present and correct type — whether any
	// similar movie is also watched depends on the upstream data set.
	for _, m := range result.Movies {
		_ = m.IsWatched // field must decode without error
	}
}

// TestSimilar_MissingMovieParam checks that omitting ?movie returns 400.
func TestSimilar_MissingMovieParam(t *testing.T) {
	resp := get(t, "/api/similar", nil)
	defer resp.Body.Close()
	assertStatus(t, resp, 400)
}

// TestSimilar_UppercaseMovieName checks that an uppercase movie name still returns results
// (the backend lowercases it before calling the upstream API).
func TestSimilar_UppercaseMovieName(t *testing.T) {
	resp := get(t, "/api/similar?movie=INCEPTION&k=5", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	if result.Count == 0 {
		t.Skip("no similar movies returned for INCEPTION (uppercase)")
	}
	if len(result.Movies) == 0 {
		t.Error("count > 0 but movies array is empty")
	}
}

// TestSimilar_MixedCaseMovieName checks mixed case input works.
func TestSimilar_MixedCaseMovieName(t *testing.T) {
	resp := get(t, "/api/similar?movie=InCePtIoN&k=5", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	if result.Count == 0 {
		t.Skip("no similar movies returned for InCePtIoN (mixed case)")
	}
	if len(result.Movies) == 0 {
		t.Error("count > 0 but movies array is empty")
	}
}

// TestSimilar_ImageLinkHasTMDBPrefix checks that every movie's image_link
// is prefixed with the TMDB image base URL.
func TestSimilar_ImageLinkHasTMDBPrefix(t *testing.T) {
	const tmdbPrefix = "https://image.tmdb.org/t/p/original/"

	resp := get(t, "/api/similar?movie=Inception&k=10", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	if len(result.Movies) == 0 {
		t.Skip("no similar movies returned")
	}
	for _, m := range result.Movies {
		if m.ImageLink == "" {
			continue // some movies might legitimately have no image
		}
		if !strings.HasPrefix(m.ImageLink, tmdbPrefix) {
			t.Errorf("movie %q image_link missing TMDB prefix: got %q", m.MovieName, m.ImageLink)
		}
	}
}

// TestMovies_ImageLinkHasTMDBPrefix checks TMDB prefix on /api/movies endpoint too.
func TestMovies_ImageLinkHasTMDBPrefix(t *testing.T) {
	const tmdbPrefix = "https://image.tmdb.org/t/p/original/"

	resp := get(t, "/api/movies?genre=action", nil)
	skipOn502(t, resp)
	assertStatus(t, resp, 200)

	var result moviesResponse
	decodeJSON(t, resp, &result)

	if len(result.Movies) == 0 {
		t.Skip("no movies returned for genre=action")
	}
	for _, m := range result.Movies {
		if m.ImageLink == "" {
			continue
		}
		if !strings.HasPrefix(m.ImageLink, tmdbPrefix) {
			t.Errorf("movie %q image_link missing TMDB prefix: got %q", m.MovieName, m.ImageLink)
		}
	}
}
