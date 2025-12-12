package handlers

import (
	"net/http"
	//"strconv"
	//"time"

	"alpaka/backend/database"
	"alpaka/backend/models"
	"alpaka/backend/utils"

	"github.com/gin-gonic/gin"
)

type CreateCRRequest struct {
	Title               string `json:"title" binding:"required"`
	ConfigChangesPayload string `json:"config_changes_payload" binding:"required"`
	RequesterTeamID     uint   `json:"requester_team_id" binding:"required"`
}

type UpdateCRRequest struct {
	Title               string `json:"title"`
	ConfigChangesPayload string `json:"config_changes_payload"`
}

type ReviewCRRequest struct {
	ReviewDecision string `json:"review_decision" binding:"required"` // "APPROVED" or "REJECTED"
}

type UpdateExecutionStatusRequest struct {
	ExecutionStatus string `json:"execution_status" binding:"required"`
}

type CommentRequest struct {
	CommentText string `json:"comment_text" binding:"required"`
}

// CreateChangeRequest creates a new change request
func CreateChangeRequest(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var req CreateCRRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify user is member of the requester team
	var membership models.UserTeamMembership
	if err := database.DB.Where("user_id = ? AND team_id = ?", userID, req.RequesterTeamID).First(&membership).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "User is not a member of the specified team"})
		return
	}

	// Create change request
	cr := models.ChangeRequest{
		RequesterUserID:      userID,
		RequesterTeamID:      req.RequesterTeamID,
		Title:                req.Title,
		ConfigChangesPayload: req.ConfigChangesPayload,
		ApprovalStatus:       models.ApprovalStatusPending,
		ExecutionStatus:      models.ExecutionStatusDraft,
	}

	if err := database.DB.Create(&cr).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create change request"})
		return
	}

	// Create history entry
	oldStatus := ""
	history := models.History{
		CRID:            cr.CRID,
		ChangedByUserID: userID,
		EventType:       "CREATED",
		OldStatus:       &oldStatus,
		NewStatus:       string(cr.ApprovalStatus),
	}
	database.DB.Create(&history)

	// Load relationships
	database.DB.Preload("RequesterUser").Preload("RequesterTeam").First(&cr, cr.CRID)

	c.JSON(http.StatusCreated, cr)
}

// GetChangeRequest retrieves a single change request
func GetChangeRequest(c *gin.Context) {
	crIDStr := c.Param("id")
	crID, ok := utils.ParseUint(crIDStr)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CR ID"})
		return
	}

	var cr models.ChangeRequest
	if err := database.DB.
		Preload("RequesterUser").
		Preload("RequesterTeam").
		Preload("Reviews.SuperManager").
		Preload("Comments.User").
		Preload("History.ChangedBy").
		First(&cr, "cr_id = ?", crID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Change request not found"})
		return
	}

	c.JSON(http.StatusOK, cr)
}

// ListChangeRequests lists all change requests with filters
func ListChangeRequests(c *gin.Context) {
	var crs []models.ChangeRequest
	query := database.DB.Preload("RequesterUser").Preload("RequesterTeam")

	// Filters
	if approvalStatus := c.Query("approval_status"); approvalStatus != "" {
		query = query.Where("approval_status = ?", approvalStatus)
	}
	if executionStatus := c.Query("execution_status"); executionStatus != "" {
		query = query.Where("execution_status = ?", executionStatus)
	}
	if teamIDStr := c.Query("team_id"); teamIDStr != "" {
		if teamID, ok := utils.ParseUint(teamIDStr); ok {
			query = query.Where("requester_team_id = ?", teamID)
		}
	}
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, ok := utils.ParseUint(userIDStr); ok {
			query = query.Where("requester_user_id = ?", userID)
		}
	}

	// Pagination
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "20")
	query = query.Order("created_at DESC").Limit(20)
	if page != "1" {
		offset := (parseInt(page) - 1) * parseInt(limit)
		query = query.Offset(offset)
	}

	if err := query.Find(&crs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch change requests"})
		return
	}

	c.JSON(http.StatusOK, crs)
}

// UpdateChangeRequest updates a change request (only if not approved)
func UpdateChangeRequest(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	crIDStr := c.Param("id")
	crID, ok := utils.ParseUint(crIDStr)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CR ID"})
		return
	}

	var cr models.ChangeRequest
	if err := database.DB.First(&cr, "cr_id = ?", crID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Change request not found"})
		return
	}

	// Only requester can update, and only if not approved
	if cr.RequesterUserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the requester can update this change request"})
		return
	}

	if cr.ApprovalStatus == models.ApprovalStatusApproved {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot update an approved change request"})
		return
	}

	var req UpdateCRRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	oldStatus := string(cr.ApprovalStatus)

	// Update fields
	if req.Title != "" {
		cr.Title = req.Title
	}
	if req.ConfigChangesPayload != "" {
		cr.ConfigChangesPayload = req.ConfigChangesPayload
	}

	if err := database.DB.Save(&cr).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update change request"})
		return
	}

	// Create history entry
	history := models.History{
		CRID:            cr.CRID,
		ChangedByUserID: userID,
		EventType:       "UPDATED",
		OldStatus:       &oldStatus,
		NewStatus:       string(cr.ApprovalStatus),
	}
	database.DB.Create(&history)

	c.JSON(http.StatusOK, cr)
}

