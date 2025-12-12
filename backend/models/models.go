package models

import (
	"time"
)

// User represents a user in the system
// Table: users
type User struct {
	UserID   uint   `gorm:"type:bigint unsigned;primaryKey;autoIncrement" json:"user_id"`
	Username string `gorm:"type:varchar(50);uniqueIndex;not null" json:"username"`
	Email    string `gorm:"type:varchar(100);uniqueIndex;not null" json:"email"`
	Password string `gorm:"type:varchar(255);not null" json:"-"` // Hashed password, not returned in JSON

	// Relationships
	TeamMemberships []UserTeamMembership `gorm:"foreignKey:UserID" json:"team_memberships,omitempty"`
	IsSuperManager  bool                 `gorm:"-" json:"is_super_manager,omitempty"`
	IsGatewayEditor bool                 `gorm:"-" json:"is_gateway_editor,omitempty"`
}

func (User) TableName() string {
	return "users"
}

// Team represents a team entity
// Table: teams
type Team struct {
	TeamID uint   `gorm:"type:bigint unsigned;primaryKey;autoIncrement" json:"team_id"`
	Name   string `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`

	// Relationships
	Members []UserTeamMembership `gorm:"foreignKey:TeamID" json:"members,omitempty"`
}

func (Team) TableName() string {
	return "teams"
}

// UserTeamMembership links users to teams
// Table: user_team_membership
type UserTeamMembership struct {
	UserID uint `gorm:"type:bigint unsigned;primaryKey" json:"user_id"`
	TeamID uint `gorm:"type:bigint unsigned;primaryKey" json:"team_id"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty" references:UserID`
	Team Team `gorm:"foreignKey:TeamID" json:"team,omitempty" references:TeamID`
}

func (UserTeamMembership) TableName() string {
	return "user_team_membership"
}

// SuperManager defines users who can approve CRs
// Table: super_managers
type SuperManager struct {
	UserID  uint      `gorm:"type:bigint unsigned;primaryKey" json:"user_id"`
	AddedAt time.Time `gorm:"type:timestamp;default:CURRENT_TIMESTAMP" json:"added_at"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty" references:UserID`
}

func (SuperManager) TableName() string {
	return "super_managers"
}

// GatewayEditor defines users who can execute CRs
// Table: gateway_editors
type GatewayEditor struct {
	UserID  uint      `gorm:"type:bigint unsigned;primaryKey" json:"user_id"`
	AddedAt time.Time `gorm:"type:timestamp;default:CURRENT_TIMESTAMP" json:"added_at"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty" references:UserID`
}

func (GatewayEditor) TableName() string {
	return "gateway_editors"
}

// ApprovalStatus enum
// Values: 'PENDING_APPROVAL','APPROVED','REJECTED','NEEDS_REWORK'
type ApprovalStatus string

const (
	ApprovalStatusPending    ApprovalStatus = "PENDING_APPROVAL"
	ApprovalStatusApproved  ApprovalStatus = "APPROVED"
	ApprovalStatusRejected  ApprovalStatus = "REJECTED"
	ApprovalStatusNeedsRework ApprovalStatus = "NEEDS_REWORK"
)

// ExecutionStatus enum
// Values: 'DRAFT','IN_PROGRESS','COMPLETED','CANCELED'
type ExecutionStatus string

const (
	ExecutionStatusDraft      ExecutionStatus = "DRAFT"
	ExecutionStatusInProgress ExecutionStatus = "IN_PROGRESS"
	ExecutionStatusCompleted  ExecutionStatus = "COMPLETED"
	ExecutionStatusCanceled   ExecutionStatus = "CANCELED"
)

