const { app, BrowserWindow } = require('electron');
const path = require('path');
const SplashWindow = require('./windows/splash-window');
const ServiceManager = require('./services/service-manager');
const {createLoadingWindow} = require('./windows/loading-window');
let mainWindow;
let splashWindow;
let serviceManager;

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



function showSplashAndInitialize() {
  // Create and show splash screen
  splashWindow = new SplashWindow();
  const splash = splashWindow.create();
  
  splash.once('ready-to-show', () => {
    splashWindow.show();
    
    // After 1 second, close splash and show main window
    setTimeout(() => {
      // Create main window
      if (!splashWindow.isDestroyed()) {
        splashWindow.close();
      }

      // Show loading screen and start services
      const loadingWindow = createLoadingWindow();
      loadingWindow.center();
      loadingWindow.show();

      // Initialize service manager
      serviceManager = new ServiceManager();

      // Handle service events
      serviceManager.on('startup-progress', (percent, message) => {
        console.log(`Progress: ${percent}% - ${message}`);
        if (loadingWindow && !loadingWindow.isDestroyed()) {
          loadingWindow.webContents.executeJavaScript(`
            window.updateProgress(${percent}, "${message}");
          `);
        }
      });
      
      serviceManager.on('service-status', (service, status, message) => {
        console.log(`Service ${service}: ${status} - ${message}`);
        if (loadingWindow && !loadingWindow.isDestroyed()) {
          loadingWindow.webContents.executeJavaScript(`
            window.updateServiceStatus("${service}", "${status}", "status-${status}");
          `);
        }
      });

      serviceManager.on('all-services-ready', () => {
        console.log('✅ All services are ready!');
        
        // Create and show main window
        createMainWindow();
        
        mainWindow.once('ready-to-show', () => {
          mainWindow.show();
          
          // Close loading window
          if (loadingWindow && !loadingWindow.isDestroyed()) {
            loadingWindow.close();
          }
        });
      });
      
      serviceManager.on('startup-failed', (error) => {
        console.error('❌ Service startup failed:', error);
        
        if (loadingWindow && !loadingWindow.isDestroyed()) {
          loadingWindow.webContents.executeJavaScript(`
            document.querySelector('.spinner').style.display = 'none';
            window.updateProgress(0, "Startup failed: ${error}");
          `);
        }
      });
      
      // Start all services
      serviceManager.startAllServices();
      
    }, 2000); // 1 second delay
  });
}

app.whenReady().then(() => {
  showSplashAndInitialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    showSplashAndInitialize();
  }
});