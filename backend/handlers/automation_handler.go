package handlers

import (
	"net/http"

	"alpaka/backend/services"
	"alpaka/backend/utils"

	"github.com/gin-gonic/gin"
)

var automationService *services.AutomationService

// InitAutomationService initializes the automation service
func InitAutomationService(webhookURL string) {
	automationService = services.NewAutomationService(webhookURL)
}

// GetAutomationService returns the automation service instance
func GetAutomationService() *services.AutomationService {
	return automationService
}

// GetCRStatusForCI returns CR status for CI/CD integration
func GetCRStatusForCI(c *gin.Context) {
	crIDStr := c.Param("id")
	crID, ok := utils.ParseUint(crIDStr)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CR ID"})
		return
	}

	status, err := services.GetCRStatusForCI(crID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, status)
}

// TriggerAutomation manually triggers automation for a CR
func TriggerAutomation(c *gin.Context) {
	crIDStr := c.Param("id")
	crID, ok := utils.ParseUint(crIDStr)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CR ID"})
		return
	}

	if automationService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Automation service not initialized"})
		return
	}

	if err := automationService.ProcessApprovedCR(crID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Automation triggered successfully"})
}

