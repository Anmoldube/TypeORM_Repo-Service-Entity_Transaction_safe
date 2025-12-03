# Todo App - Windows Setup Script
# This script automates the setup process for the ToDo application on Windows

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "ToDo App - Windows Setup Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking for Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
}
else {
    Write-Host "✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
Write-Host "Checking for npm installation..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ npm found: $npmVersion" -ForegroundColor Green
}
else {
    Write-Host "✗ npm not found." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Installing Backend Dependencies" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to backend and install dependencies
Push-Location backend
Write-Host "Installing backend packages..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install backend dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✓ Backend dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to generate Prisma Client" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✓ Prisma Client generated" -ForegroundColor Green

Pop-Location

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Installing Frontend Dependencies" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend and install dependencies
Push-Location frontend
Write-Host "Installing frontend packages..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install frontend dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green

Pop-Location

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Setup Verification" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Verifying backend setup..." -ForegroundColor Yellow
Push-Location backend
$result = npm run build 2>&1
Pop-Location
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend build successful" -ForegroundColor Green
}
else {
    Write-Host "⚠ Backend build has issues (this may be normal for development)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Ensure PostgreSQL is running on localhost:5432" -ForegroundColor White
Write-Host "2. Update backend/.env with your database connection string if needed" -ForegroundColor White
Write-Host "3. Run database migrations:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npx prisma migrate dev --name init" -ForegroundColor Gray
Write-Host ""

Write-Host "Starting the application:" -ForegroundColor Cyan
Write-Host "Terminal 1 (Backend):" -ForegroundColor White
Write-Host "  cd backend" -ForegroundColor Gray
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Terminal 2 (Frontend):" -ForegroundColor White
Write-Host "  cd frontend" -ForegroundColor Gray
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""

Write-Host "Application URLs:" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend: http://localhost:3001" -ForegroundColor Green
Write-Host ""
