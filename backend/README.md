# Configuration Change Request (CR) Management API

A Golang REST API for managing Configuration Change Requests (CRs) for a single API Gateway in a microservice environment. This system provides controlled automation, accountability, and clear segregation of duties.

## Features

- **Two-Tier Approval Process**: CRs must be approved by a Super Manager before execution
- **Role-Based Access Control**: 
  - Super Managers: Can approve/reject CRs
  - Gateway Editors: Can execute approved CRs
  - Requester Teams: Can create and manage their own CRs
- **Automated Status Transitions**: Support for automated workflow transitions
- **CI/CD Integration**: Webhook support for CI/CD pipeline integration
- **Comprehensive Audit Trail**: Full history tracking for compliance
- **Team Management**: Users belong to teams, enabling team-based CR management

## Architecture

### Database Schema

The system uses the following main entities:

- **users**: Core user information
- **teams**: Team entities (including the Gateway Owner Team)
- **user_team_membership**: Links users to teams
- **super_managers**: Users who can approve CRs
- **gateway_editors**: Users who can execute CRs
- **change_requests**: Core CR data with approval and execution status
- **cr_super_manager_review**: Audit log for approval decisions
- **cr_comments**: Communication history
- **cr_history**: Comprehensive audit trail

### Status Flow

**Approval Status:**
1. **PENDING_APPROVAL** → Created by requester team
2. **APPROVED** → Approved by Super Manager
3. **REJECTED** → Rejected by Super Manager
4. **NEEDS_REWORK** → Requires changes before approval

**Execution Status:**
1. **DRAFT** → Initial state when CR is created
2. **IN_PROGRESS** → Gateway Editor starts execution (can be automated)
3. **COMPLETED** → Execution finished successfully
4. **CANCELED** → Execution was canceled

## Setup

### Prerequisites

- Go 1.23 or higher
- MySQL 5.7 or higher (or MariaDB 10.2+)

### Installation

1. Clone the repository:
```bash
cd backend
```

2. Install dependencies:
```bash
go mod download
```

3. Set up environment variables (see `.env.example`):
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run migrations:
```bash
go run main.go
# The application will automatically run migrations on startup
```

### Environment Variables

- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 3306)
- `DB_USER`: Database user (default: mysql)
- `DB_PASSWORD`: Database password (default: mysql)
- `DB_NAME`: Database name (default: alpaka)
- `DB_SSLMODE`: SSL mode (default: false, not used for MySQL but kept for compatibility)
- `SERVER_PORT`: Server port (default: 8080)
- `SERVER_HOST`: Server host (default: 0.0.0.0)
- `JWT_SECRET`: JWT secret key for token generation
- `WEBHOOK_URL`: Optional webhook URL for CI/CD integration

## API Endpoints

### Health Check

- `GET /health` - Health check endpoint
  - Returns: `{"status": "ok"}`

### Authentication

- `POST /api/v1/auth/register` - Register a new user
  - Request: `{"username": "string", "email": "string", "password": "string"}`
  - Returns: `{"token": "string", "user": {...}}`
- `POST /api/v1/auth/login` - Login and get JWT token
  - Request: `{"username": "string", "password": "string"}`
  - Returns: `{"token": "string", "user": {...}}`
- `GET /api/v1/auth/me` - Get current user info (requires auth)
  - Returns: `{"user_id": uint, "username": "string", "email": "string", "team_memberships": [...], "is_super_manager": bool, "is_gateway_editor": bool}`

### Teams

- `POST /api/v1/teams` - Create a team (Gateway Editor only)
  - Request: `{"name": "string"}`
  - Returns: `{"team_id": uint, "name": "string"}`
- `GET /api/v1/teams` - List all teams (requires auth)
  - Returns: Array of teams with members
- `GET /api/v1/teams/my-teams` - Get teams that the current user belongs to (requires auth)
  - Returns: Array of teams (only teams where user is a member)
- `GET /api/v1/teams/:id` - Get team details with members (requires auth)
  - Returns: `{"team_id": uint, "name": "string", "members": [...]}`
- `POST /api/v1/teams/:id/members` - Add member to team (requires auth)
  - Request: `{"user_id": uint}`
  - Returns: `{"user_id": uint, "team_id": uint, "user": {...}, "team": {...}}`
- `DELETE /api/v1/teams/:id/members/:user_id` - Remove member from team (requires auth)
  - Returns: `{"message": "Team member removed successfully"}`

### Change Requests

- `POST /api/v1/change-requests` - Create a new CR (requires auth)
  - Request: `{"title": "string", "config_changes_payload": "string", "requester_team_id": uint}`
  - Returns: Change request object with all fields
- `GET /api/v1/change-requests` - List CRs with filters (requires auth)
  - Query params: `approval_status`, `execution_status`, `team_id`, `user_id`, `page`, `limit`
  - Returns: Array of change requests
- `GET /api/v1/change-requests/:id` - Get CR details with reviews, comments, and history (requires auth)
  - Returns: Complete change request object with relationships
