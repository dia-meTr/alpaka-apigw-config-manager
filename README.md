# Alpaka - Configuration Change Request Management System

A full-stack application for managing configuration change requests with approval workflows.

## Project Structure

- `backend/` - Go REST API server
- `frontend/` - React frontend application

## Quick Start

### Option 1: Start Both Services (Recommended)

```bash
./start.sh
```

This will start both the backend (port 8080) and frontend (port 3000) servers.

### Option 2: Start Services Separately

**Start Backend:**
```bash
cd backend
go run main.go
```

**Start Frontend (in a separate terminal):**
```bash
cd frontend
npm start
```

## Services

- **Backend API**: http://localhost:8080
- **Frontend App**: http://localhost:3000

## Prerequisites

- Go 1.23+ (for backend)
- Node.js 16+ and npm (for frontend)
- MySQL 5.7+ (database)

See individual README files in `backend/` and `frontend/` directories for detailed setup instructions.

