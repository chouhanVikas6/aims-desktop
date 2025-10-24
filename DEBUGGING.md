# AIMS Desktop - Debugging Guide

## Finding Log Files

When the app is packaged, console output is not visible. All logs are written to a file instead.

### Log File Locations:

**Windows:**
```
C:\Users\<YourUsername>\AppData\Roaming\aims-desktop\app-debug.log
```

**Linux:**
```
~/.config/AIMS Desktop/app-debug.log
```

**macOS:**
```
~/Library/Application Support/aims-desktop/app-debug.log
```

### Opening Log Files:

1. **From the App:** If the app fails to start, an error dialog will show with the log file location
2. **From Loading Screen:** Click "📄 Open Log File" button when errors occur
3. **Manually:** Navigate to the paths above

## Common Issues

### 1. App Stuck at Loading Screen

**Symptoms:** Loading screen shows indefinitely

**Likely Causes:**
- Backend service failed to start
- Frontend service failed to start  
- Ports 3000/3004 already in use

**How to Debug:**
1. Wait for the 2-minute timeout or check error message
2. Click "📄 Open Log File" button
3. Look for errors related to:
   - `Backend starting...` or `Frontend starting...`
   - Port already in use
   - SQLite connection errors

**Solutions:**
- Close any existing AIMS Desktop instances
- Kill processes on ports 3000/3004:
  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  
  # Linux/Mac
  lsof -ti:3000 | xargs kill -9
  lsof -ti:3004 | xargs kill -9
  ```

### 2. SQLite Database Errors

**Symptoms:** Backend fails with "SQLite package not found"

**Check:**
1. Verify `resources/node_modules/sqlite3` exists in installation directory
2. Check log file for path resolution errors

**Solution:**
- Rebuild the app: `npm run build:win` or `npm run build:linux`
- The build process will automatically include sqlite3

### 3. Frontend Won't Load

**Symptoms:** Main window shows blank/white screen

**Check:**
1. Look in logs for "Frontend started with PID"
2. Check if port 3004 is accessible: `http://localhost:3004`
3. Look for "Request is not defined" errors

**Solution:**
- The polyfills should handle this, but if error persists:
- Check `resources/aims-frontend/server.js` has polyfills at the top

## Development vs Production

### Running in Development Mode

```bash
# Development (shows console output)
npm start
```

In dev mode:
- ✅ Console output is visible
- ✅ Errors show in terminal
- ✅ Services run from `resources/` folder
- ✅ Hot reload available (for Electron changes, restart needed)

### Running Packaged Build

```bash
# Build for current platform
npm run build

# Run the built executable
./dist/linux-unpacked/aims-desktop        # Linux
./dist/win-unpacked/"AIMS Desktop.exe"    # Windows
```

In production mode:
- ❌ No console output
- ✅ Logs written to file
- ✅ Services run from packaged `resources/`
- ✅ Error dialogs show log file location

## Advanced Debugging

### Enable Verbose Logging

Edit `src/utils/logger.js` and change log level if needed.

### Check Service Status Manually

When app is running, you can check if services are up:

```bash
# Backend health check
curl http://localhost:3000/auth/token-status

# Frontend health check  
curl http://localhost:3004

# NodeODM (if enabled)
curl http://localhost:3001/info
```

### Run Services Independently

For deeper debugging, run services outside Electron:

```bash
# Backend
cd resources
./aims-backend start

# Frontend  
cd resources/aims-frontend
node server.js

# Then start Electron without starting services
# (comment out startAllServices() in main.js)
```

### Debug Service Manager

Add breakpoints or extra logging in:
- `src/services/service-manager.js` - Service startup logic
- `src/main.js` - App initialization
- `src/windows/loading-window.js` - Loading UI

## Emergency Recovery

### App Won't Start At All

1. **Find and delete app data:**
   ```bash
   # Windows
   rd /s /q %APPDATA%\aims-desktop
   
   # Linux
   rm -rf ~/.config/aims-desktop
   
   # macOS
   rm -rf ~/Library/Application\ Support/aims-desktop
   ```

2. **Kill all processes:**
   ```bash
   # Windows
   taskkill /F /IM "AIMS Desktop.exe"
   taskkill /F /IM aims-backend.exe
   
   # Linux/Mac
   killall -9 aims-desktop aims-backend node
   ```

3. **Reinstall**

### Port Conflicts

If you can't kill the process on port 3000/3004, restart your computer or change the port in:
- `src/services/service-manager.js` - Change port numbers
- `src/main.js` - Change frontend URL

## Getting Help

When reporting issues, include:
1. **Log file** (`app-debug.log`)
2. **Platform** (Windows/Linux/macOS + version)
3. **Steps to reproduce**
4. **Screenshot** of error dialog
5. **Output of:**
   ```bash
   # What's running on the ports
   netstat -ano | findstr "3000 3004"  # Windows
   lsof -i :3000,3004                   # Linux/Mac
   ```

## Build Checklist

Before building a release:

- [ ] Run `npm install` to ensure dependencies are up-to-date
- [ ] Run `npm run setup-backend-deps` to copy sqlite3
- [ ] Test in dev mode: `npm start`
- [ ] Build: `npm run build:win` or `npm run build:linux`
- [ ] Test the packaged build from `dist/`
- [ ] Check log file location works
- [ ] Verify "Open Log File" button works
- [ ] Test clean shutdown (ports released)
- [ ] Test error scenarios (kill backend mid-start, etc.)

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm start` | Run in development mode |
| `npm run build:win` | Build Windows portable |
| `npm run build:linux` | Build Linux AppImage |
| `npm run setup-backend-deps` | Copy sqlite3 to resources |
| `npm install` | Install dependencies + auto-setup |

---

**Last Updated:** October 2025
**Version:** 1.0.0