- `PUT /api/v1/change-requests/:id` - Update CR (only requester, before approval)
  - Request: `{"title": "string", "config_changes_payload": "string"}` (both optional)
  - Returns: Updated change request object
- `POST /api/v1/change-requests/:id/review` - Approve/reject CR (Super Manager only)
  - Request: `{"review_decision": "APPROVED" | "REJECTED"}`
  - Returns: Updated change request with approval status changed
- `PUT /api/v1/change-requests/:id/execution-status` - Update execution status (Gateway Editor only)
  - Request: `{"execution_status": "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELED"}`
  - Returns: Updated change request with execution status changed
- `POST /api/v1/change-requests/:id/comments` - Add comment (requires auth)
  - Request: `{"comment_text": "string"}`
  - Returns: `{"comment_id": uint, "cr_id": uint, "user_id": uint, "comment_text": "string", "created_at": "timestamp", "user": {...}}`
- `GET /api/v1/change-requests/:id/comments` - Get all comments for a CR (requires auth)
  - Returns: Array of comments in chronological order
- `GET /api/v1/change-requests/:id/history` - Get audit trail (requires auth)
  - Returns: Array of history entries with event details

### Admin

- `POST /api/v1/admin/super-managers` - Add Super Manager (requires Super Manager)
- `DELETE /api/v1/admin/super-managers/:id` - Remove Super Manager (requires Super Manager)
- `GET /api/v1/admin/super-managers` - List Super Managers (requires auth)
- `POST /api/v1/admin/gateway-editors` - Add Gateway Editor (requires Super Manager)
- `DELETE /api/v1/admin/gateway-editors/:id` - Remove Gateway Editor (requires Super Manager)
- `GET /api/v1/admin/gateway-editors` - List Gateway Editors (requires auth)

### Automation/CI-CD

- `GET /api/v1/automation/change-requests/:id/status` - Get CR status for CI/CD (public endpoint)
  - Returns: `{"cr_id": uint, "title": "string", "approval_status": "string", "execution_status": "string", "can_execute": bool, "config_changes": "string", "requester_team": "string", "created_at": "timestamp"}`
- `POST /api/v1/automation/change-requests/:id/trigger` - Manually trigger automation (requires auth)
  - Returns: `{"message": "Automation triggered successfully"}`

## Usage Examples

### 1. Register and Login

```bash
# Register
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "securepassword123"
  }'
# Save the token from response
```

### 2. Create a Team (Gateway Editor only)

```bash
curl -X POST http://localhost:8080/api/v1/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer GATEWAY_EDITOR_TOKEN" \
  -d '{
    "name": "Super Duper Admin Team"
  }'
```

### 3. Get My Teams

```bash
curl -X GET http://localhost:8080/api/v1/teams/my-teams \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Create a Change Request

```bash
curl -X POST http://localhost:8080/api/v1/change-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Add new API route",
    "config_changes_payload": "{\"route\": \"/api/v2/users\", \"method\": \"GET\", \"target\": \"user-service:8080\"}",
    "requester_team_id": 1
  }'
```

### 5. Add a Comment to Change Request

```bash
curl -X POST http://localhost:8080/api/v1/change-requests/1/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "comment_text": "This configuration change looks good. Please proceed with deployment."
  }'
```

### 6. Approve a Change Request (Super Manager)

```bash
curl -X POST http://localhost:8080/api/v1/change-requests/1/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPER_MANAGER_TOKEN" \
  -d '{
    "review_decision": "APPROVED"
  }'
```

### 7. Update Execution Status (Gateway Editor)

```bash
curl -X PUT http://localhost:8080/api/v1/change-requests/1/execution-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer GATEWAY_EDITOR_TOKEN" \
  -d '{
    "execution_status": "COMPLETED"
  }'
```

## Automation

The system supports automated status transitions:

1. When a CR is approved, it can automatically transition to `IN_PROGRESS`
2. Webhook notifications can be sent to CI/CD systems
3. The automation service can be triggered manually or automatically

Configure the `WEBHOOK_URL` environment variable to enable webhook notifications.

## Security Considerations

- JWT tokens are used for authentication
- Passwords are hashed using bcrypt before storage
- Role-based access control enforced at the middleware level:
  - Super Managers: Can approve/reject CRs and manage admin roles
  - Gateway Editors: Can create teams, add team members, and update execution status
  - Regular users: Can create CRs, add comments, and view their own teams
- All status changes are logged in the audit trail
- Users can only update their own CRs before approval
- Team creation and member management restricted to Gateway Editors
- Passwords are never returned in API responses

## Development

### Running Tests

```bash
go test ./...
```

### Building

```bash
go build -o bin/api main.go
```

### Running

```bash
./bin/api
# or
go run main.go
```

## Project Structure

```
backend/
├── config/          # Configuration management
├── database/        # Database connection and migrations
├── handlers/        # HTTP request handlers
├── middleware/      # Authentication and authorization middleware
├── models/          # Database models
├── routes/          # Route definitions
├── services/        # Business logic services
├── utils/           # Utility functions
├── main.go          # Application entry point
└── go.mod           # Go module file
```

## License

This project is part of the Alpaka system.


