package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gocql/gocql"
)

// loadIMDBMap reads the TMDB CSV and returns a map of title -> imdb_id
func loadIMDBMap(path string) (map[string]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	reader := csv.NewReader(f)
	// Read header
	header, err := reader.Read()
	if err != nil {
		return nil, err
	}

	titleIdx, imdbIdx := -1, -1
	for i, h := range header {
		switch strings.TrimSpace(h) {
		case "title":
			titleIdx = i
		case "imdb_id":
			imdbIdx = i
		}
	}
	if titleIdx < 0 || imdbIdx < 0 {
		return nil, fmt.Errorf("CSV missing title or imdb_id columns")
	}

	result := make(map[string]string)
	for {
		record, err := reader.Read()
		if err != nil {
			break
		}
		title := strings.TrimSpace(record[titleIdx])
		imdbID := strings.TrimSpace(record[imdbIdx])
		if title != "" && imdbID != "" && result[title] == "" {
			result[title] = imdbID
		}
	}
	return result, nil
}

// fetchIMDBPage fetches the IMDB page HTML using curl to bypass WAF
func fetchIMDBPage(imdbID string) (string, error) {

	cmd := exec.Command("curl",
		fmt.Sprintf("https://www.imdb.com/title/%s/", imdbID),
		"-H", "accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
		"-H", "accept-language: en-US,en;q=0.9",
		"-H", "cache-control: max-age=0",
		"-b", "session-id=130-3844437-4031345; session-id-time=2082787201l; ubid-main=133-4880155-8879254; ci=eyJhZ2VTaWduYWwiOiJBRFVMVCIsImlzR2RwciI6ZmFsc2V9; ad-oo=0; session-token=E7VtsqVq7ucSi1ElExMzLK+Z/4A6t5MVvHo8nXSI08gUK4HEmgj9dMV9bQ4zkJbU8N6kq85aFXrEfTNFghU8bJrU6Tp/K4DC6FFnCnnJQwX43btDb/J8Nb6j1KaixYbWfit86ZbI7nYs8C+LKaMWqBEj06uNsBYjFxL6oWh09cqCSySbb62xuVZLhara8u/AKb8xqWixE7rAHyk5MSsDTeMLTFLhGEau; csm-hit=tb:E2686FZ2JGHT37RM6TK5+s-D2QQS7GVRNNZQREVNCXT|1780571457878&t:1780571457878&adb:adblk_no; aws-waf-token=3e012f03-fb89-43a7-b43c-79ed67fb5462:EQoAZOlN5T4IAAAA:junwWnaHvzdy/TFswyzxfly22jugxwak8ReL6svFmBArQHOp8JpmG4XlRzntJb/xCpbP9ikqmAqQa/BGjKbQorFyBca/4NAl6M3OuDIXsguMUwWvRcWl2yuWrm4veTFppgSYVrYBCZfkRlL2lR7OO5SPPyf1Xbtwg9Q0lmkNkgUTRMojG4/bn8cxGBOBeEE=",
		"-H", "priority: u=0, i",
		"-H", `sec-ch-ua: "Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"`,
		"-H", "sec-ch-ua-mobile: ?0",
		"-H", `sec-ch-ua-platform: "macOS"`,
		"-H", "sec-fetch-dest: document",
		"-H", "sec-fetch-mode: navigate",
		"-H", "sec-fetch-site: same-origin",
		"-H", "sec-fetch-user: ?1",
		"-H", "upgrade-insecure-requests: 1",
		"-H", "user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
	)

	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("curl failed: %v", err)
	}

	html := string(out)
	if len(html) < 1000 {
		return "", fmt.Errorf("response too short (%d bytes), likely blocked", len(html))
	}

	return html, nil
}

// IMDBData holds the scraped data from IMDB
type IMDBData struct {
	Cast       []string
	IMDBRating float64
	VoteCount  int64
}