// ReviewChangeRequest allows a super manager to approve/reject a CR
func ReviewChangeRequest(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	crIDStr := c.Param("id")
	crID, ok := utils.ParseUint(crIDStr)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CR ID"})
		return
	}

	var cr models.ChangeRequest
	if err := database.DB.First(&cr, "cr_id = ?", crID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Change request not found"})
		return
	}

	if cr.ApprovalStatus != models.ApprovalStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Change request is not pending approval"})
		return
	}

	var req ReviewCRRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var decision models.ReviewDecision
	switch req.ReviewDecision {
	case "APPROVED":
		decision = models.ReviewDecisionApproved
		cr.ApprovalStatus = models.ApprovalStatusApproved
	case "REJECTED":
		decision = models.ReviewDecisionRejected
		cr.ApprovalStatus = models.ApprovalStatusRejected
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid review decision. Must be APPROVED or REJECTED"})
		return
	}

	// Create review record
	review := models.SuperManagerReview{
		CRID:           cr.CRID,
		SMUserID:       userID,
		ReviewDecision: decision,
	}

	// Update CR and create review in transaction
	tx := database.DB.Begin()
	if err := tx.Save(&cr).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update change request"})
		return
	}

	if err := tx.Create(&review).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create review"})
		return
	}

	// Create history entry
	oldStatusStr := string(models.ApprovalStatusPending)
	history := models.History{
		CRID:            cr.CRID,
		ChangedByUserID: userID,
		EventType:       "STATUS_CHANGE",
		OldStatus:       &oldStatusStr,
		NewStatus:       string(cr.ApprovalStatus),
	}
	if err := tx.Create(&history).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create history"})
		return
	}

	tx.Commit()

	// Automatically process approved CRs
	if cr.ApprovalStatus == models.ApprovalStatusApproved {
		// Trigger automation in background (non-blocking)
		go func() {
			svc := GetAutomationService()
			if svc != nil {
				if err := svc.ProcessApprovedCR(cr.CRID); err != nil {
					// Log error but don't fail the request
					// In production, use proper logging
				}
			}
		}()
	}

	// Load relationships
	database.DB.Preload("RequesterUser").Preload("RequesterTeam").Preload("Reviews").First(&cr, cr.CRID)

	c.JSON(http.StatusOK, cr)
}

// UpdateExecutionStatus allows a gateway editor to update execution status
func UpdateExecutionStatus(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	crIDStr := c.Param("id")
	crID, ok := utils.ParseUint(crIDStr)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CR ID"})
		return
	}

	var cr models.ChangeRequest
	if err := database.DB.First(&cr, "cr_id = ?", crID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Change request not found"})
		return
	}

	if cr.ApprovalStatus != models.ApprovalStatusApproved {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Change request must be approved before execution"})
		return
	}

	var req UpdateExecutionStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var newStatus models.ExecutionStatus
	switch req.ExecutionStatus {
	case "DRAFT":
		newStatus = models.ExecutionStatusDraft
	case "IN_PROGRESS":
		newStatus = models.ExecutionStatusInProgress
	case "COMPLETED":
		newStatus = models.ExecutionStatusCompleted
	case "CANCELED":
		newStatus = models.ExecutionStatusCanceled
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid execution status"})
		return
	}

	oldStatus := string(cr.ExecutionStatus)
	cr.ExecutionStatus = newStatus

	if err := database.DB.Save(&cr).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update execution status"})
		return
	}

	// Create history entry
	history := models.History{
		CRID:            cr.CRID,
		ChangedByUserID: userID,
		EventType:       "STATUS_CHANGE",
		OldStatus:       &oldStatus,
		NewStatus:       string(newStatus),
	}
	database.DB.Create(&history)

	c.JSON(http.StatusOK, cr)
}

// AddComment adds a comment to a change request
func AddComment(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	crIDStr := c.Param("id")
	crID, ok := utils.ParseUint(crIDStr)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CR ID"})
		return
	}

	var cr models.ChangeRequest
	if err := database.DB.First(&cr, "cr_id = ?", crID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Change request not found"})
		return
	}

	var req CommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comment := models.Comment{
		CRID:        crID,
		UserID:      userID,
		CommentText: req.CommentText,
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create comment"})
		return
	}

	// Create history entry
	history := models.History{
		CRID:            crID,
		ChangedByUserID: userID,
		EventType:       "COMMENT_ADDED",
		NewStatus:       "",
	}
	database.DB.Create(&history)

	// Load user relationship
	database.DB.Preload("User").First(&comment, comment.CommentID)

	c.JSON(http.StatusCreated, comment)
}

// GetComments retrieves all comments for a change request
func GetComments(c *gin.Context) {
	crIDStr := c.Param("id")
	crID, ok := utils.ParseUint(crIDStr)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CR ID"})
		return
	}

	var comments []models.Comment
	if err := database.DB.Preload("User").Where("cr_id = ?", crID).Order("created_at ASC").Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}

	c.JSON(http.StatusOK, comments)
}

// GetHistory retrieves the audit trail for a change request
func GetHistory(c *gin.Context) {
	crIDStr := c.Param("id")
	crID, ok := utils.ParseUint(crIDStr)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CR ID"})
		return
	}

	var history []models.History
	if err := database.DB.Preload("ChangedBy").Where("cr_id = ?", crID).Order("timestamp ASC").Find(&history).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch history"})
		return
	}

	c.JSON(http.StatusOK, history)
}

// Helper function
func parseInt(s string) int {
	var result int
	for _, char := range s {
		if char >= '0' && char <= '9' {
			result = result*10 + int(char-'0')
		} else {
			return 1
		}
	}
	if result == 0 {
		return 1
	}
	return result
}

