package main

import (
	"log"

	"alpaka/backend/config"
	"alpaka/backend/database"
	"alpaka/backend/routes"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Connect to database
	if err := database.Connect(cfg); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run migrations
	if err := database.Migrate(); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Create indexes
	if err := database.CreateIndexes(); err != nil {
		log.Printf("Warning: Failed to create indexes: %v", err)
	}

	// Setup routes
	webhookURL := config.GetEnv("WEBHOOK_URL", "")
	router := routes.SetupRoutes(webhookURL)

	// Start server
	addr := cfg.Server.Host + ":" + cfg.Server.Port
	log.Printf("Server starting on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}