// parseIMDBData extracts cast, rating, and vote count from the IMDB HTML page.
// The page embeds a JSON-LD script with structured data.
func parseIMDBData(html string) IMDBData {
	data := IMDBData{}

	// Extract the __NEXT_DATA__ JSON blob which contains all the structured data
	// Look for aggregateRating and Cast in the raw JSON embedded in the page

	// --- IMDB Rating ---
	// Pattern: "aggregateRating":N.N near "__typename":"RatingsSummary"
	ratingRe := regexp.MustCompile(`"aggregateRating"\s*:\s*([0-9]+\.?[0-9]*)`)
	if m := ratingRe.FindStringSubmatch(html); len(m) > 1 {
		data.IMDBRating, _ = strconv.ParseFloat(m[1], 64)
	}

	// --- Vote Count ---
	voteRe := regexp.MustCompile(`"voteCount"\s*:\s*([0-9]+)`)
	if m := voteRe.FindStringSubmatch(html); len(m) > 1 {
		data.VoteCount, _ = strconv.ParseInt(m[1], 10, 64)
	}

	// --- Cast ---
	// The IMDB page has JSON-LD with "actor" array containing cast names
	// Try JSON-LD first
	jsonLDRe := regexp.MustCompile(`<script type="application/ld\+json">(.*?)</script>`)
	if m := jsonLDRe.FindStringSubmatch(html); len(m) > 1 {
		var ld map[string]interface{}
		if err := json.Unmarshal([]byte(m[1]), &ld); err == nil {
			if actors, ok := ld["actor"].([]interface{}); ok {
				for _, a := range actors {
					if actorMap, ok := a.(map[string]interface{}); ok {
						if name, ok := actorMap["name"].(string); ok {
							data.Cast = append(data.Cast, name)
						}
					}
				}
			}
		}
	}

	// Fallback: extract cast from __typename: Cast pattern
	if len(data.Cast) == 0 {
		// Look for "text":"ActorName" near "__typename":"Cast"
		castRe := regexp.MustCompile(`"node"\s*:\s*\{[^}]*"name"\s*:\s*\{[^}]*"text"\s*:\s*"([^"]+)"[^}]*\}[^}]*"__typename"\s*:\s*"Cast"`)
		matches := castRe.FindAllStringSubmatch(html, -1)
		for _, m := range matches {
			if len(m) > 1 {
				data.Cast = append(data.Cast, m[1])
			}
		}
	}

	// Another fallback: simpler pattern - find "text":"Name" appearing before "__typename":"Cast"
	if len(data.Cast) == 0 {
		// Split by __typename":"Cast" and look backwards for "text":"..."
		parts := strings.Split(html, `"__typename":"Cast"`)
		textRe := regexp.MustCompile(`"text"\s*:\s*"([^"]+)"`)
		for _, part := range parts[:len(parts)-1] { // skip last segment
			// Get the last ~500 chars before the Cast marker
			segment := part
			if len(segment) > 500 {
				segment = segment[len(segment)-500:]
			}
			if m := textRe.FindAllStringSubmatch(segment, -1); len(m) > 0 {
				// Take the last match (closest to __typename: Cast)
				data.Cast = append(data.Cast, m[len(m)-1][1])
			}
		}
	}

	return data
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// 1. Load IMDB ID map from CSV
	fmt.Println("[1/4] Loading TMDB CSV for IMDB IDs...")
	imdbMap, err := loadIMDBMap("TMDB_movie_dataset_v11.csv")
	if err != nil {
		log.Fatalf("Failed to load TMDB CSV: %v", err)
	}
	fmt.Printf("  Loaded %d title->imdb_id mappings\n", len(imdbMap))

	// 2. Connect to Cassandra
	fmt.Println("[2/4] Connecting to Cassandra...")
	cluster := gocql.NewCluster("127.0.0.1")
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
	fmt.Println("  Connected!")

	// 3. Fetch movies from Cassandra where imdb_rating is not set
	fmt.Println("[3/4] Fetching movies without IMDB rating from Cassandra...")
	iter := session.Query("SELECT movie_name, imdb_rating FROM movies").Iter()
	var movieNames []string
	var name string
	var imdbRating float64
	for iter.Scan(&name, &imdbRating) {
		if imdbRating == 0 {
			movieNames = append(movieNames, name)
		}
	}
	if err := iter.Close(); err != nil {
		log.Fatalf("Failed to fetch movies: %v", err)
	}
	fmt.Printf("  Found %d movies without IMDB rating in Cassandra\n", len(movieNames))

	// 4. For each movie, look up IMDB ID, scrape, and update
	fmt.Println("[4/4] Scraping IMDB data...")
	successCount := 0
	deleteCount := 0
	failCount := 0

	for i, movieName := range movieNames {
		fmt.Printf("\n  [%d/%d] %s\n", i+1, len(movieNames), movieName)

		// Look up IMDB ID
		imdbID, ok := imdbMap[movieName]
		if !ok {
			fmt.Printf("    ⚠ No IMDB ID found in CSV, deleting from Cassandra...\n")
			err := session.Query(`DELETE FROM movies WHERE movie_name = ?`, movieName).Consistency(gocql.One).Exec()
			if err != nil {
				fmt.Printf("    ✗ Failed to delete: %v\n", err)
				failCount++
			} else {
				fmt.Printf("    🗑 Deleted!\n")
				deleteCount++
			}
			continue
		}
		fmt.Printf("    IMDB ID: %s\n", imdbID)

		// Fetch IMDB page
		html, err := fetchIMDBPage(imdbID)
		if err != nil {
			fmt.Printf("    ✗ Failed to fetch IMDB page: %v\n", err)
			failCount++
			continue
		}
		fmt.Printf("    Fetched %d bytes\n", len(html))

		// Parse data
		imdbData := parseIMDBData(html)
		fmt.Printf("    Rating: %.1f | Votes: %d | Cast: %v\n",
			imdbData.IMDBRating, imdbData.VoteCount, imdbData.Cast)

		// Update Cassandra
		err = session.Query(`
			UPDATE movies 
			SET imdb_rating = ?, vote_count = ?, casts = ?
			WHERE movie_name = ?`,
			imdbData.IMDBRating, imdbData.VoteCount, imdbData.Cast, movieName,
		).Consistency(gocql.One).Exec()
		if err != nil {
			fmt.Printf("    ✗ Failed to update Cassandra: %v\n", err)
			failCount++
			continue
		}

		fmt.Printf("    ✓ Updated!\n")
		successCount++
	}

	fmt.Printf("\n\nDone! Success: %d | Deleted: %d | Failed: %d\n",
		successCount, deleteCount, failCount)
}
