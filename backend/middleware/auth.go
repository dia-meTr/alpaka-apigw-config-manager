package middleware

import (
	"net/http"
	"strings"

	"alpaka/backend/database"
	"alpaka/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// AuthMiddleware validates JWT tokens
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims := &Claims{}

		// For now, we'll use a simple token validation
		// In production, use proper JWT secret from config
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte("your-secret-key"), nil // Should come from config
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Set user context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Next()
	}
}

// RequireSuperManager checks if user is a super manager
func RequireSuperManager() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		var superManager models.SuperManager
		if err := database.DB.Where("user_id = ?", userID).First(&superManager).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Super manager access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireGatewayEditor checks if user is a gateway editor
func RequireGatewayEditor() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		var gatewayEditor models.GatewayEditor
		if err := database.DB.Where("user_id = ?", userID).First(&gatewayEditor).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Gateway editor access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalAuth allows requests with or without authentication
func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString := parts[1]
				claims := &Claims{}
				token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
					return []byte("your-secret-key"), nil
				})

				if err == nil && token.Valid {
					c.Set("user_id", claims.UserID)
					c.Set("username", claims.Username)
				}
			}
		}
		c.Next()
	}
}


