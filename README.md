# Modern ToDo Application

A full-stack ToDo application built with React (frontend), Node.js with TypeScript (backend), and PostgreSQL (database) with JWT-based authentication.

## 🎯 Features

- ✅ User registration and authentication with JWT tokens
- ✅ Secure API endpoints (users can only access their own todos)
- ✅ CRUD operations for todos (Create, Read, Update, Delete)
- ✅ Advanced filtering by status, priority, and due date
- ✅ Role-based access control (users see only their own tasks)
- ✅ Responsive UI with Tailwind CSS
- ✅ TypeScript throughout the stack for type safety
- ✅ Database connection status monitoring
- ✅ Soft delete for data preservation
- ✅ Pagination support for todo listing

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS** for modern, responsive styling
- **Vite** for fast build tooling and development
- **Context API** for state management
- **Fetch API** for HTTP requests

### Backend
- **Node.js** with Express and TypeScript
- **PostgreSQL** database with Prisma ORM
- **JWT** authentication with bcrypt password hashing
- **CORS** enabled for secure cross-origin requests
- **RESTful API** design

### Database
- **PostgreSQL** (via Prisma)
- **Prisma Migrations** for schema versioning
- **Prisma Client** for type-safe database access

## 📋 Prerequisites

- **Node.js 18+** and npm
- **PostgreSQL 12+** (running locally)

## 🚀 Setup & Run Locally

### Step 1: Setup PostgreSQL Database

**Option A: Windows (Using psql)**
```powershell
# Open PostgreSQL command line
psql -U postgres

# In psql, create the database:
CREATE DATABASE todo_app;
\q
```

**Option B: macOS (Using Homebrew)**
```bash
# Install PostgreSQL if not already installed
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database
createdb todo_app
```

**Option C: Linux (Ubuntu/Debian)**
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb todo_app
```

### Step 2: Install Dependencies

**Backend:**
```bash
cd backend
npm install
npx prisma generate
```

**Frontend:**
```bash
cd frontend
npm install
```

### Step 3: Configure Environment Variables

**Backend (`backend/.env`):**
```env
# PostgreSQL Connection String
# Default for local PostgreSQL on Windows/macOS/Linux
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todo_app"

# JWT Secret (change this!)
JWT_SECRET="your-super-secret-jwt-key-change-this-12345"

# Server Configuration
NODE_ENV="development"
PORT="3001"
```

**Frontend (`frontend/.env`):**
```env
# API Base URL - points to local backend
VITE_API_BASE_URL="http://localhost:3001"
```

### Step 4: Run Database Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

This will:
- Create all tables (User, Todo)
- Generate Prisma Client
- Apply migrations to your local PostgreSQL

### Step 5: Verify Database Connection

```bash
cd backend
npm run dev
```

Open browser and visit: `http://localhost:3001/api/db-status`

You should see:
```json
{
  "status": "CONNECTED",
  "database": "PostgreSQL (via Prisma)",
  "stats": {
    "users": 0,
    "todos": 0
  }
}
```

If you see `DISCONNECTED`, check:
1. PostgreSQL is running
2. DATABASE_URL in `backend/.env` is correct
3. Database `todo_app` exists

## ▶️ Running the Application

Open **3 terminals** and run:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Server will start at: `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will start at: `http://localhost:5173`

**Terminal 3 - Database Management (Optional):**
```bash
cd backend
npx prisma studio
```
Opens: `http://localhost:5555` - Visual database management tool

## 🧪 Test the Application

1. Open `http://localhost:5173` in your browser
2. Click "Don't have an account? Sign up"
3. Create an account with email and password
4. Click "Add Todo" to create a new task
5. Test filtering, editing, and deleting todos
6. Logout and sign in with another account to verify data isolation

## 📊 Database Schema

### User Table
```sql
- id (Int, Primary Key, Auto-increment)
- email (String, Unique)
- password (String, Hashed)
- name (String, Optional)
- todos (Todo[])
- createdAt (DateTime)
- updatedAt (DateTime)
```

### Todo Table
```sql
- id (Int, Primary Key, Auto-increment)
- text (String)
- status (TodoStatus: ACTIVE, COMPLETED, DELETED)
- priority (Priority: LOW, MEDIUM, HIGH)
- dueDate (DateTime, Optional)
- authorId (Int, Foreign Key → User)
- author (User Relation)
- createdAt (DateTime)
- updatedAt (DateTime)
```

## 📚 API Endpoints

### Health & Status

**Get Server Health**
```
GET http://localhost:3001/api/health
```

**Get Database Connection Status**
```
GET http://localhost:3001/api/db-status
```

### Authentication (No token needed)

**Register User**
```
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Login**
```
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Protected Todo Endpoints (Requires Auth Header)

All requests need header:
```
Authorization: Bearer <your_jwt_token>
```

**Get All Todos**
```
GET http://localhost:3001/api/todos
```

**Get Todos with Filters**
```
GET http://localhost:3001/api/todos?status=ACTIVE&priority=HIGH
```

Parameters:
- `status`: ACTIVE, COMPLETED
- `priority`: LOW, MEDIUM, HIGH
- `dueDate`: ISO date string
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Create Todo**
```
POST http://localhost:3001/api/todos
Content-Type: application/json
Authorization: Bearer <token>

{
  "text": "Buy groceries",
  "priority": "MEDIUM",
  "dueDate": "2024-12-25"
}
```

