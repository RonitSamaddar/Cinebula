package auth

// LoginRequest is the body for POST /auth/login.
type LoginRequest struct {
	Name      string   `json:"name"`
	Age       int      `json:"age"`
	Gender    string   `json:"gender"`
	TopGenres []string `json:"top_genres"`
}

// LoginResponse is returned on successful login.
type LoginResponse struct {
	UserID int    `json:"user_id"`
	Token  string `json:"token"`
}
