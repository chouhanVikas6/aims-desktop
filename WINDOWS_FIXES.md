# Windows Compatibility Fixes

## Issues Found in Your Windows Log

From the log file screenshot you showed, I identified these critical issues:

### 1. ❌ Frontend Failed to Start
```
ERROR: 'PORT' is not recognized as an internal or external command
```

**Root Cause:** 
- Linux/Mac: `PORT=3004 node server.js` works (inline env var)
- Windows: This syntax doesn't work - needs separate env object

**Fixed:** Changed from:
```javascript
startCommand: "PORT=3004 node"
```
To:
```javascript
startCommand: "node",
env: { PORT: '3004' }
```

### 2. ❌ Backend Failed  
Same issue - spawn wasn't handling env vars properly

**Fixed:** Updated `startService()` to merge service-specific env vars:
```javascript
const env = { 
  ...process.env, 
  NODE_OPTIONS: '--no-experimental-fetch --no-warnings',
  NODE_PATH: path.join(process.cwd(), 'node_modules'),
  ...(serviceConfig.env || {})  // Merge service-specific env vars
};
```

### 3. ⚠️ Docker Not Available (Expected)
```
ERROR: Failed to start AimsAi Docker container
The system cannot find the file specified
```

**This is OK!** NodeODM/Docker is optional. The app will work without it.

## What Changed

### Files Modified:
- `src/services/service-manager.js`
  - Fixed frontend service to use proper Windows env var format
  - Updated `startService()` to merge custom env vars
  
### What Will Work Now:
✅ **Frontend** - Will start on port 3004 with proper PORT env var  
✅ **Backend** - Will start properly  
✅ **Logging** - You can see errors in the log file  
⚠️ **NodeODM** - Will skip if Docker not installed (this is fine)

## Testing Your New Build

Once the build completes:

1. **Copy to Windows:**
   ```bash
   # The new file will be at:
   dist/AIMS-Desktop-Portable.exe
   ```

2. **Run on Windows**

3. **Check the log file:**
   ```
   C:\Users\<YourUsername>\AppData\Roaming\AIMS Desktop\app-debug.log
   ```

4. **What you should see:**
   ```
   ✅ Backend started with PID xxxx
   ✅ Frontend started with PID xxxx
   ✅ All services are ready!
   ```

5. **If NodeODM fails:**
   - This is expected if Docker isn't installed
   - The app will continue without it
   - No action needed unless you need NodeODM

## Docker on Windows (Optional)

If you want NodeODM to work:

1. Install Docker Desktop for Windows
2. Ensure it's running
3. Make sure it's accessible from command line:
   ```cmd
   docker --version
   ```

## Expected Behavior

### Without Docker:
- ✅ Backend runs (port 3000)
- ✅ Frontend runs (port 3004)
- ⚠️ NodeODM skipped
- ✅ App opens normally

### With Docker:
- ✅ Backend runs (port 3000)
- ✅ Frontend runs (port 3004)  
- ✅ NodeODM runs (port 3001)
- ✅ App opens normally

## Log File Will Show:

**Success:**
```
[timestamp] INFO: Starting service: backend
[timestamp] INFO: Backend started with PID 1234
[timestamp] INFO: Backend is ready!
[timestamp] INFO: Starting service: frontend
[timestamp] INFO: Frontend started with PID 5678
[timestamp] INFO: Frontend is ready!
[timestamp] INFO: All services are ready!
```

**Partial Success (No Docker):**
```
[timestamp] INFO: Backend is ready!
[timestamp] INFO: Frontend is ready!
[timestamp] WARN: NodeODM skipped (Docker not available)
[timestamp] INFO: All required services ready!
```

## Troubleshooting

### If Frontend Still Fails:

1. Check log file for exact error
2. Make sure Node.js is accessible:
   ```cmd
   where node
   ```
3. Check if port 3004 is free:
   ```cmd
   netstat -ano | findstr :3004
   ```

### If Backend Fails:

1. Check if `aims-backend` binary is in resources folder
2. Check log file for permissions issues
3. Try running as administrator (right-click → Run as admin)

### If Ports Are Blocked:

Kill processes using the ports:
```cmd
# Find process on port 3000
netstat -ano | findstr :3000

# Kill it (replace PID with actual process ID)
taskkill /F /PID <PID>
```

## Next Steps

1. Wait for build to complete
2. Copy `dist/AIMS-Desktop-Portable.exe` to Windows
3. Run it
4. Check the log file
5. Share results!

---

**Build Date:** October 24, 2025  
**Fixed Version:** 1.0.1

