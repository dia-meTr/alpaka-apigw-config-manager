package utils

import (
	"time"

	"alpaka/backend/middleware"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateToken generates a JWT token for a user
func GenerateToken(userID uint, username, secretKey string) (string, error) {
	claims := &middleware.Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secretKey))
}


