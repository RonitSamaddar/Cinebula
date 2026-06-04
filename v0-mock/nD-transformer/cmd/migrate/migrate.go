package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gocql/gocql"
)

type MovieJSON struct {
	Rank  int    `json:"rank"`
	Movie string `json:"movie"`
	Tags  string `json:"tags"`
}

type MovieData struct {
	MovieName   string
	ImageLink   string
	VoteAverage float64
	VoteCount   int64
	Revenue     int64
	Budget      int64
	Popularity  float64
	Cast        []string
	Genres      []string
	Language    string
	IMDBRating  float64
	Synopsis    string
	Keywords    []string
	// Top-level boolean flags keyed by sanitized column name
	Flags map[string]bool
}

func main() {
	// 1. Load movie.json
	jsonFile, err := os.ReadFile("../json-to-embedding-vector/movie.json")
	if err != nil {
		log.Fatalf("Failed to read movie.json: %v", err)
	}
	var moviesJSON []MovieJSON
	if err := json.Unmarshal(jsonFile, &moviesJSON); err != nil {
		log.Fatalf("Failed to parse movie.json: %v", err)
	}

	// Build a set of movie names and their tags from JSON
	movieTags := make(map[string][]string)
	for _, m := range moviesJSON {
		name := strings.TrimSpace(m.Movie)
		tags := parseTags(m.Tags)
		movieTags[name] = tags
	}

	// 2. Load CSV and index by title
	csvData, err := loadCSV("../json-to-embedding-vector/TMDB_movie_dataset_v11.csv")
	if err != nil {
		log.Fatalf("Failed to load CSV: %v", err)
	}

	// 3. Build MovieData for each movie in movie.json
	var movies []MovieData
	for name, tags := range movieTags {
		md := MovieData{
			MovieName:  name,
			IMDBRating: 0.0,
			Keywords:   tags,
			Cast:       []string{}, // leave empty for now
		}

		if row, ok := csvData[name]; ok {
			md.VoteAverage = parseFloat(row["vote_average"])
			md.VoteCount = parseInt64(row["vote_count"])
			md.Revenue = parseInt64(row["revenue"])
			md.Budget = parseInt64(row["budget"])
			md.Popularity = parseFloat(row["popularity"])
			md.Language = row["original_language"]
			md.Synopsis = row["overview"]
			md.ImageLink = row["poster_path"]
			md.Genres = parseCSVList(row["genres"])
		}

		// Build top-level flag map
		md.Flags = make(map[string]bool)
		for _, g := range md.Genres {
			if col := sanitizeColumnName(g); col != "" {
				md.Flags[col] = true
			}
		}
		for _, k := range md.Keywords {
			if col := sanitizeColumnName(k); col != "" {
				md.Flags[col] = true
			}
		}

		movies = append(movies, md)
	}

	// Collect all unique flag column names across all movies
	allFlagColumns := make(map[string]bool)
	for _, m := range movies {
		for col := range m.Flags {
			allFlagColumns[col] = true
		}
	}

	// 4. Connect to Cassandra
	cluster := gocql.NewCluster("127.0.0.1")
	cluster.Port = 9042
	cluster.Consistency = gocql.Quorum
	cluster.Timeout = 30 * time.Second
	cluster.ConnectTimeout = 30 * time.Second

	// Create keyspace
	sessSystem, err := createSessionWithKeyspace(cluster, "system")
	if err != nil {
		log.Fatalf("Failed to connect to Cassandra: %v", err)
	}
	err = sessSystem.Query(`
		CREATE KEYSPACE IF NOT EXISTS cinebula
		WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
	`).Exec()
	if err != nil {
		log.Fatalf("Failed to create keyspace: %v", err)
	}
	sessSystem.Close()

	// Connect to cinebula keyspace
	session, err := createSessionWithKeyspace(cluster, "cinebula")
	if err != nil {
		log.Fatalf("Failed to connect to cinebula keyspace: %v", err)
	}
	defer session.Close()

	// Create base table
	err = session.Query(`
		CREATE TABLE IF NOT EXISTS movies (
			movie_name text PRIMARY KEY,
			image_link text,
			vote_average double,
			vote_count bigint,
			revenue bigint,
			budget bigint,
			popularity double,
			casts list<text>,
			genres list<text>,
			language text,
			imdb_rating double,
			synopsis text,
			keywords list<text>
		)
	`).Exec()
	if err != nil {
		log.Fatalf("Failed to create table: %v", err)
	}

	// Add top-level boolean columns for each genre/keyword flag
	for col := range allFlagColumns {
		q := fmt.Sprintf("ALTER TABLE movies ADD %s boolean", col)
		// Ignore error if column already exists
		_ = session.Query(q).Exec()
	}

	fmt.Printf("Inserting %d movies into Cassandra...\n", len(movies))

	// 5. Insert/overwrite data
	baseCols := []string{
		"movie_name", "image_link", "vote_average", "vote_count",
		"revenue", "budget", "popularity", "casts", "genres",
		"language", "imdb_rating", "synopsis", "keywords",
	}

	for _, m := range movies {
		cols := make([]string, len(baseCols))
		copy(cols, baseCols)
		vals := []interface{}{
			m.MovieName, m.ImageLink, m.VoteAverage, m.VoteCount,
			m.Revenue, m.Budget, m.Popularity, m.Cast, m.Genres,
			m.Language, m.IMDBRating, m.Synopsis, m.Keywords,
		}

		// Add flag columns that are true for this movie
		for col := range m.Flags {
			cols = append(cols, col)
			vals = append(vals, true)
		}

		placeholders := make([]string, len(cols))
		for i := range placeholders {
			placeholders[i] = "?"
		}

		query := fmt.Sprintf("INSERT INTO movies (%s) VALUES (%s)",
			strings.Join(cols, ", "),
			strings.Join(placeholders, ", "),
		)

		err := session.Query(query, vals...).Exec()
		if err != nil {
			log.Printf("Failed to insert %s: %v", m.MovieName, err)
		} else {
			fmt.Printf("  ✓ %s\n", m.MovieName)
		}
	}

	fmt.Println("Migration complete!")
}

