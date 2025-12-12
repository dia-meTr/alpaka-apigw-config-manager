package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"alpaka/backend/database"
	"alpaka/backend/models"
)

// AutomationService handles automated status transitions and CI/CD integration
type AutomationService struct {
	WebhookURL string
}

// NewAutomationService creates a new automation service
func NewAutomationService(webhookURL string) *AutomationService {
	return &AutomationService{
		WebhookURL: webhookURL,
	}
}

// ProcessApprovedCR automatically transitions approved CRs to execution
func (s *AutomationService) ProcessApprovedCR(crID uint) error {
	var cr models.ChangeRequest
	if err := database.DB.First(&cr, "cr_id = ?", crID).Error; err != nil {
		return fmt.Errorf("change request not found: %w", err)
	}

	if cr.ApprovalStatus != models.ApprovalStatusApproved {
		return fmt.Errorf("change request is not approved")
	}

	if cr.ExecutionStatus == models.ExecutionStatusDraft {
		// Automatically transition to IN_PROGRESS
		cr.ExecutionStatus = models.ExecutionStatusInProgress
		if err := database.DB.Save(&cr).Error; err != nil {
			return fmt.Errorf("failed to update execution status: %w", err)
		}

		// Create history entry
		// Use system user ID 0 for automated actions
		systemUserID := uint(0)
		oldStatusStr := string(models.ExecutionStatusDraft)
		history := models.History{
			CRID:            cr.CRID,
			ChangedByUserID: systemUserID, // System automated action
			EventType:       "STATUS_CHANGE",
			OldStatus:       &oldStatusStr,
			NewStatus:       string(models.ExecutionStatusInProgress),
		}
		database.DB.Create(&history)

		// Trigger CI/CD webhook if configured
		if s.WebhookURL != "" {
			go s.TriggerWebhook(cr)
		}

		log.Printf("Automated: CR %d transitioned to IN_PROGRESS", crID)
	}

	return nil
}

// TriggerWebhook sends a webhook notification to CI/CD system
func (s *AutomationService) TriggerWebhook(cr models.ChangeRequest) {
	payload := map[string]interface{}{
		"cr_id":                cr.CRID,
		"title":                cr.Title,
		"config_changes":       cr.ConfigChangesPayload,
		"approval_status":      cr.ApprovalStatus,
		"execution_status":     cr.ExecutionStatus,
		"requester_user_id":    cr.RequesterUserID,
		"requester_team_id":    cr.RequesterTeamID,
		"timestamp":            time.Now().Unix(),
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Error marshaling webhook payload: %v", err)
		return
	}

	resp, err := http.Post(s.WebhookURL, "application/json", 
		bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("Error sending webhook: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Printf("Webhook sent successfully for CR %d", cr.CRID)
	} else {
		log.Printf("Webhook returned status %d for CR %d", resp.StatusCode, cr.CRID)
	}
}

// ValidateConfigChanges validates the configuration changes payload
func ValidateConfigChanges(payload string) error {
	// Basic JSON validation
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(payload), &config); err != nil {
		return fmt.Errorf("invalid JSON payload: %w", err)
	}

	// Add custom validation logic here
	// For example, validate required fields, structure, etc.

	return nil
}

// GetCRStatusForCI returns CR status in a format suitable for CI/CD systems
func GetCRStatusForCI(crID uint) (map[string]interface{}, error) {
	var cr models.ChangeRequest
	if err := database.DB.
		Preload("RequesterUser").
		Preload("RequesterTeam").
		First(&cr, "cr_id = ?", crID).Error; err != nil {
		return nil, fmt.Errorf("change request not found: %w", err)
	}

	status := map[string]interface{}{
		"cr_id":             cr.CRID,
		"title":             cr.Title,
		"approval_status":   cr.ApprovalStatus,
		"execution_status":  cr.ExecutionStatus,
		"can_execute":       cr.ApprovalStatus == models.ApprovalStatusApproved && cr.ExecutionStatus == models.ExecutionStatusDraft,
		"config_changes":    cr.ConfigChangesPayload,
		"requester_team":    cr.RequesterTeam.Name,
		"created_at":        cr.CreatedAt,
	}

	return status, nil
}

