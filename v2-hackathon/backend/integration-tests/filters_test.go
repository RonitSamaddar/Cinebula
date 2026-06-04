package integrationtest

import (
	"testing"
)

// TestFilters_Returns200 checks that the endpoint is reachable and returns 200.
func TestFilters_Returns200(t *testing.T) {
	resp := get(t, "/api/filters", nil)
	assertStatus(t, resp, 200)
	resp.Body.Close()
}

// TestFilters_NoAuthRequired confirms the endpoint is public (no JWT needed).
func TestFilters_NoAuthRequired(t *testing.T) {
	resp := get(t, "/api/filters", nil)
	assertStatus(t, resp, 200) // must not return 401
	resp.Body.Close()
}

// TestFilters_ThreeDimensions checks that exactly three filter dimensions are returned.
func TestFilters_ThreeDimensions(t *testing.T) {
	resp := get(t, "/api/filters", nil)
	assertStatus(t, resp, 200)

	var result struct {
		Filters []struct {
			ID     string   `json:"id"`
			Label  string   `json:"label"`
			Values []string `json:"values"`
		} `json:"filters"`
	}
	decodeJSON(t, resp, &result)

	if len(result.Filters) != 3 {
		t.Fatalf("expected 3 filter dimensions, got %d", len(result.Filters))
	}
}

// TestFilters_IDs checks that the three dimensions have the expected IDs.
func TestFilters_IDs(t *testing.T) {
	resp := get(t, "/api/filters", nil)
	assertStatus(t, resp, 200)

	var result struct {
		Filters []struct {
			ID string `json:"id"`
		} `json:"filters"`
	}
	decodeJSON(t, resp, &result)

	expected := []string{"genre", "language", "cast"}
	for i, want := range expected {
		if i >= len(result.Filters) {
			t.Fatalf("filter at index %d missing", i)
		}
		if result.Filters[i].ID != want {
			t.Errorf("filter[%d].id = %q, expected %q", i, result.Filters[i].ID, want)
		}
	}
}

// TestFilters_GenreValues checks that genre values are non-empty and contain known genres.
func TestFilters_GenreValues(t *testing.T) {
	resp := get(t, "/api/filters", nil)
	assertStatus(t, resp, 200)

	var result struct {
		Filters []struct {
			ID     string   `json:"id"`
			Values []string `json:"values"`
		} `json:"filters"`
	}
	decodeJSON(t, resp, &result)

	var genreValues []string
	for _, f := range result.Filters {
		if f.ID == "genre" {
			genreValues = f.Values
			break
		}
	}

	if len(genreValues) == 0 {
		t.Fatal("genre filter has no values")
	}

	// Spot-check a few well-known genres.
	must := []string{"Action", "Drama", "Comedy"}
	index := make(map[string]bool, len(genreValues))
	for _, g := range genreValues {
		index[g] = true
	}
	for _, g := range must {
		if !index[g] {
			t.Errorf("expected genre %q in values, not found", g)
		}
	}
}

// TestFilters_LanguageValues checks that language values are non-empty and contain English.
func TestFilters_LanguageValues(t *testing.T) {
	resp := get(t, "/api/filters", nil)
	assertStatus(t, resp, 200)

	var result struct {
		Filters []struct {
			ID     string   `json:"id"`
			Values []string `json:"values"`
		} `json:"filters"`
	}
	decodeJSON(t, resp, &result)

	var langValues []string
	for _, f := range result.Filters {
		if f.ID == "language" {
			langValues = f.Values
			break
		}
	}

	if len(langValues) == 0 {
		t.Fatal("language filter has no values")
	}

	found := false
	for _, l := range langValues {
		if l == "English" {
			found = true
			break
		}
	}
	if !found {
		t.Error("expected \"English\" in language values")
	}
}

// TestFilters_CastValues checks that cast values are non-empty and contain major actors.
func TestFilters_CastValues(t *testing.T) {
	resp := get(t, "/api/filters", nil)
	assertStatus(t, resp, 200)

	var result struct {
		Filters []struct {
			ID     string   `json:"id"`
			Values []string `json:"values"`
		} `json:"filters"`
	}
	decodeJSON(t, resp, &result)

	var castValues []string
	for _, f := range result.Filters {
		if f.ID == "cast" {
			castValues = f.Values
			break
		}
	}

	if len(castValues) < 20 {
		t.Fatalf("expected at least 20 cast values, got %d", len(castValues))
	}

	// Spot-check a few well-known names.
	must := []string{"Tom Hanks", "Leonardo DiCaprio", "Morgan Freeman"}
	index := make(map[string]bool, len(castValues))
	for _, c := range castValues {
		index[c] = true
	}
	for _, name := range must {
		if !index[name] {
			t.Errorf("expected cast member %q in values, not found", name)
		}
	}
}

// TestFilters_ValuesNonEmpty ensures no filter dimension has an empty values array.
func TestFilters_ValuesNonEmpty(t *testing.T) {
	resp := get(t, "/api/filters", nil)
	assertStatus(t, resp, 200)

	var result struct {
		Filters []struct {
			ID     string   `json:"id"`
			Label  string   `json:"label"`
			Values []string `json:"values"`
		} `json:"filters"`
	}
	decodeJSON(t, resp, &result)

	for _, f := range result.Filters {
		if len(f.Values) == 0 {
			t.Errorf("filter %q has empty values array", f.ID)
		}
		if f.Label == "" {
			t.Errorf("filter %q has empty label", f.ID)
		}
	}
}
