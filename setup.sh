#!/bin/bash

echo "🚀 Setting up Modern ToDo Application"
echo "====================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version check passed"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if npm install; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
if npm install; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

cd ..

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update environment variables in backend/.env and frontend/.env"
echo "2. Run database migrations: cd backend && npx prisma migrate dev --name init"
echo "3. Start the application:"
echo "   - Backend: cd backend && npm run dev"
echo "   - Frontend: cd frontend && npm run dev"
echo ""
echo "📖 See README.md for detailed setup instructions"