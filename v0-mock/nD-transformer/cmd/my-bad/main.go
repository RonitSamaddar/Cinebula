package main

import (
	"fmt"
	"log"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gocql/gocql"
)

func main() {
	// 1. Connect to Cassandra
	fmt.Println("[1/4] Connecting to Cassandra...")
	cluster := gocql.NewCluster("127.0.0.1")
	cluster.Port = 9042
	cluster.Keyspace = "cinebula"
	cluster.Consistency = gocql.Quorum
	cluster.Timeout = 60 * time.Second
	cluster.ConnectTimeout = 60 * time.Second

	session, err := cluster.CreateSession()
	if err != nil {
		log.Fatalf("Failed to connect to Cassandra: %v", err)
	}
	defer session.Close()
	fmt.Println("  Connected to cinebula keyspace")

	// 2. Read all movies and collect unique cast names
	fmt.Println("[2/4] Reading all movies from Cassandra...")
	type movieCasts struct {
		MovieName string
		Casts     []string
	}

	var allMovies []movieCasts
	allCastColumns := make(map[string]bool)

	iter := session.Query("SELECT movie_name, casts FROM movies").Iter()
	var movieName string
	var casts []string
	for iter.Scan(&movieName, &casts) {
		sanitized := make([]string, 0, len(casts))
		for _, c := range casts {
			col := sanitizeColumnName(c)
			if col != "" {
				sanitized = append(sanitized, col)
				allCastColumns[col] = true
			}
		}
		allMovies = append(allMovies, movieCasts{
			MovieName: movieName,
			Casts:     sanitized,
		})
	}
	if err := iter.Close(); err != nil {
		log.Fatalf("Failed to read movies: %v", err)
	}
	fmt.Printf("  Read %d movies, found %d unique cast columns\n", len(allMovies), len(allCastColumns))

	// 3. Alter table — add boolean columns for each cast member
	fmt.Printf("[3/4] Adding %d cast flag columns to table (concurrent)...\n", len(allCastColumns))
	var added int64
	var wg sync.WaitGroup
	sem := make(chan struct{}, 20) // limit concurrency to 20
	for col := range allCastColumns {
		wg.Add(1)
		go func(col string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			q := fmt.Sprintf("ALTER TABLE movies ADD %s boolean", col)
			err := session.Query(q).Exec()
			if err != nil {
				if !strings.Contains(err.Error(), "already exist") &&
					!strings.Contains(err.Error(), "conflicts") &&
					!strings.Contains(err.Error(), "Invalid column name") {
					log.Printf("  Warning: ALTER TABLE ADD %s: %v", col, err)
				}
			} else {
				atomic.AddInt64(&added, 1)
			}
		}(col)
	}
	wg.Wait()
	fmt.Printf("  Added %d new columns (%d already existed)\n", added, int64(len(allCastColumns))-added)

	// 4. Update each movie — set cast flag columns to true
	fmt.Println("[4/4] Updating movies with cast flags...")
	for i, m := range allMovies {
		if len(m.Casts) == 0 {
			continue
		}
		fmt.Printf("  [%d/%d] Updating %s (%d casts)...\n", i+1, len(allMovies), m.MovieName, len(m.Casts))

		// Build SET clause: col1 = true, col2 = true, ...
		setClauses := make([]string, 0, len(m.Casts))
		for _, col := range m.Casts {
			setClauses = append(setClauses, fmt.Sprintf("%s = true", col))
		}

		query := fmt.Sprintf("UPDATE movies SET %s WHERE movie_name = ?",
			strings.Join(setClauses, ", "),
		)

		err := session.Query(query, m.MovieName).Exec()
		if err != nil {
			log.Printf("  ✗ Failed to update %s: %v", m.MovieName, err)
		} else {
			fmt.Printf("  ✓ %s\n", m.MovieName)
		}
	}

	fmt.Println("Cast flag migration complete!")
}

func sanitizeColumnName(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var b strings.Builder
	for _, c := range s {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' {
			b.WriteRune(c)
		} else {
			b.WriteRune('_')
		}
	}
	result := b.String()
	// Skip values that start with a digit
	if len(result) > 0 && result[0] >= '0' && result[0] <= '9' {
		return ""
	}
	return result
}
