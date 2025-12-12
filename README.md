# Alpaka - Configuration Change Request Management System

A full-stack application for managing API Gateway configuration change requests with a two-tier approval workflow, team-based organization, and comprehensive audit trails.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [User Roles & Permissions](#user-roles--permissions)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [Frontend Pages](#frontend-pages)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Development](#development)
- [Security](#security)

## 🎯 Overview

Alpaka is a Configuration Change Request (CR) management system designed for managing API Gateway configurations in a microservice environment. It provides:

- **Controlled Automation**: Safe, audited configuration changes
- **Accountability**: Complete audit trail for all changes
- **Clear Segregation of Duties**: Role-based approval and execution
- **Team Collaboration**: Team-based CR management with member assignment
- **CI/CD Integration**: Webhook support for automated workflows

## ✨ Features

### Core Functionality

1. **Change Request Management**
   - Create, view, update, and track configuration change requests
   - Dynamic form rendering for CR creation (loaded from JSON configuration)
   - Full CR lifecycle management from draft to completion

2. **Two-Tier Approval Process**
   - **Approval Status**: PENDING_APPROVAL → APPROVED/REJECTED/NEEDS_REWORK
   - **Execution Status**: DRAFT → IN_PROGRESS → COMPLETED/CANCELED
   - Super Managers approve/reject changes before execution
   - Gateway Editors execute approved changes

3. **Team-Based Organization**
   - Users belong to teams
   - Teams own and manage their change requests
   - Sidebar navigation shows teams and their CRs
   - Team members can add other users to their teams

4. **Role-Based Access Control (RBAC)**
   - **Super Managers**: Approve/reject CRs, manage admin roles
   - **Gateway Editors**: Create teams, add team members, update execution status, manage teams
   - **Regular Users**: Create CRs, add comments, view their teams

5. **Comprehensive Audit Trail**
   - Complete history of all CR status changes
   - Comments and communication history
   - Approval decisions with reviewer information
   - Timestamps for all events

6. **Dynamic Form Rendering**
   - CR creation UI is dynamically loaded from `frontend/src/config/apiProps.json`
   - Supports multiple field types (Input, Select, Checkbox)
   - Repeatable sections for complex configurations
   - Conditional field visibility based on dependencies

7. **Real-Time Status Tracking**
   - View approval and execution status with color-coded badges
   - Filter CRs by status, team, or user
   - History timeline visualization

## 🏗️ Architecture

### Technology Stack

**Backend:**
- **Language**: Go 1.23+
- **Framework**: Gin (HTTP web framework)
- **ORM**: GORM
- **Database**: MySQL 5.7+ / MariaDB 10.2+
- **Authentication**: JWT tokens
- **Password Hashing**: bcrypt

**Frontend:**
- **Framework**: React.js
- **Routing**: React Router DOM
- **State Management**: React Context API
- **HTTP Client**: Fetch API

### System Architecture

```
┌─────────────────┐
│   React Frontend │  (Port 3000)
│                 │
│  - Pages        │
│  - Components   │
│  - Context      │
│  - Services     │
└────────┬────────┘
         │ HTTP/REST API
         │ JWT Auth
         ▼
┌─────────────────┐
│   Go Backend    │  (Port 8080)
│                 │
│  - Handlers     │
│  - Middleware   │
│  - Services     │
│  - Models       │
└────────┬────────┘
         │ GORM
         ▼
┌─────────────────┐
│   MySQL DB      │
│                 │
│  - Users        │
│  - Teams        │
│  - CRs          │
│  - History      │
└─────────────────┘
```

### Database Schema

Main entities:
- **users**: Core user information with authentication
- **teams**: Team entities for organizing users
- **user_team_membership**: Many-to-many relationship between users and teams
- **super_managers**: Users who can approve CRs
- **gateway_editors**: Users who can execute CRs and manage teams
- **change_requests**: Core CR data with approval and execution status
- **cr_super_manager_review**: Approval decisions audit log
- **cr_comments**: Communication history
- **cr_history**: Comprehensive audit trail for all events

## 👥 User Roles & Permissions

### Super Manager
- ✅ Approve/reject change requests
- ✅ Manage Super Manager roles (add/remove)
- ✅ Manage Gateway Editor roles (add/remove)
- ✅ View all change requests
- ✅ Add comments to any CR

**Access:** Approvals page, Admin functions

### Gateway Editor
- ✅ Create new teams
- ✅ Add/remove members from any team
- ✅ Update execution status of approved CRs
- ✅ Manage teams
- ✅ View all teams and change requests
- ✅ Add comments to any CR

**Access:** Teams Management page, Execution Management page

### Regular User
- ✅ Create change requests for their teams
- ✅ Update their own CRs (before approval)
- ✅ View teams they belong to
- ✅ Add comments to any CR
- ✅ View change requests for their teams

**Access:** Create API page, CR details page, Sidebar with their teams

## 📦 Prerequisites

Before you begin, ensure you have:

- **Go 1.23 or higher** - [Download](https://golang.org/dl/)
- **Node.js 16+ and npm** - [Download](https://nodejs.org/)
- **MySQL 5.7+ or MariaDB 10.2+** - [Download](https://www.mysql.com/downloads/)
- **Git** (optional, for version control)

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd alpaka
```

### 2. Database Setup

Create a MySQL database:

```bash
mysql -u root -p
CREATE DATABASE alpaka CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 3. Backend Setup

```bash
cd backend

# Install Go dependencies
go mod download

# Configure environment variables
# Create .env file or set environment variables:
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=mysql
export DB_PASSWORD=your_password
export DB_NAME=alpaka
export JWT_SECRET=your-secret-key-here
export SERVER_PORT=8080
export SERVER_HOST=0.0.0.0

# Run the backend (migrations run automatically)
go run main.go
```

The backend will:
- Connect to the database
- Run automatic migrations
- Start on port 8080

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure API URL (optional)
# Create .env file:
# REACT_APP_API_URL=http://localhost:8080/api/v1

# Start development server
npm start
```

The frontend will start on port 3000 and open automatically in your browser.

### 5. Quick Start (Both Services)

Alternatively, use the provided startup script:

```bash
# Make sure the script is executable
chmod +x start.sh

# Run both backend and frontend
./start.sh
```

This will:
- Start the backend server on port 8080
- Start the frontend development server on port 3000
- Handle cleanup when you stop the script (Ctrl+C)

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory or set environment variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=mysql
DB_PASSWORD=your_password
DB_NAME=alpaka

# Server Configuration
SERVER_PORT=8080
SERVER_HOST=0.0.0.0

# JWT Secret (change in production!)
JWT_SECRET=your-secret-key-change-in-production

# Optional: CI/CD Integration
WEBHOOK_URL=https://your-ci-cd-webhook-url.com
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# API Base URL
REACT_APP_API_URL=http://localhost:8080/api/v1
```

### Dynamic Form Configuration

**Important**: The UI for creating Change Requests is dynamically loaded from a JSON configuration file.

**File Location**: `frontend/src/config/apiProps.json`

This JSON file defines:
- Form sections and structure
- Field types (Input, Select, Checkbox)
- Field labels, validation rules, and help text
- Repeatable sections (e.g., routes)
- Conditional field visibility

**Example Structure:**
```json
{
  "pageTitle": "Налаштування Kong Service & Routes",
  "elements": [
    {
      "type": "Section",
      "props": {
        "title": "Api configuration",
        "name": "service"
      },
      "children": [
        {
          "type": "Input",
          "props": {
            "label": "Api Name:",
            "name": "name",
            "required": true,
            "dataType": "text"
          }
        }
      ]
    }
  ]
}
```

**To customize the CR creation form:**
1. Edit `frontend/src/config/apiProps.json`
2. Add/modify sections, fields, and validation rules
3. The form will automatically reflect changes on page reload

**Supported Field Types:**
- **Input**: Text, URL, number input fields
- **Select**: Single or multi-select dropdowns
- **Checkbox**: Boolean checkboxes
- **Section**: Container for grouping fields
  - Can be marked as `isRepeatable: true` for dynamic arrays

**Supported Features:**
- Conditional fields: `dependencies.showIf` for showing/hiding fields
- Default values: `defaultValue` for pre-filling fields
- Validation: `required`, `dataType` for client-side validation
- Help text: `helpText` for field descriptions

## 📖 Usage Guide

### First-Time Setup

1. **Register a User**
   - Navigate to the Register page
   - Create your account

2. **Assign Roles** (requires database access or Super Manager)
   - A Super Manager needs to be assigned via the database initially
   - Super Managers can then manage roles through the Admin interface

3. **Create Teams** (Gateway Editor required)
   - Navigate to "Teams Management" (if you're a Gateway Editor)
   - Click "Create New Team"
   - Add team members

### Creating a Change Request

1. **Navigate to Create API**
   - Click "Create Change Request" in the sidebar
   - Or go to `/create-api/:teamId`

2. **Fill Out the Form**
   - The form is dynamically loaded from `apiProps.json`
   - Fill in required fields (marked with *)
   - For repeatable sections (like routes), click "Add" to add more items
   - Enable plugins if needed (e.g., rate limiting)

3. **Submit the Request**
   - Click "Create Change Request"
   - The CR will be created with status `PENDING_APPROVAL`

### Approving a Change Request (Super Manager)

1. **Navigate to Approvals Page**
   - Click "Approvals" in the header (Super Manager only)

2. **Review Pending Requests**
   - View all CRs with status `PENDING_APPROVAL`
   - Click on a CR to see details

3. **Make a Decision**
   - Review the configuration changes
   - Check comments and history
   - Click "Approve" or "Reject"
   - Optionally add a comment

### Executing a Change Request (Gateway Editor)

1. **Navigate to Execution Management**
   - Click "Execution" in the header (Gateway Editor only)

2. **View Approved CRs**
   - Filter by execution status
   - View CRs with status `APPROVED` and `DRAFT` execution status

3. **Update Execution Status**
   - Click on a CR to view details
   - Update status: `IN_PROGRESS` → `COMPLETED` or `CANCELED`

### Managing Teams (Gateway Editor)

1. **Navigate to Teams Management**
   - Click "Teams" in the header (Gateway Editor only)

2. **Create Teams**
   - Click "Create New Team"
   - Enter team name
   - Submit

3. **Add Team Members**
   - Find the team in the list
   - Click "Add Member"
   - Select a user from the dropdown
   - Click "Add"

4. **Remove Team Members**
   - Find the team member
   - Click "Remove"
   - Confirm removal

### Using the Sidebar

The sidebar provides quick access to:
- **Your Teams**: Expandable list of teams you belong to
- **Team CRs**: Change requests for each team (shown when team is expanded)
- **Create CR**: Quick button to create a new change request
- **Add Team Members**: Add users to teams directly from the sidebar

**Features:**
- Expand/collapse teams to view their CRs
- Click on a CR to view/edit it
- Add members to teams via modal dialog

## 🖥️ Frontend Pages

### Public Pages

#### Login (`/login`)
- User authentication
- Redirects to home if already logged in

#### Register (`/register`)
- New user registration
- Creates account and logs in automatically

### Protected Pages

#### Home (`/`)
- Welcome page with overview
- Links to main features

#### Create API (`/create-api/:teamId`)
- **Purpose**: Create new change requests
- **Form**: Dynamically loaded from `apiProps.json`
- **Features**:
  - Dynamic form rendering based on JSON config
  - Repeatable sections (add/remove items)
  - Conditional fields
  - Validation
  - Submits to create a new CR

#### API Configuration (`/team/:teamId/api/:requestId`)
- **Purpose**: View and edit change request details
- **Features**:
  - View full CR information
  - Edit CR (only if requester and not approved)
  - View approval and execution status with color badges
  - Comments section (add/view comments)
  - History timeline (all status changes)
  - Read-only mode for approved CRs

#### Approvals (`/approvals`)
- **Access**: Super Manager only
- **Purpose**: Review and approve/reject change requests
- **Features**:
  - List all pending CRs
  - Filter by status
  - Approve/reject with comments
  - View CR details

#### Execution Management (`/execution`)
- **Access**: Gateway Editor only
- **Purpose**: Manage execution status of approved CRs
- **Features**:
  - List approved CRs
  - Filter by execution status
  - Update execution status
  - View CR details

#### Teams Management (`/teams`)
- **Access**: Gateway Editor only
- **Purpose**: Manage teams and team members
- **Features**:
  - List all teams
  - Create new teams
  - Add/remove team members
  - View team details

## 🔌 API Documentation

### Base URL
```
http://localhost:8080/api/v1
```

### Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### Health Check
- `GET /health` - Health check (public)

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user info (requires auth)

#### Users
- `GET /users` - List all users (requires auth)
  - Returns: Array of users with `user_id`, `username`, `email`

#### Teams
- `POST /teams` - Create team (Gateway Editor only)
- `GET /teams` - List all teams (requires auth)
- `GET /teams/my-teams` - Get user's teams (requires auth)
- `GET /teams/:id` - Get team details (requires auth)
- `POST /teams/:id/members` - Add member to team (requires auth)
- `DELETE /teams/:id/members/:user_id` - Remove member from team (requires auth)

#### Change Requests
- `POST /change-requests` - Create CR (requires auth)
- `GET /change-requests` - List CRs with filters (requires auth)
  - Query params: `approval_status`, `execution_status`, `team_id`, `user_id`, `page`, `limit`
- `GET /change-requests/:id` - Get CR details (requires auth)
- `PUT /change-requests/:id` - Update CR (requester only, before approval)
- `POST /change-requests/:id/review` - Approve/reject CR (Super Manager only)
- `PUT /change-requests/:id/execution-status` - Update execution status (Gateway Editor only)
- `POST /change-requests/:id/comments` - Add comment (requires auth)
- `GET /change-requests/:id/comments` - Get comments (requires auth)
- `GET /change-requests/:id/history` - Get audit trail (requires auth)

#### Admin
- `POST /admin/super-managers` - Add Super Manager (Super Manager only)
- `DELETE /admin/super-managers/:id` - Remove Super Manager (Super Manager only)
- `GET /admin/super-managers` - List Super Managers (requires auth)
- `POST /admin/gateway-editors` - Add Gateway Editor (Super Manager only)
- `DELETE /admin/gateway-editors/:id` - Remove Gateway Editor (Super Manager only)
- `GET /admin/gateway-editors` - List Gateway Editors (requires auth)

#### Automation/CI-CD
- `GET /automation/change-requests/:id/status` - Get CR status for CI/CD (public)
- `POST /automation/change-requests/:id/trigger` - Trigger automation (requires auth)

For detailed API documentation with request/response examples, see `backend/README.md`.

## 📁 Project Structure

```
alpaka/
├── backend/                    # Go backend server
│   ├── config/                 # Configuration management
│   │   └── config.go
│   ├── database/               # Database connection and migrations
│   │   └── database.go
│   ├── handlers/               # HTTP request handlers
│   │   ├── admin_handler.go   # Admin operations
│   │   ├── auth_handler.go    # Authentication
│   │   ├── automation_handler.go
│   │   ├── cr_handler.go      # Change requests
│   │   └── team_handler.go    # Teams
│   ├── middleware/             # Middleware (auth, CORS)
│   │   ├── auth.go
│   │   └── cors.go
│   ├── models/                 # Database models
│   │   └── models.go
│   ├── routes/                 # Route definitions
│   │   └── routes.go
│   ├── services/               # Business logic
│   │   └── automation.go
│   ├── utils/                  # Utilities
│   │   ├── helpers.go
│   │   ├── jwt.go
│   │   └── password.go
│   ├── main.go                 # Application entry point
│   ├── go.mod                  # Go dependencies
│   └── README.md               # Backend documentation
│
├── frontend/                   # React frontend
│   ├── public/                 # Static files
│   │   └── index.html
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── FormRenderer/  # Dynamic form renderer
│   │   │   ├── Header/        # Application header
│   │   │   ├── MainLayout/    # Main layout wrapper
│   │   │   ├── ProtectedRoute/ # Route protection
│   │   │   └── Sidebar/       # Navigation sidebar
│   │   ├── config/            # Configuration files
│   │   │   └── apiProps.json  # ⚠️ CR form configuration (important!)
│   │   ├── context/           # React contexts
│   │   │   └── AuthContext.jsx # Authentication context
│   │   ├── pages/             # Page components
│   │   │   ├── ApiConfiguration/ # CR details page
│   │   │   ├── Approvals/     # Super Manager approvals
│   │   │   ├── CreateApi/     # Create CR page
│   │   │   ├── ExecutionManagement/ # Gateway Editor execution
│   │   │   ├── Login/         # Login page
│   │   │   ├── Register/      # Registration page
│   │   │   └── TeamsManagement/ # Team management
│   │   ├── services/          # API service layer
│   │   │   └── api.js         # API client functions
│   │   ├── App.jsx            # Main app component
│   │   ├── App.css            # Global styles
│   │   ├── index.js           # Entry point
│   │   └── index.css          # Global styles
│   ├── package.json           # npm dependencies
│   └── README.md              # Frontend documentation
│
├── .gitignore                 # Git ignore rules
├── README.md                  # This file
└── start.sh                   # Startup script for both services
```

## 🛠️ Development

### Running in Development

**Backend:**
```bash
cd backend
go run main.go
```

**Frontend:**
```bash
cd frontend
npm start
```

### Building for Production

**Backend:**
```bash
cd backend
go build -o bin/api main.go
./bin/api
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the build/ directory with a static file server
```

### Database Migrations

Migrations run automatically when the backend starts. The database connection is configured in `backend/database/database.go`.

**Note:** Foreign key constraints are disabled during migration to prevent conflicts. Manual foreign keys may need to be created separately if required.

### Testing

**Backend:**
```bash
cd backend
go test ./...
```

### Adding New Form Fields

To add new fields to the CR creation form:

1. Edit `frontend/src/config/apiProps.json`
2. Add your field definition within the appropriate section
3. Field types: `Input`, `Select`, `Checkbox`
4. Add validation rules, help text, etc.
5. The form will update automatically

Example:
```json
{
  "id": "input-new-field",
  "type": "Input",
  "props": {
    "label": "New Field:",
    "name": "new_field",
    "required": false,
    "dataType": "text",
    "helpText": "Description of the field"
  }
}
```

## 🔒 Security

### Authentication
- JWT tokens for stateless authentication
- Tokens stored in localStorage (consider httpOnly cookies for production)
- Password hashing with bcrypt

### Authorization
- Role-based access control (RBAC) enforced at middleware level
- Users can only update their own CRs (before approval)
- Team members can add members to their teams
- Gateway Editors can manage teams and execution
- Super Managers can approve/reject CRs

### Data Protection
- Passwords never returned in API responses
- All status changes logged in audit trail
- Input validation on both frontend and backend
- CORS configured for frontend origin

### Best Practices
- Change `JWT_SECRET` in production
- Use strong passwords
- Enable HTTPS in production
- Regularly review audit logs
- Keep dependencies updated

## 📝 Status Flow Reference

### Approval Status Flow
```
PENDING_APPROVAL
    ↓
APPROVED ────────→ REJECTED
    │                   │
    └───→ NEEDS_REWORK ─┘
```

### Execution Status Flow
```
DRAFT
  ↓
IN_PROGRESS
  ↓
COMPLETED ────────→ CANCELED
```

**Note:** A CR must be APPROVED before execution can begin (IN_PROGRESS).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the Alpaka system.

## 🆘 Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check database credentials in environment variables
- Ensure database exists: `CREATE DATABASE alpaka;`

### Port Already in Use
- Change `SERVER_PORT` in backend config
- Change React port: `PORT=3001 npm start`

### CORS Errors
- Verify `REACT_APP_API_URL` matches backend URL
- Check CORS middleware in `backend/middleware/cors.go`

### Form Not Loading
- Verify `frontend/src/config/apiProps.json` exists and is valid JSON
- Check browser console for errors
- Ensure FormRenderer component is properly imported

### Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Verify JWT_SECRET is set correctly
- Check token expiration

## 📞 Support

For issues, questions, or contributions, please refer to the project repository or contact the development team.

---

**Alpaka** - Configuration Change Request Management System  
Built with Go and React
