package config

import (
	"os"
	"github.com/joho/godotenv"
	"log"
)

type Config struct {
	Database DatabaseConfig
	Server   ServerConfig
	JWT      JWTConfig
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type ServerConfig struct {
	Port string
	Host string
}

type JWTConfig struct {
	SecretKey string
}

func Load() *Config {
	// Try to load .env file, but don't fail if it doesn't exist
	// This allows the app to run with system environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}
	return &Config{
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "3306"),
			User:     getEnv("DB_USER", "mysql"),
			Password: getEnv("DB_PASSWORD", "mysql"),
			DBName:   getEnv("DB_NAME", "alpaka"),
			SSLMode:  getEnv("DB_SSLMODE", "false"),
		},
		Server: ServerConfig{
			Port: getEnv("SERVER_PORT", "8080"),
			Host: getEnv("SERVER_HOST", "0.0.0.0"),
		},
		JWT: JWTConfig{
			SecretKey: getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// GetEnv is a public function to get environment variables
func GetEnv(key, defaultValue string) string {
	return getEnv(key, defaultValue)
}