**Update Todo**
```
PUT http://localhost:3001/api/todos/1
Content-Type: application/json
Authorization: Bearer <token>

{
  "text": "Updated task",
  "status": "COMPLETED",
  "priority": "HIGH"
}
```

**Delete Todo**
```
DELETE http://localhost:3001/api/todos/1
Authorization: Bearer <token>
```

## 🗂️ Project Structure

```
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema definition
│   │   └── migrations/             # Database migration files
│   ├── dist/                       # Compiled JavaScript output
│   ├── auth.ts                     # Authentication logic
│   ├── index.ts                    # Express server
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                        # Local environment variables
│   └── .env.example                # Example environment file
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx       # Login/Register form
│   │   │   ├── TodoApp.tsx         # Main todo app
│   │   │   ├── TodoForm.tsx        # Create/edit todo form
│   │   │   ├── TodoList.tsx        # Todo list container
│   │   │   ├── TodoItem.tsx        # Individual todo item
│   │   │   └── TodoFilters.tsx     # Filter controls
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx     # Auth state management
│   │   ├── services/
│   │   │   └── api.ts              # API client service
│   │   ├── App.tsx                 # Root app component
│   │   ├── main.jsx                # Entry point
│   │   └── index.css               # Tailwind CSS
│   ├── tailwind.config.js          # Tailwind CSS configuration
│   ├── postcss.config.js           # PostCSS configuration
│   ├── vite.config.js              # Vite configuration
│   ├── package.json
│   ├── .env                        # Local environment variables
│   └── .env.example                # Example environment file
│
├── setup.sh                        # macOS/Linux setup script
├── setup-windows.ps1               # Windows setup script
└── README.md                       # This file
```

## 🛠️ Common Development Commands

### Backend Commands
```bash
cd backend

# Start development server (auto-reload)
npm run dev

# Compile TypeScript
npm run build

# Run compiled JavaScript
npm start

# View database in visual tool
npx prisma studio

# Create new migration
npx prisma migrate dev --name <name>

# Reset database (clears all data!)
npx prisma migrate reset
```

### Frontend Commands
```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth with 7-day expiration
- **Password Hashing**: Bcrypt with 10 salt rounds
- **User Isolation**: Users only see their own todos
- **Soft Delete**: Todos marked DELETED instead of hard removal
- **CORS Protection**: Configured for localhost
- **Input Validation**: All inputs validated before processing

## 🐛 Troubleshooting

### Problem: Database Connection Failed

**Check if PostgreSQL is running:**

Windows:
```powershell
Get-Service -Name postgresql
```

macOS:
```bash
brew services list
```

Linux:
```bash
sudo systemctl status postgresql
```

**Check DATABASE_URL in backend/.env:**
```
postgresql://postgres:postgres@localhost:5432/todo_app
```

### Problem: Port Already in Use

**Kill process on port 3001:**

Windows:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

macOS/Linux:
```bash
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Problem: Prisma Migration Failed

```bash
cd backend

# Check migration status
npx prisma migrate status

# Resolve issues
npx prisma migrate resolve --rolled-back init

# Retry migration
npx prisma migrate dev --name init
```

### Problem: Frontend Can't Connect to Backend

1. Verify backend is running: `http://localhost:3001/api/health`
2. Check `VITE_API_BASE_URL` in `frontend/.env`
3. Try accessing from browser first to see error details

### Problem: Auth Token Errors

1. Clear localStorage: Press F12 → Application → Local Storage → Clear All
2. Sign out and sign in again
3. Check JWT_SECRET is set correctly in `backend/.env`

## 📖 Database Management with Prisma Studio

Visual database management tool - perfect for local development:

```bash
cd backend
npx prisma studio
```

Opens at `http://localhost:5555`

You can:
- View all users and todos
- Create/edit/delete records
- Run queries
- Inspect relationships

## 🚀 Performance Tips

- Frontend caches auth token in localStorage
- Backend uses pagination (default 10 items per page)
- Prisma Client is generated at build time
- Database indexes on authorId and status fields

## 📝 Example Workflow

1. **Sign up**: Create account at http://localhost:5173
2. **Add todos**: Use "Add Todo" button
3. **Set priority**: HIGH, MEDIUM, LOW
4. **Set due date**: Optional deadline
5. **Filter**: By status or priority
6. **Mark complete**: Click checkbox
7. **Edit**: Click edit button
8. **Delete**: Click delete button
9. **Logout**: Top right corner

## 💡 Tips for Development

- Use Prisma Studio to inspect database: `npx prisma studio`
- Check backend logs in terminal for errors
- Use browser DevTools (F12) to inspect network requests
- Frontend auto-reloads on file changes
- Backend requires restart for code changes
- Check console for error messages

## 🆘 Quick Help

**Everything is working!** 
- Frontend at http://localhost:5173
- Backend at http://localhost:3001
- Database via http://localhost:5555 (Prisma Studio)

**Need to restart?**
- Stop all terminals (Ctrl+C)
- Run backend and frontend again
- Database persists (won't be reset)

**Want to clear data?**
```bash
cd backend
npx prisma migrate reset
```

---

**Happy coding! 🎉**

For issues or questions, check the terminal output for error messages.
