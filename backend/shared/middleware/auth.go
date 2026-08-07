package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "user_id"

func AuthMiddleware(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				slog.Error("Missing Authorization header")
				http.Error(w, "missing authorization header", http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				slog.Error("Invalid Authorization header format", "header", authHeader)
				http.Error(w, "invalid authorization header format", http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]
			slog.Info("Token received", "token_preview", tokenString[:20]+"...")

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					slog.Error("Invalid signing method", "method", token.Method)
					return nil, jwt.ErrSignatureInvalid
				}
				slog.Info("Using secret for validation", "secret_len", len(secret))
				return []byte(secret), nil
			})

			if err != nil {
				slog.Error("Token parse error", "error", err)
				http.Error(w, "invalid or expired token", http.StatusUnauthorized)
				return
			}

			if !token.Valid {
				slog.Error("Token is not valid")
				http.Error(w, "invalid or expired token", http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				slog.Error("Invalid token claims")
				http.Error(w, "invalid token claims", http.StatusUnauthorized)
				return
			}

			userID, ok := claims["user_id"].(string)
			if !ok || userID == "" {
				slog.Error("user_id not found in token")
				http.Error(w, "user_id not found in token", http.StatusUnauthorized)
				return
			}

			slog.Info("Token validated successfully", "user_id", userID)
			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	return userID, ok
}