func createSessionWithKeyspace(cluster *gocql.ClusterConfig, keyspace string) (*gocql.Session, error) {
	c := *cluster
	c.Keyspace = keyspace
	return c.CreateSession()
}

func loadCSV(path string) (map[string]map[string]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	reader := csv.NewReader(f)
	headers, err := reader.Read()
	if err != nil {
		return nil, err
	}

	result := make(map[string]map[string]string)
	for {
		record, err := reader.Read()
		if err != nil {
			break
		}

		rating, _ := strconv.ParseFloat(record[2], 64)
		if rating == 0 {
			continue // skip movies with 0 rating
		}
		row := make(map[string]string)
		for i, h := range headers {
			if i < len(record) {
				row[h] = record[i]
			}
		}
		title := strings.TrimSpace(row["title"])
		if title != "" && result[title] == nil {
			result[title] = row
		}
	}
	return result, nil
}

func parseTags(tags string) []string {
	parts := strings.Split(tags, ",")
	var result []string
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t != "" {
			result = append(result, t)
		}
	}
	return result
}

func parseCSVList(s string) []string {
	parts := strings.Split(s, ",")
	var result []string
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t != "" {
			result = append(result, t)
		}
	}
	return result
}

func parseFloat(s string) float64 {
	v, _ := strconv.ParseFloat(strings.TrimSpace(s), 64)
	return v
}

func parseInt64(s string) int64 {
	s = strings.TrimSpace(s)
	// Handle float strings like "1.6e+08"
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return int64(f)
}

func sanitizeColumnName(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	// Replace spaces, hyphens, and other non-alphanumeric chars with underscores
	var b strings.Builder
	for _, c := range s {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' {
			b.WriteRune(c)
		} else {
			b.WriteRune('_')
		}
	}
	result := b.String()
	// Skip values that start with a digit (e.g. "1990s", "90s")
	if len(result) > 0 && result[0] >= '0' && result[0] <= '9' {
		return ""
	}
	return result
}
