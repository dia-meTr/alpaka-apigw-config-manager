package middleware

import (
	"alpaka/backend/config"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware handles CORS headers and OPTIONS preflight requests
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get allowed origins from config or use defaults
		allowedOrigins := config.GetEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
		origins := strings.Split(allowedOrigins, ",")
		
		origin := c.Request.Header.Get("Origin")
		allowed := false
		
		// Check if origin is in the allowed list
		for _, ao := range origins {
			aoTrimmed := strings.TrimSpace(ao)
			if aoTrimmed == origin {
				allowed = true
				break
			}
		}
		
		// Set Access-Control-Allow-Origin header
		// Note: We must set a specific origin (not *) when using credentials
		if origin != "" {
			if allowed {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
				c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			} else {
				// For development: allow the origin anyway to prevent CORS errors
				// In production, you might want to reject these requests
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
				// Don't set credentials for non-allowed origins
			}
		} else {
			// For requests without origin (e.g., Postman, curl), allow all
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400") // 24 hours
		
		// Handle preflight OPTIONS request
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		
		c.Next()
	}
}
