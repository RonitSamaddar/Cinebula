package auth

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const usersCSVPath = "./databases/users.csv"
const defaultJWTSecret = "cinebula-dev-secret-2026"

var csvMu sync.Mutex

// Claims holds the JWT payload.
type Claims struct {
	UserID int    `json:"user_id"`
	Name   string `json:"name"`
	jwt.RegisteredClaims
}

func jwtSecret() []byte {
	if s := os.Getenv("JWT_SECRET"); s != "" {
		return []byte(s)
	}
	return []byte(defaultJWTSecret)
}

// RegisterUser returns the existing user_id if a user with the same name
// already exists in users.csv, otherwise appends a new row and returns the new ID.
func RegisterUser(req LoginRequest) (int, error) {
	csvMu.Lock()
	defer csvMu.Unlock()

	// Read all existing rows once.
	var rows [][]string
	if f, err := os.Open(usersCSVPath); err == nil {
		r := csv.NewReader(f)
		rows, _ = r.ReadAll()
		f.Close()
	}

	// Return existing user_id if name matches (case-insensitive).
	for i, row := range rows {
		if i == 0 || len(row) < 2 {
			continue // skip header
		}
		if strings.EqualFold(row[1], req.Name) {
			id, err := strconv.Atoi(row[0])
			if err != nil {
				continue
			}
			return id, nil
		}
	}

	// New user — determine next ID as max(existing user_id) + 1.
	nextID := 1
	for i, row := range rows {
		if i == 0 || len(row) == 0 {
			continue
		}
		if id, err := strconv.Atoi(row[0]); err == nil && id >= nextID {
			nextID = id + 1
		}
	}

	genresJSON, err := json.Marshal(req.TopGenres)
	if err != nil {
		return 0, fmt.Errorf("marshal top_genres: %w", err)
	}

	f, err := os.OpenFile(usersCSVPath, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0644)
	if err != nil {
		return 0, fmt.Errorf("open users.csv: %w", err)
	}
	defer f.Close()

	w := csv.NewWriter(f)
	if err := w.Write([]string{
		strconv.Itoa(nextID),
		req.Name,
		strconv.Itoa(req.Age),
		req.Gender,
		string(genresJSON),
		time.Now().UTC().Format(time.RFC3339),
	}); err != nil {
		return 0, err
	}
	w.Flush()
	return nextID, w.Error()
}

// IssueToken creates a signed JWT for the given user.
func IssueToken(userID int, name string) (string, error) {
	claims := Claims{
		UserID: userID,
		Name:   name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(jwtSecret())
}

// ParseToken validates a JWT string and returns the embedded claims.
func ParseToken(tokenStr string) (*Claims, error) {
	t, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return jwtSecret(), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := t.Claims.(*Claims)
	if !ok || !t.Valid {
		return nil, errors.New("invalid token claims")
	}
	return claims, nil
}
