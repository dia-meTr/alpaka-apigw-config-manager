#!/bin/bash

# Start script for Alpaka application
# This script starts both backend and frontend servers

echo "Starting Alpaka application..."
echo ""

# Start backend in background
echo "Starting backend server..."
cd backend
go run main.go &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "Starting frontend server..."
cd frontend
npm start

# When frontend exits, kill backend
echo ""
echo "Stopping backend server..."
kill $BACKEND_PID 2>/dev/null

