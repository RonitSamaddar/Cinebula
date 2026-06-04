package dataservice

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// httpClient is a shared client with a sensible timeout so upstream calls
// never hang the server indefinitely.
var httpClient = &http.Client{Timeout: 15 * time.Second}

// Fetch calls the TKACR external movies API with the given optional filters
// and returns the parsed MoviesResponse.
//
// Any parameter that is an empty string is omitted from the upstream request.
// Supported filters (all optional):
//
//	genre      – genre name, e.g. "action"
//	keyword    – keyword tag, e.g. "heist"
//	language   – ISO 639-1 code, e.g. "en"
//	movieName  – title substring, e.g. "inception"
func Fetch(genre, keyword, language, movieName string) (*MoviesResponse, error) {
	u, err := url.Parse(TKACRBaseURL + "/api/movies")
	if err != nil {
		return nil, fmt.Errorf("invalid base URL: %w", err)
	}

	q := u.Query()
	if genre != "" {
		q.Set("genre", genre)
	}
	if keyword != "" {
		q.Set("keyword", keyword)
	}
	if language != "" {
		q.Set("language", language)
	}
	if movieName != "" {
		q.Set("movie_name", movieName)
	}
	u.RawQuery = q.Encode()

	resp, err := httpClient.Get(u.String())
	if err != nil {
		return nil, fmt.Errorf("upstream request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upstream returned status %d", resp.StatusCode)
	}

	var result MoviesResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode upstream response: %w", err)
	}
	prefixImageURLs(&result)
	return &result, nil
}

// FetchSimilar calls the TKACR /api/similar endpoint and returns movies similar
// to the given title.
//
//	movie – exact or partial movie name (required)
//	k     – max number of results; 0 uses the upstream default
func FetchSimilar(movie string, k int) (*MoviesResponse, error) {
	u, err := url.Parse(TKACRBaseURL + "/api/similar")
	if err != nil {
		return nil, fmt.Errorf("invalid base URL: %w", err)
	}

	q := u.Query()
	q.Set("movie", strings.ToLower(movie))
	if k > 0 {
		q.Set("k", fmt.Sprintf("%d", k))
	}
	u.RawQuery = q.Encode()

	resp, err := httpClient.Get(u.String())
	if err != nil {
		return nil, fmt.Errorf("upstream request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upstream returned status %d", resp.StatusCode)
	}

	var result MoviesResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode upstream response: %w", err)
	}
	prefixImageURLs(&result)
	return &result, nil
}

// prefixImageURLs prepends TMDBImagePrefix to each movie's ImageLink
// unless it already starts with http.
func prefixImageURLs(r *MoviesResponse) {
	for i := range r.Movies {
		link := r.Movies[i].ImageLink
		if link != "" && !strings.HasPrefix(link, "http") {
			r.Movies[i].ImageLink = TMDBImagePrefix + link
		}
	}
}
