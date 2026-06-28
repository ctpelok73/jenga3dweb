@echo off
echo ========================================
echo   Jenga 3D - Starting Server
echo ========================================
echo.
echo Server will run on: http://localhost:3001
echo WebSocket on: ws://localhost:3001
echo API: /api/player/:id, /api/leaderboard/top
echo.
echo Press Ctrl+C to stop.
echo ========================================
echo.
node server/index.js
