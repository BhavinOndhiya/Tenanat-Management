# Quick Setup Guide

## Step 1: Database Setup

### Install MongoDB (if not installed)

1. Download MongoDB from: https://www.mongodb.com/try/download/community
2. Run the installer and follow the setup wizard
3. MongoDB will install as a Windows service by default

### Start MongoDB Service

**On Windows:**
1. Open Services (Win + R, type `services.msc`)
2. Find "MongoDB" service
3. Right-click and select "Start" if it's not running
4. Or use PowerShell (as Administrator):
```powershell
Start-Service MongoDB
```

**Alternative: Check if MongoDB is running:**
```powershell
Get-Service -Name "*mongo*"
```

**Or test connection:**
```powershell
Test-NetConnection -ComputerName localhost -Port 27017
```

**Note:** MongoDB will automatically create the database when you first connect to it. No need to create it manually!

## Step 2: Backend Setup

1. Navigate to backend:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in `backend/` directory with:
```env
PORT=3000
DATABASE_URL="mongodb://localhost:27017/complaint_db"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random
```

**Note:** MongoDB doesn't require username/password for local development. The database will be created automatically on first connection.

4. (Optional) Seed database:
```bash
npm run db:seed
```

7. Start backend:
```bash
npm run dev
```

Backend should be running on http://localhost:3000

## Step 3: Frontend Setup

1. Open a new terminal and navigate to frontend:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start frontend:
```bash
npm run dev
```

Frontend should be running on http://localhost:5173

## Step 4: Test the Application

1. Open browser to http://localhost:5173
2. Register a new account OR login with demo credentials:
   - Email: `demo@example.com`
   - Password: `demo123`
3. Create a complaint and verify it appears in the list

## Troubleshooting

### Database Connection Error

**Error**: `MongoServerError: connect ECONNREFUSED` or similar MongoDB connection errors

**Solutions:**

1. **Check if MongoDB service is running:**
   ```powershell
   Get-Service -Name "*mongo*"
   ```
   If not running, start it:
   ```powershell
   Start-Service MongoDB
   ```

2. **Verify MongoDB is listening on port 27017:**
   ```powershell
   Test-NetConnection -ComputerName localhost -Port 27017
   ```

3. **Check your `.env` file in `backend/` directory:**
   - Make sure `DATABASE_URL` is correct
   - Format: `mongodb://localhost:27017/complaint_db`
   - For MongoDB Atlas (cloud), use: `mongodb+srv://username:password@cluster.mongodb.net/complaint_db`

4. **Test MongoDB connection manually:**
   ```bash
   mongosh
   # Or if using older MongoDB:
   mongo
   ```

5. **If MongoDB is not installed as a service, start it manually:**
   ```bash
   mongod --dbpath "C:\data\db"
   ```
   (Make sure the directory exists or use your MongoDB data path)

### Other Common Issues

- **Port already in use**: Change PORT in backend/.env or kill the process using that port
- **CORS errors**: Make sure backend is running on port 3000 and frontend proxy is configured correctly
- **MongoDB connection timeout**: Check firewall settings and ensure MongoDB service is running


Admin    → admin@example.com / AdminPass123!
Officer  → officer@example.com / OfficerPass123!
Citizen  → citizen@example.com / CitizenPass123!
Citizen2 → rohan@example.com / CitizenPass123!
