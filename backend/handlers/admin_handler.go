package handlers

import (
	"net/http"

	"alpaka/backend/database"
	"alpaka/backend/models"
	"alpaka/backend/utils"

	"github.com/gin-gonic/gin"
)

type AddSuperManagerRequest struct {
	UserID uint `json:"user_id" binding:"required"`
}

type AddGatewayEditorRequest struct {
	UserID uint `json:"user_id" binding:"required"`
}

// AddSuperManager adds a user to the super managers list
func AddSuperManager(c *gin.Context) {
	var req AddSuperManagerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user exists
	var user models.User
	if err := database.DB.First(&user, "user_id = ?", req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check if already a super manager
	var existing models.SuperManager
	if err := database.DB.Where("user_id = ?", req.UserID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User is already a super manager"})
		return
	}

	superManager := models.SuperManager{
		UserID: req.UserID,
	}

	if err := database.DB.Create(&superManager).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add super manager"})
		return
	}

	database.DB.Preload("User").First(&superManager, superManager.UserID)
	c.JSON(http.StatusCreated, superManager)
}

// RemoveSuperManager removes a user from super managers
func RemoveSuperManager(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, ok := utils.ParseUint(userIDStr)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := database.DB.Where("user_id = ?", userID).Delete(&models.SuperManager{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove super manager"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Super manager removed successfully"})
}

// ListSuperManagers lists all super managers
func ListSuperManagers(c *gin.Context) {
	var superManagers []models.SuperManager
	if err := database.DB.Preload("User").Find(&superManagers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch super managers"})
		return
	}

	c.JSON(http.StatusOK, superManagers)
}

// AddGatewayEditor adds a user to the gateway editors list
func AddGatewayEditor(c *gin.Context) {
	var req AddGatewayEditorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user exists
	var user models.User
	if err := database.DB.First(&user, "user_id = ?", req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check if already a gateway editor
	var existing models.GatewayEditor
	if err := database.DB.Where("user_id = ?", req.UserID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User is already a gateway editor"})
		return
	}

	gatewayEditor := models.GatewayEditor{
		UserID: req.UserID,
	}

	if err := database.DB.Create(&gatewayEditor).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add gateway editor"})
		return
	}

	database.DB.Preload("User").First(&gatewayEditor, gatewayEditor.UserID)
	c.JSON(http.StatusCreated, gatewayEditor)
}

// RemoveGatewayEditor removes a user from gateway editors
func RemoveGatewayEditor(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, ok := utils.ParseUint(userIDStr)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := database.DB.Where("user_id = ?", userID).Delete(&models.GatewayEditor{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove gateway editor"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Gateway editor removed successfully"})
}

// ListGatewayEditors lists all gateway editors
func ListGatewayEditors(c *gin.Context) {
	var gatewayEditors []models.GatewayEditor
	if err := database.DB.Preload("User").Find(&gatewayEditors).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch gateway editors"})
		return
	}

	c.JSON(http.StatusOK, gatewayEditors)
}


