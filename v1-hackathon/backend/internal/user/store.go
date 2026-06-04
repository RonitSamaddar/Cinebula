package user

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
)

const usersCSVPath = "./databases/users.csv"

// GetByID reads users.csv and returns the user matching userID.
func GetByID(userID int) (*User, error) {
	f, err := os.Open(usersCSVPath)
	if err != nil {
		return nil, fmt.Errorf("cannot open users.csv: %w", err)
	}
	defer f.Close()

	r := csv.NewReader(f)
	rows, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("read users.csv: %w", err)
	}

	for i, row := range rows {
		if i == 0 {
			continue // skip header
		}
		if len(row) < 6 {
			continue
		}
		id, _ := strconv.Atoi(row[0])
		if id != userID {
			continue
		}
		age, _ := strconv.Atoi(row[2])
		var genres []string
		_ = json.Unmarshal([]byte(row[4]), &genres)
		return &User{
			UserID:    id,
			Name:      row[1],
			Age:       age,
			Gender:    row[3],
			TopGenres: genres,
			CreatedAt: row[5],
		}, nil
	}
	return nil, fmt.Errorf("user %d not found", userID)
}
