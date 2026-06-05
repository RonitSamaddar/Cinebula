package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gocql/gocql"
)

// Movie represents a row from the Cassandra movies table.
// All pointer fields will be omitted from JSON when null.
type Movie struct {
	MovieName   *string  `json:"movie_name,omitempty"`
	ImageLink   *string  `json:"image_link,omitempty"`
	VoteAverage *float64 `json:"vote_average,omitempty"`
	VoteCount   *int64   `json:"vote_count,omitempty"`
	Revenue     *int64   `json:"revenue,omitempty"`
	Budget      *int64   `json:"budget,omitempty"`
	Popularity  *float64 `json:"popularity,omitempty"`
	Casts       []string `json:"casts,omitempty"`
	Genres      []string `json:"genres,omitempty"`
	Language    *string  `json:"language,omitempty"`
	IMDBRating  *float64 `json:"imdb_rating,omitempty"`
	Synopsis    *string  `json:"synopsis,omitempty"`
	Keywords    []string `json:"keywords,omitempty"`
}

func getCassandraHost() string {
	if host := os.Getenv("CASSANDRA_HOST"); host != "" {
		return host
	}
	return "127.0.0.1"
}

func main() {
	fmt.Println("Connecting to Cassandra...")

	cluster := gocql.NewCluster(getCassandraHost())
	cluster.Port = 9042
	cluster.Keyspace = "cinebula"
	cluster.Consistency = gocql.Quorum
	cluster.Timeout = 30 * time.Second
	cluster.ConnectTimeout = 30 * time.Second

	session, err := cluster.CreateSession()
	if err != nil {
		log.Fatalf("Failed to connect to Cassandra: %v", err)
	}
	defer session.Close()
	fmt.Println("Connected to Cassandra (cinebula keyspace)")

	// Query all movies
	query := `SELECT movie_name, image_link, vote_average, vote_count,
		revenue, budget, popularity, casts, genres, language,
		imdb_rating, synopsis, keywords FROM movies`

	iter := session.Query(query).Iter()

	var movies []Movie
	for {
		m := Movie{}
		var movieName, imageLink, language, synopsis string
		var voteAverage, popularity, imdbRating float64
		var voteCount, revenue, budget int64
		var casts, genres, keywords []string

		if !iter.Scan(&movieName, &imageLink, &voteAverage, &voteCount,
			&revenue, &budget, &popularity, &casts, &genres, &language,
			&imdbRating, &synopsis, &keywords) {
			break
		}

		// Only set fields that have non-zero/non-empty values
		if movieName != "" {
			m.MovieName = &movieName
		}
		if imageLink != "" {
			m.ImageLink = &imageLink
		}
		if voteAverage != 0 {
			m.VoteAverage = &voteAverage
		}
		if voteCount != 0 {
			m.VoteCount = &voteCount
		}
		if revenue != 0 {
			m.Revenue = &revenue
		}
		if budget != 0 {
			m.Budget = &budget
		}
		if popularity != 0 {
			m.Popularity = &popularity
		}
		if len(casts) > 0 {
			m.Casts = casts
		}
		if len(genres) > 0 {
			m.Genres = genres
		}
		if language != "" {
			m.Language = &language
		}
		if imdbRating != 0 {
			m.IMDBRating = &imdbRating
		}
		if synopsis != "" {
			m.Synopsis = &synopsis
		}
		if len(keywords) > 0 {
			m.Keywords = keywords
		}

		movies = append(movies, m)
	}

	if err := iter.Close(); err != nil {
		log.Fatalf("Cassandra query error: %v", err)
	}

	fmt.Printf("Fetched %d movies from Cassandra\n", len(movies))

	// Marshal to JSON with indentation
	data, err := json.MarshalIndent(movies, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal JSON: %v", err)
	}

	// Write to movies.json
	outputFile := "movies.json"
	if err := os.WriteFile(outputFile, data, 0644); err != nil {
		log.Fatalf("Failed to write %s: %v", outputFile, err)
	}

	fmt.Printf("Dumped %d movies to %s\n", len(movies), outputFile)
}
