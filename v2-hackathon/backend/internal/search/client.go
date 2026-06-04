package search

import (
	"encoding/json"
	"os"
	"sync"

	meilisearch "github.com/meilisearch/meilisearch-go"
)

var (
	meiliOnce   sync.Once
	meiliClient meilisearch.ServiceManager
)

func getClient() meilisearch.ServiceManager {
	meiliOnce.Do(func() {
		host := os.Getenv("MEILI_HOST")
		if host == "" {
			host = "http://127.0.0.1:7700"
		}
		apiKey := os.Getenv("MEILI_API_KEY")
		meiliClient = meilisearch.New(host, meilisearch.WithAPIKey(apiKey))
	})
	return meiliClient
}

// SearchMovies queries Meilisearch for movies matching the query and returns
// their names ranked by relevance. limit caps the number of results.
func SearchMovies(query string, limit int64) ([]string, error) {
	resp, err := getClient().Index("movies").Search(query, &meilisearch.SearchRequest{
		Limit: limit,
	})
	if err != nil {
		return nil, err
	}

	names := make([]string, 0, len(resp.Hits))
	for _, hit := range resp.Hits {
		var raw json.RawMessage
		if r, ok := hit["movie_name"]; ok {
			raw = r
		} else {
			continue
		}
		var name string
		if err := json.Unmarshal(raw, &name); err != nil {
			continue
		}
		names = append(names, name)
	}
	return names, nil
}
