package handlers

import (
	"net/http"

	"alpaka/backend/database"
	"alpaka/backend/models"
	"alpaka/backend/utils"

	"github.com/gin-gonic/gin"
)

type CreateTeamRequest struct {
	Name string `json:"name" binding:"required"`
}

type AddTeamMemberRequest struct {
	UserID uint `json:"user_id" binding:"required"`
}

// CreateTeam creates a new team
func CreateTeam(c *gin.Context) {
	var req CreateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	team := models.Team{
		Name: req.Name,
	}

	if err := database.DB.Create(&team).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create team"})
		return
	}

	c.JSON(http.StatusCreated, team)
}

// ListTeams lists all teams
func ListTeams(c *gin.Context) {
	var teams []models.Team
	if err := database.DB.Preload("Members.User").Find(&teams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch teams"})
		return
	}

	c.JSON(http.StatusOK, teams)
}

// GetTeam retrieves a single team with its members
func GetTeam(c *gin.Context) {
	teamIDStr := c.Param("id")
	teamID, ok := utils.ParseUint(teamIDStr)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid team ID"})
		return
	}

	var team models.Team
	// Preload members with their user information
	if err := database.DB.Preload("Members.User").First(&team, "team_id = ?", teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	// Ensure members are included in the response (even if empty)
	c.JSON(http.StatusOK, team)
}

// AddTeamMember adds a user to a team
// User can add members if they are:
// 1. A member of the team, OR
// 2. A gateway editor
func AddTeamMember(c *gin.Context) {
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userID, ok := userIDInterface.(uint)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	teamIDStr := c.Param("id")
	teamID, ok := utils.ParseUint(teamIDStr)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid team ID"})
		return
	}

	var team models.Team
	if err := database.DB.First(&team, "team_id = ?", teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	var req AddTeamMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check permissions: user must be either a member of the team OR a gateway editor
	var membership models.UserTeamMembership
	isTeamMember := database.DB.Where("user_id = ? AND team_id = ?", userID, teamID).First(&membership).Error == nil

	var gatewayEditor models.GatewayEditor
	isGatewayEditor := database.DB.Where("user_id = ?", userID).First(&gatewayEditor).Error == nil

	if !isTeamMember && !isGatewayEditor {
		c.JSON(http.StatusForbidden, gin.H{"error": "You must be a member of this team or a gateway editor to add members"})
		return
	}

	// Check if user to be added exists
	var user models.User
	if err := database.DB.First(&user, "user_id = ?", req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check if membership already exists
	var existingMembership models.UserTeamMembership
	if err := database.DB.Where("user_id = ? AND team_id = ?", req.UserID, teamID).First(&existingMembership).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User is already a member of this team"})
		return
	}

	membership = models.UserTeamMembership{
		UserID: req.UserID,
		TeamID: teamID,
	}

	if err := database.DB.Create(&membership).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add team member"})
		return
	}

	database.DB.Preload("User").Preload("Team").First(&membership, membership.UserID, membership.TeamID)
	c.JSON(http.StatusCreated, membership)
}

// RemoveTeamMember removes a user from a team
// User can remove members if they are:
// 1. A member of the team, OR
// 2. A gateway editor
func RemoveTeamMember(c *gin.Context) {
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	currentUserID, ok := userIDInterface.(uint)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	teamIDStr := c.Param("id")
	userIDStr := c.Param("user_id")

	teamID, ok1 := utils.ParseUint(teamIDStr)
	userID, ok2 := utils.ParseUint(userIDStr)
	if !ok1 || !ok2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid team or user ID"})
		return
	}

	// Check permissions: user must be either a member of the team OR a gateway editor
	var membership models.UserTeamMembership
	isTeamMember := database.DB.Where("user_id = ? AND team_id = ?", currentUserID, teamID).First(&membership).Error == nil

	var gatewayEditor models.GatewayEditor
	isGatewayEditor := database.DB.Where("user_id = ?", currentUserID).First(&gatewayEditor).Error == nil

	if !isTeamMember && !isGatewayEditor {
		c.JSON(http.StatusForbidden, gin.H{"error": "You must be a member of this team or a gateway editor to remove members"})
		return
	}

	if err := database.DB.Where("user_id = ? AND team_id = ?", userID, teamID).Delete(&models.UserTeamMembership{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove team member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Team member removed successfully"})
}

// GetMyTeams retrieves all teams that the current user belongs to
func GetMyTeams(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get all team memberships for the current user
	var memberships []models.UserTeamMembership
	if err := database.DB.Where("user_id = ?", userID).Preload("Team.Members.User").Find(&memberships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch teams"})
		return
	}

	// Extract teams from memberships
	teams := make([]models.Team, len(memberships))
	for i, membership := range memberships {
		teams[i] = membership.Team
	}

	c.JSON(http.StatusOK, teams)
}
