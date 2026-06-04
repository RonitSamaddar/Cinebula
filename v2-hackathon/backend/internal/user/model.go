package user

// User represents a registered user stored in databases/users.csv.
type User struct {
	UserID    int      `json:"user_id"`
	Name      string   `json:"name"`
	Age       int      `json:"age"`
	Gender    string   `json:"gender"`
	TopGenres []string `json:"top_genres"`
	CreatedAt string   `json:"created_at"`
}
