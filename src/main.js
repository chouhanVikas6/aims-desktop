const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const SplashWindow = require('./windows/splash-window');
const ServiceManager = require('./services/service-manager');
const {createLoadingWindow} = require('./windows/loading-window');

let mainWindow;
let splashWindow;
let serviceManager;

// Setup file logging for packaged apps
const logFilePath = path.join(app.getPath('userData'), 'app-debug.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Save original console methods FIRST before any overrides
const originalLog = console.log;
const originalError = console.error;

function writeLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  try {
    logStream.write(logMessage);
  } catch (error) {
    originalError('Failed to write to log file:', error);
  }
}

// Override console methods
console.log = (...args) => {
  originalLog(...args);
  writeLog(args.join(' '));
};
console.error = (...args) => {
  originalError(...args);
  writeLog('ERROR: ' + args.join(' '));
};

writeLog('='.repeat(80));
writeLog('Application Starting...');
writeLog(`Log file: ${logFilePath}`);
writeLog(`App Path: ${app.getAppPath()}`);
writeLog(`Resources Path: ${process.resourcesPath}`);
writeLog(`User Data: ${app.getPath('userData')}`);

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running. Quitting...');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.window.focus();
    }
  });
}
let isInitializing = false;
let hasInitialized = false;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false
    },
    title: 'ZOID - Aerial Image Management System',
    autoHideMenuBar: true,
    show: false // Don't show until splash is done
  });

  // Load your Next.js frontend
  const frontendURL = 'http://localhost:3004';
  
  mainWindow.loadURL(frontendURL).catch(error => {
    console.error('Failed to load frontend:', error);
    // Load error page
    loadErrorPage();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}


// Add IPC handler for opening log file
// function showSplashAndInitialize() {
//   // Create and show splash screen
//   splashWindow = new SplashWindow();
//   const splash = splashWindow.create();
  
//   splash.once('ready-to-show', () => {
//     splashWindow.show();
    
//     // Start services after a short delay
//     setTimeout(() => {
//       // Initialize service manager
//       serviceManager = new ServiceManager();

//       // Handle service events - UPDATE SPLASH WINDOW
//       serviceManager.on('startup-progress', (percent, message) => {
//         console.log(`Progress: ${percent}% - ${message}`);
//         if (splash && !splash.isDestroyed()) {
//           splash.webContents.executeJavaScript(`
//             window.updateProgress(${percent}, "${message}");
//           `);
//         }
//       });
      
//       serviceManager.on('service-status', (service, status, message) => {
//         console.log(`Service ${service}: ${status} - ${message}`);
//         // You'll need to add updateServiceStatus function to splash if you want individual service status
//         // For now, we can just show it in the progress text
//         if (splash && !splash.isDestroyed()) {
//           splash.webContents.executeJavaScript(`
//             window.updateProgress("${service}: ${message}");
//           `).catch(err => console.error('Error updating splash:', err));
//         }
//       });

//       serviceManager.on('all-services-ready', () => {
//         console.log('✅ All services are ready!');
        
//         // Create and show main window
//         createMainWindow();
        
//         mainWindow.once('ready-to-show', () => {
//           mainWindow.show();
          
//           // Close splash window (not loadingWindow!)
//           if (splash && !splash.isDestroyed()) {
//             splash.close();
//           }
//         });
//       });
      
//       serviceManager.on('startup-failed', (error) => {
//         console.error('❌ Service startup failed:', error);
        
//         // Show error dialog with log file location
//         dialog.showErrorBox(
//           'Service Startup Failed',
//           `Failed to start services: ${error}\n\nCheck log file at:\n${logFilePath}`
//         );
        
//         if (splash && !splash.isDestroyed()) {
//           splash.webContents.executeJavaScript(`
//             document.querySelector('.loading-dots').style.display = 'none';
//             window.updateProgress(0, "Startup failed: ${error.replace(/"/g, '\\"')}");
//           `);
//         }
//       });
      
//       // Start all services with error handling
//       serviceManager.startAllServices().catch(error => {
//         console.error('Fatal error starting services:', error);
//         dialog.showErrorBox(
//           'Fatal Error',
//           `Could not start services: ${error.message}\n\nLog file: ${logFilePath}`
//         );
//       });
      
//       // Add a timeout to prevent infinite loading
//       setTimeout(() => {
//         if (!mainWindow || !mainWindow.isVisible()) {
//           console.error('Services failed to start within 2 minutes');
//           dialog.showErrorBox(
//             'Startup Timeout',
//             `Services failed to start within 2 minutes.\n\nLog file: ${logFilePath}\n\nTry:\n1. Close any existing AIMS Desktop processes\n2. Check if ports 3000/3004 are in use\n3. Run from command line to see errors`
//           );
          
//           if (splash && !splash.isDestroyed()) {
//             splash.webContents.executeJavaScript(`
//               document.querySelector('.loading-dots').style.display = 'none';
//               window.updateProgress(0, "Startup timeout - check logs");
//             `);
//           }
//         }
//       }, 120000); // 2 minute timeout
      
//     }, 1000); // 1 second delay
//   });
// }

function showSplashAndInitialize() {
  // Prevent multiple initializations
  if (isInitializing || hasInitialized) {
    console.log('Already initializing or initialized, skipping...');
    return;
  }
  
  isInitializing = true;
  console.log('Starting splash and initialization...');
  
  // Create and show splash screen
  splashWindow = new SplashWindow();
  const splash = splashWindow.create();
  
  splash.once('ready-to-show', () => {
    splashWindow.show();
    
    // Start services after a short delay
    setTimeout(() => {
      // Initialize service manager only if not already created
      if (!serviceManager) {
        serviceManager = new ServiceManager();
      }

      // Handle service events - UPDATE SPLASH WINDOW
      serviceManager.on('startup-progress', (percent, message) => {
        console.log(`Progress: ${percent}% - ${message}`);
        if (splash && !splash.isDestroyed()) {
          splash.webContents.executeJavaScript(`
            if (window.updateProgress) {
              window.updateProgress(${percent}, "${message}");
            }
          `).catch(err => console.error('Error updating progress:', err));
        }
      });
      
      serviceManager.on('service-status', (service, status, message) => {
        console.log(`Service ${service}: ${status} - ${message}`);
        if (splash && !splash.isDestroyed()) {
          // Fixed: Added percent parameter
          const estimatedPercent = status === 'running' ? 90 : status === 'starting' ? 50 : 10;
          splash.webContents.executeJavaScript(`
            if (window.updateProgress) {
              window.updateProgress(${estimatedPercent}, "${service}: ${message}");
            }
          `).catch(err => console.error('Error updating service status:', err));
        }
      });

      serviceManager.on('all-services-ready', () => {
        console.log('✅ All services are ready!');
        hasInitialized = true;
        isInitializing = false;
        
        // Create and show main window
        if (!mainWindow) {
          createMainWindow();
        }
        
        mainWindow.once('ready-to-show', () => {
          mainWindow.show();
          
          // Close splash window
          if (splash && !splash.isDestroyed()) {
            splash.close();
          }
        });
      });
      
      serviceManager.on('startup-failed', (error) => {
        console.error('❌ Service startup failed:', error);
        isInitializing = false;
        
        // Show error dialog with log file location
        dialog.showErrorBox(
          'Service Startup Failed',
          `Failed to start services: ${error}\n\nCheck log file at:\n${logFilePath}`
        );
        
        if (splash && !splash.isDestroyed()) {
          splash.webContents.executeJavaScript(`
            document.querySelector('.loading-dots').style.display = 'none';
            if (window.updateProgress) {
              window.updateProgress(0, "Startup failed: ${error.replace(/"/g, '\\"')}");
            }
          `).catch(err => console.error('Error showing error:', err));
        }
        
        // Quit app on startup failure
        setTimeout(() => app.quit(), 3000);
      });
      
      // Start all services with error handling
      serviceManager.startAllServices().catch(error => {
        console.error('Fatal error starting services:', error);
        isInitializing = false;
        
        dialog.showErrorBox(
          'Fatal Error',
          `Could not start services: ${error.message}\n\nLog file: ${logFilePath}`
        );
        
        setTimeout(() => app.quit(), 2000);
      });
      
      // Add a timeout to prevent infinite loading
      setTimeout(() => {
        if (!mainWindow || !mainWindow.isVisible()) {
          console.error('Services failed to start within 2 minutes');
          isInitializing = false;
          
          dialog.showErrorBox(
            'Startup Timeout',
            `Services failed to start within 2 minutes.\n\nLog file: ${logFilePath}\n\nTry:\n1. Close any existing AIMS Desktop processes\n2. Check if ports 3000/3004 are in use\n3. Run from command line to see errors`
          );
          
          if (splash && !splash.isDestroyed()) {
            splash.webContents.executeJavaScript(`
              document.querySelector('.loading-dots').style.display = 'none';
              if (window.updateProgress) {
                window.updateProgress(0, "Startup timeout - check logs");
              }
            `).catch(err => console.error('Error showing timeout:', err));
          }
          
          setTimeout(() => app.quit(), 3000);
        }
      }, 120000); // 2 minute timeout
      
    }, 1000); // 1 second delay
  });
}
ipcMain.on('open-log-directory', () => {
  const userDataPath = app.getPath('userData');
  shell.openPath(userDataPath).catch(err => {
    console.error('Failed to open log directory:', err);
  });
});

app.whenReady().then(() => {
  showSplashAndInitialize();
});

let isQuitting = false;

app.on('before-quit', async (event) => {
  if (isQuitting) return;
  
  event.preventDefault();
  isQuitting = true;
  
  console.log('🛑 Application quitting, cleaning up services...');
  
  if (serviceManager) {
    try {
      await serviceManager.stopAllServices();
      console.log('✅ Services cleaned up successfully');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
  
  // Give processes time to die
  setTimeout(() => {
    app.exit(0);
  }, 1000);
});

app.on('window-all-closed',async () => {
  if (process.platform !== 'darwin') {
    if (!isQuitting) {
      isQuitting = true;
      if (serviceManager) {
        await serviceManager.stopAllServices();
      }
    }
    app.quit();
  }
});

// app.on('activate', () => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     showSplashAndInitialize();
//   }
// });

app.on('activate', () => {
  // On macOS, recreate window when dock icon is clicked and no windows exist
  if (BrowserWindow.getAllWindows().length === 0) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    } else if (!isInitializing && !hasInitialized) {
      showSplashAndInitialize();
    }
  }
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, cleaning up...');
  if (serviceManager) {
    await serviceManager.stopAllServices();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, cleaning up...');
  if (serviceManager) {
    await serviceManager.stopAllServices();
  }
  process.exit(0);
});