package auth

// LoginRequest is the body for POST /auth/login.
// All fields are optional. Providing device_id links the account to ACR watch data.
type LoginRequest struct {
	Name      string   `json:"name,omitempty"`
	Age       int      `json:"age,omitempty"`
	Gender    string   `json:"gender,omitempty"`
	TopGenres []string `json:"top_genres,omitempty"`
	DeviceID  string   `json:"device_id,omitempty"`
}

// LoginResponse is returned on successful login.
type LoginResponse struct {
	UserID   int    `json:"user_id"`
	Token    string `json:"token"`
	DeviceID string `json:"device_id,omitempty"`
}
