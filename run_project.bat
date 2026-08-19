@echo off
echo Starting Backend...
start cmd /k "cd backend && call .venv\Scripts\activate.bat 2>nul || echo Virtual env not found && python main.py"

echo Starting Frontend...
start cmd /k "cd frontend && npm run dev"

echo Both services are starting up!
