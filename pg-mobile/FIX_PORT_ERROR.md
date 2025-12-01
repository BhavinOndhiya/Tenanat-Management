# Fix Port 8081 Already in Use Error

## Problem
Expo is trying to use port 8081, but it's already occupied by another process.

## Quick Fix

### Option 1: Kill the Process (Recommended)

**Windows PowerShell:**
```powershell
# Find and kill process on port 8081
cd pg-mobile
.\kill-port.ps1

# Then start Expo
npm start
```

**Or manually:**
```powershell
# Find the process
netstat -ano | findstr :8081

# Kill it (replace PID with the number from above)
taskkill /PID <PID> /F

# Then start Expo
npm start
```

### Option 2: Use Different Port

```powershell
cd pg-mobile
npm start -- --port 8082
```

### Option 3: Kill All Node Processes (Nuclear Option)

⚠️ **Warning:** This will kill ALL Node.js processes!

```powershell
Get-Process node | Stop-Process -Force
npm start
```

## Prevention

1. **Always stop Expo properly:**
   - Press `Ctrl+C` in the terminal running Expo
   - Don't just close the terminal window

2. **Check for running processes:**
   ```powershell
   netstat -ano | findstr :8081
   ```

3. **Use the kill script:**
   ```powershell
   .\kill-port.ps1
   ```

## Common Causes

- Previous Expo session not closed properly
- Multiple Expo instances running
- Another development server using port 8081
- Crashed Expo process still holding the port

## Verify Port is Free

After killing the process, verify:
```powershell
netstat -ano | findstr :8081
```

Should return nothing (port is free).

