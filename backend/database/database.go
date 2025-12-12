package database

import (
	"fmt"
	"log"

	"alpaka/backend/config"
	"alpaka/backend/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Connect initializes the database connection
func Connect(cfg *config.Config) error {
	// MySQL DSN format: [username[:password]@][protocol[(address)]]/dbname[?param1=value1&...&paramN=valueN]
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.DBName,
	)

	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Info),
		DisableForeignKeyConstraintWhenMigrating: true, // Prevent GORM from creating FKs during AutoMigrate
	})

	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Database connection established")
	return nil
}

// Migrate runs database migrations
func Migrate() error {
	// Disable foreign key checks during migration to avoid ordering issues
	DB.Exec("SET FOREIGN_KEY_CHECKS = 0")

	// Migrate in order: base tables first, then dependent tables
	err := DB.AutoMigrate(
		&models.User{},
		&models.Team{},
		&models.UserTeamMembership{},
		&models.SuperManager{},
		&models.GatewayEditor{},
		&models.ChangeRequest{},
		&models.SuperManagerReview{},
		&models.Comment{},
		&models.History{},
	)

	// Re-enable foreign key checks
	DB.Exec("SET FOREIGN_KEY_CHECKS = 1")

	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	log.Println("Database migrations completed")
	return nil
}

// CreateIndexes creates additional indexes for performance
// Note: MySQL doesn't support IF NOT EXISTS in CREATE INDEX, so we check if index exists first
func CreateIndexes() error {
	indexes := []struct {
		tableName string
		indexName string
		columns   string
	}{
		{"change_requests", "idx_change_requests_approval_status", "approval_status"},
		{"change_requests", "idx_change_requests_execution_status", "execution_status"},
		{"change_requests", "idx_change_requests_requester_user_id", "requester_user_id"},
		{"change_requests", "idx_change_requests_requester_team_id", "requester_team_id"},
		{"cr_history", "idx_history_cr_id", "cr_id"},
		{"cr_history", "idx_history_timestamp", "timestamp"},
	}

	for _, idx := range indexes {
		// Check if index exists
		var count int64
		checkSQL := fmt.Sprintf(
			"SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?",
		)
		if err := DB.Raw(checkSQL, idx.tableName, idx.indexName).Scan(&count).Error; err != nil {
			log.Printf("Warning: Failed to check index %s: %v", idx.indexName, err)
			continue
		}

		// Create index if it doesn't exist
		if count == 0 {
			createSQL := fmt.Sprintf("CREATE INDEX %s ON %s(%s)", idx.indexName, idx.tableName, idx.columns)
			if err := DB.Exec(createSQL).Error; err != nil {
				log.Printf("Warning: Failed to create index %s: %v", idx.indexName, err)
				// Don't return error, just log warning
			}
		}
	}

	log.Println("Database indexes checked/created")
	return nil
}
