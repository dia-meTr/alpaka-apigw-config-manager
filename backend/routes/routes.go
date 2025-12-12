package routes

import (
	"alpaka/backend/handlers"
	"alpaka/backend/middleware"

	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all API routes
func SetupRoutes(webhookURL string) *gin.Engine {
	router := gin.Default()

	// Apply CORS middleware to all routes
	router.Use(middleware.CORSMiddleware())

	// Initialize automation service
	handlers.InitAutomationService(webhookURL)

	// Health check
	// Returns: {"status": "ok"}
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Public routes
	api := router.Group("/api/v1")
	{
		// Authentication
		auth := api.Group("/auth")
		{
			// POST /api/v1/auth/register
			// Request: {"username": "string", "email": "string", "password": "string"}
			// Returns: {"token": "string", "user": {"user_id": uint, "username": "string", "email": "string", ...}}
			auth.POST("/register", handlers.Register)

			// POST /api/v1/auth/login
			// Request: {"username": "string", "password": "string"}
			// Returns: {"token": "string", "user": {"user_id": uint, "username": "string", "email": "string", "is_super_manager": bool, "is_gateway_editor": bool, ...}}
			auth.POST("/login", handlers.Login)

			// GET /api/v1/auth/me
			// Returns: {"user_id": uint, "username": "string", "email": "string", "team_memberships": [...], "is_super_manager": bool, "is_gateway_editor": bool}
			auth.GET("/me", middleware.AuthMiddleware(), handlers.GetCurrentUser)
		}

		// Users
		users := api.Group("/users")
		users.Use(middleware.AuthMiddleware())
		{
			// GET /api/v1/users
			// Returns: [{"user_id": uint, "username": "string", "email": "string"}, ...]
			// Lists all users (for team member selection)
			users.GET("", handlers.ListUsers)
		}

		// Teams
		teams := api.Group("/teams")
		teams.Use(middleware.AuthMiddleware())
		{
			// POST /api/v1/teams (Gateway Editor only)
			// Request: {"name": "string"}
			// Returns: {"team_id": uint, "name": "string"}
			teams.POST("", middleware.RequireGatewayEditor(), handlers.CreateTeam)

			// GET /api/v1/teams
			// Returns: [{"team_id": uint, "name": "string", "members": [{"user_id": uint, "team_id": uint, "user": {...}}, ...]}, ...]
			teams.GET("", handlers.ListTeams)

			// GET /api/v1/teams/my-teams
			// Returns: [{"team_id": uint, "name": "string", "members": [{"user_id": uint, "team_id": uint, "user": {...}}, ...]}, ...]
			// Returns only teams that the current user belongs to
			teams.GET("/my-teams", handlers.GetMyTeams)

			// GET /api/v1/teams/:id
			// Returns: {"team_id": uint, "name": "string", "members": [{"user_id": uint, "team_id": uint, "user": {...}}, ...]}
			teams.GET("/:id", handlers.GetTeam)

			// POST /api/v1/teams/:id/members
			// Request: {"user_id": uint}
			// Returns: {"user_id": uint, "team_id": uint, "user": {...}, "team": {...}}
			teams.POST("/:id/members", handlers.AddTeamMember)

			// DELETE /api/v1/teams/:id/members/:user_id
			// Returns: {"message": "Team member removed successfully"}
			teams.DELETE("/:id/members/:user_id", handlers.RemoveTeamMember)
		}

		// Change Requests
		cr := api.Group("/change-requests")
		cr.Use(middleware.AuthMiddleware())
		{
			// POST /api/v1/change-requests
			// Request: {"title": "string", "config_changes_payload": "string", "requester_team_id": uint}
			// Returns: {"cr_id": uint, "requester_user_id": uint, "requester_team_id": uint, "title": "string", "config_changes_payload": "string", "approval_status": "string", "execution_status": "string", "created_at": "timestamp", ...}
			cr.POST("", handlers.CreateChangeRequest)

			// GET /api/v1/change-requests
			// Query params: approval_status, execution_status, team_id, user_id, page, limit
			// Returns: [{"cr_id": uint, "title": "string", "approval_status": "string", "execution_status": "string", "requester_user": {...}, "requester_team": {...}, ...}, ...]
			cr.GET("", handlers.ListChangeRequests)

			// GET /api/v1/change-requests/:id
			// Returns: {"cr_id": uint, "title": "string", "config_changes_payload": "string", "approval_status": "string", "execution_status": "string", "requester_user": {...}, "requester_team": {...}, "reviews": [...], "comments": [...], "history": [...], ...}
			cr.GET("/:id", handlers.GetChangeRequest)

			// PUT /api/v1/change-requests/:id
			// Request: {"title": "string", "config_changes_payload": "string"} (both optional)
			// Returns: Updated change request object
			cr.PUT("/:id", handlers.UpdateChangeRequest)

			// POST /api/v1/change-requests/:id/comments
			// Request: {"comment_text": "string"}
			// Returns: {"comment_id": uint, "cr_id": uint, "user_id": uint, "comment_text": "string", "created_at": "timestamp", "user": {...}}
			cr.POST("/:id/comments", handlers.AddComment)

			// GET /api/v1/change-requests/:id/comments
			// Returns: [{"comment_id": uint, "cr_id": uint, "user_id": uint, "comment_text": "string", "created_at": "timestamp", "user": {...}}, ...]
			cr.GET("/:id/comments", handlers.GetComments)

			// GET /api/v1/change-requests/:id/history
			// Returns: [{"history_id": uint, "cr_id": uint, "changed_by_user_id": uint, "event_type": "string", "old_status": "string", "new_status": "string", "timestamp": "timestamp", "changed_by": {...}}, ...]
			cr.GET("/:id/history", handlers.GetHistory)

			// Super Manager routes
			// POST /api/v1/change-requests/:id/review (Super Manager only)
			// Request: {"review_decision": "APPROVED" | "REJECTED"}
			// Returns: Updated change request with approval status changed
			cr.POST("/:id/review", middleware.RequireSuperManager(), handlers.ReviewChangeRequest)

			// Gateway Editor routes
			// PUT /api/v1/change-requests/:id/execution-status (Gateway Editor only)
			// Request: {"execution_status": "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELED"}
			// Returns: Updated change request with execution status changed
			cr.PUT("/:id/execution-status", middleware.RequireGatewayEditor(), handlers.UpdateExecutionStatus)
		}

		// Admin routes
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware())
		{
			// Super Managers
			// POST /api/v1/admin/super-managers (Super Manager only)
			// Request: {"user_id": uint}
			// Returns: {"user_id": uint, "added_at": "timestamp", "user": {...}}
			admin.POST("/super-managers", middleware.RequireSuperManager(), handlers.AddSuperManager)

			// DELETE /api/v1/admin/super-managers/:id (Super Manager only)
			// Returns: {"message": "Super manager removed successfully"}
			admin.DELETE("/super-managers/:id", middleware.RequireSuperManager(), handlers.RemoveSuperManager)

			// GET /api/v1/admin/super-managers
			// Returns: [{"user_id": uint, "added_at": "timestamp", "user": {...}}, ...]
			admin.GET("/super-managers", handlers.ListSuperManagers)

			// Gateway Editors
			// POST /api/v1/admin/gateway-editors (Super Manager only)
			// Request: {"user_id": uint}
			// Returns: {"user_id": uint, "added_at": "timestamp", "user": {...}}
			admin.POST("/gateway-editors", middleware.RequireSuperManager(), handlers.AddGatewayEditor)

			// DELETE /api/v1/admin/gateway-editors/:id (Super Manager only)
			// Returns: {"message": "Gateway editor removed successfully"}
			admin.DELETE("/gateway-editors/:id", middleware.RequireSuperManager(), handlers.RemoveGatewayEditor)

			// GET /api/v1/admin/gateway-editors
			// Returns: [{"user_id": uint, "added_at": "timestamp", "user": {...}}, ...]
			admin.GET("/gateway-editors", handlers.ListGatewayEditors)
		}

		// Automation/CI-CD routes
		automation := api.Group("/automation")
		{
			// GET /api/v1/automation/change-requests/:id/status
			// Public endpoint for CI/CD systems (can be secured with API keys)
			// Returns: {"cr_id": uint, "title": "string", "approval_status": "string", "execution_status": "string", "can_execute": bool, "config_changes": "string", "requester_team": "string", "created_at": "timestamp"}
			automation.GET("/change-requests/:id/status", handlers.GetCRStatusForCI)

			// POST /api/v1/automation/change-requests/:id/trigger
			// Returns: {"message": "Automation triggered successfully"}
			automation.POST("/change-requests/:id/trigger", middleware.AuthMiddleware(), handlers.TriggerAutomation)
		}
	}

	return router
}
