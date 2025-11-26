# LLM Council - Start script for Windows

Write-Host "Starting LLM Council..." -ForegroundColor Cyan
Write-Host ""

# Start backend in new window
Write-Host "Starting backend on http://localhost:8001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; uv run python -m backend.main"

# Wait for backend to start
Start-Sleep -Seconds 3

# Start frontend in new window
Write-Host "Starting frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"

Write-Host ""
Write-Host "LLM Council is starting!" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:8001" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Two PowerShell windows will open. Close them to stop the servers." -ForegroundColor Gray
