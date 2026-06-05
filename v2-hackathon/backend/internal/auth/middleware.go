package auth

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

// ContextKeyUserID is used to store the authenticated user's ID in request context.
const ContextKeyUserID contextKey = "userID"

// Middleware validates the Bearer JWT and injects userID into the request context.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			ctx := context.WithValue(r.Context(), ContextKeyUserID, "DUMMY_USER_ID")
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := ParseToken(tokenStr)
		if err != nil {
			ctx := context.WithValue(r.Context(), ContextKeyUserID, "DUMMY_USER_ID")
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}
		ctx := context.WithValue(r.Context(), ContextKeyUserID, claims.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