// ChangeRequest represents a configuration change request
// Table: change_requests
type ChangeRequest struct {
	CRID                uint            `gorm:"type:bigint unsigned;primaryKey;autoIncrement" json:"cr_id"`
	RequesterUserID     uint            `gorm:"type:bigint unsigned;not null;index" json:"requester_user_id"`
	RequesterTeamID     uint            `gorm:"type:bigint unsigned;not null;index" json:"requester_team_id"`
	Title               string          `gorm:"type:varchar(255);not null" json:"title"`
	ConfigChangesPayload string         `gorm:"type:json;not null" json:"config_changes_payload"`
	CreatedAt           time.Time       `gorm:"type:timestamp;default:CURRENT_TIMESTAMP" json:"created_at"`
	ApprovalStatus      ApprovalStatus  `gorm:"type:enum('PENDING_APPROVAL','APPROVED','REJECTED','NEEDS_REWORK');not null" json:"approval_status"`
	ExecutionStatus     ExecutionStatus `gorm:"type:enum('DRAFT','IN_PROGRESS','COMPLETED','CANCELED');not null" json:"execution_status"`

	// Relationships
	RequesterUser User `gorm:"foreignKey:RequesterUserID" json:"requester_user,omitempty" references:RequesterUserID`
	RequesterTeam Team `gorm:"foreignKey:RequesterTeamID" json:"requester_team,omitempty" references:RequesterTeamID`
	Reviews       []SuperManagerReview `gorm:"foreignKey:CRID" json:"reviews,omitempty"`
	Comments      []Comment            `gorm:"foreignKey:CRID" json:"comments,omitempty"`
	History       []History            `gorm:"foreignKey:CRID" json:"history,omitempty"`
}

func (ChangeRequest) TableName() string {
	return "change_requests"
}

// ReviewDecision enum
// Values: 'APPROVED','REJECTED'
type ReviewDecision string

const (
	ReviewDecisionApproved ReviewDecision = "APPROVED"
	ReviewDecisionRejected ReviewDecision = "REJECTED"
)

// SuperManagerReview represents a review decision by a super manager
// Table: cr_super_manager_review
type SuperManagerReview struct {
	ReviewID       uint           `gorm:"type:bigint unsigned;primaryKey;autoIncrement" json:"review_id"`
	CRID           uint           `gorm:"type:bigint unsigned;not null;index" json:"cr_id"`
	SMUserID       uint           `gorm:"type:bigint unsigned;not null;index" json:"sm_user_id"`
	ReviewDecision ReviewDecision `gorm:"type:enum('APPROVED','REJECTED');not null" json:"review_decision"`
	ReviewedAt     time.Time     `gorm:"type:timestamp;default:CURRENT_TIMESTAMP" json:"reviewed_at"`

	// Relationships
	ChangeRequest ChangeRequest `gorm:"foreignKey:CRID" json:"change_request,omitempty" references:CRID	`
	SuperManager  User          `gorm:"foreignKey:SMUserID" json:"super_manager,omitempty" references:SMUserID`
}

func (SuperManagerReview) TableName() string {
	return "cr_super_manager_review"
}

// Comment represents a comment on a change request
// Table: cr_comments
type Comment struct {
	CommentID   uint      `gorm:"type:bigint unsigned;primaryKey;autoIncrement" json:"comment_id"`
	CRID        uint      `gorm:"type:bigint unsigned;not null;index" json:"cr_id"`
	UserID      uint      `gorm:"type:bigint unsigned;not null;index" json:"user_id"`
	CommentText string    `gorm:"type:text;not null" json:"comment_text"`
	CreatedAt   time.Time `gorm:"type:timestamp;default:CURRENT_TIMESTAMP" json:"created_at"`

	// Relationships
	ChangeRequest ChangeRequest `gorm:"foreignKey:CRID" json:"change_request,omitempty" references:CRID`
	User          User          `gorm:"foreignKey:UserID" json:"user,omitempty" references:UserID`
}

func (Comment) TableName() string {
	return "cr_comments"
}

// History represents an audit trail entry
// Table: cr_history
type History struct {
	HistoryID       uint      `gorm:"type:bigint unsigned;primaryKey;autoIncrement" json:"history_id"`
	CRID            uint      `gorm:"type:bigint unsigned;not null;index" json:"cr_id"`
	ChangedByUserID uint      `gorm:"type:bigint unsigned;not null;index" json:"changed_by_user_id"`
	EventType       string    `gorm:"type:varchar(50);not null" json:"event_type"`
	OldStatus       *string   `gorm:"type:varchar(50)" json:"old_status,omitempty"` // Nullable
	NewStatus       string    `gorm:"type:varchar(50);not null" json:"new_status"`
	Timestamp       time.Time `gorm:"type:timestamp;default:CURRENT_TIMESTAMP" json:"timestamp"`

	// Relationships
	ChangeRequest ChangeRequest `gorm:"foreignKey:CRID" json:"change_request,omitempty" references:CRID`
	ChangedBy     User          `gorm:"foreignKey:ChangedByUserID" json:"changed_by,omitempty" references:UserID`
}

func (History) TableName() string {
	return "cr_history"
}

