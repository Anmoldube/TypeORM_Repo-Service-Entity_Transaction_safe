# 🚀 Quick Start Guide - Local Development

## Before You Start

Make sure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ npm installed (`npm --version`)
- ✅ PostgreSQL 12+ running and accessible

## 5-Minute Setup

### 1. Create PostgreSQL Database

**Windows (PowerShell):**
```powershell
psql -U postgres
CREATE DATABASE todo_app;
\q
```

**macOS:**
```bash
createdb todo_app
```

**Linux:**
```bash
sudo -u postgres createdb todo_app
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install
npx prisma generate

# Frontend (in new terminal)
cd frontend
npm install
```

### 3. Run Database Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

### 4. Start Everything!

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 (Optional) - Database Tool:**
```bash
cd backend
npx prisma studio
```

## ✅ Verify It's Working

1. **Backend**: http://localhost:3001/api/health → Should return `{"status":"OK",...}`
2. **Frontend**: http://localhost:5173 → Should show login page
3. **Database**: http://localhost:5555 → Should show Prisma Studio

## 🧪 Test the App

1. Sign up at http://localhost:5173
2. Create a todo
3. Filter by status/priority
4. Mark as complete
5. Delete a todo
6. Sign out and sign in with different account

## 📝 Important Files

- `backend/.env` - Database connection string (edit if PostgreSQL port differs)
- `frontend/.env` - Backend API URL (default: localhost:3001)
- `backend/prisma/schema.prisma` - Database schema
- `backend/index.ts` - API endpoints
- `frontend/src/App.tsx` - Main UI component

## 🔧 If Something Breaks

**Port already in use?**
```powershell
# Windows - Kill process on port 3001
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

**Database connection failed?**
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1;"
```

**Migrations failed?**
```bash
cd backend
npx prisma migrate reset  # Clears ALL data!
npx prisma migrate dev --name init
```

**Frontend can't reach backend?**
1. Verify backend is running: `http://localhost:3001/api/health`
2. Check `frontend/.env` has correct `VITE_API_BASE_URL`
3. Restart frontend dev server

## 📊 Database Credentials

Default PostgreSQL connection (in `backend/.env`):
```
User: postgres
Password: postgres
Host: localhost
Port: 5432
Database: todo_app
```

If different, update `DATABASE_URL` in `backend/.env`

## 🎯 Next Steps

✅ Read `README.md` for detailed documentation
✅ Check `backend/index.ts` to understand API
✅ Explore `frontend/src/components` for UI components
✅ Use `npx prisma studio` to inspect database

---

**That's it! You're ready to develop locally! 🎉**
