const { app, BrowserWindow } = require('electron');
function createLoadingWindow() {
  const loadingWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false
    },
    show: false
  });

  loadingWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>ZOID - Starting Services</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                overflow: hidden;
                border-radius: 15px;
            }
            
            .loading-container {
                text-align: center;
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                padding: 40px;
                border-radius: 20px;
                border: 1px solid rgba(255,255,255,0.2);
                max-width: 500px;
                width: 100%;
            }
            
            .logo {
                font-size: 3em;
                font-weight: 900;
                color: white;
                text-shadow: 0 0 30px rgba(255,255,255,0.5);
                letter-spacing: 6px;
                margin-bottom: 30px;
            }
            
            .progress-container {
                margin: 30px 0;
            }
            
            .progress-bar {
                width: 100%;
                height: 8px;
                background: rgba(255,255,255,0.2);
                border-radius: 4px;
                overflow: hidden;
                margin: 20px 0;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #4ade80, #22c55e);
                width: 0%;
                transition: width 0.5s ease;
                box-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
            }
            
            .progress-text {
                color: rgba(255,255,255,0.9);
                font-size: 1em;
                margin: 10px 0;
            }
            
            .services-status {
                margin: 30px 0;
                text-align: left;
            }
            
            .service-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .service-item:last-child {
                border-bottom: none;
            }
            
            .service-name {
                font-weight: 500;
                color: white;
            }
            
            .service-status {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.8em;
                font-weight: 500;
            }
            
            .status-waiting {
                background: rgba(156, 163, 175, 0.3);
                color: #9ca3af;
            }
            
            .status-starting {
                background: rgba(251, 191, 36, 0.3);
                color: #fbbf24;
            }
            
            .status-running {
                background: rgba(34, 197, 94, 0.3);
                color: #22c55e;
            }
            
            .status-error {
                background: rgba(239, 68, 68, 0.3);
                color: #ef4444;
            }
            
            .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: #fff;
                animation: spin 1s ease-in-out infinite;
                margin: 20px auto;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
        <div class="loading-container">
            <div class="logo">ZOID</div>
            
            <div class="progress-container">
                <div class="progress-bar">
                    <div id="progress-fill" class="progress-fill"></div>
                </div>
                <div id="progress-text" class="progress-text">Initializing...</div>
            </div>
            
            <div class="services-status">
                <div class="service-item">
                    <span class="service-name">🔵 Backend Service</span>
                    <span id="backend-status" class="service-status status-waiting">Waiting</span>
                </div>
                <div class="service-item">
                    <span class="service-name">🟡 NodeODM Service</span>
                    <span id="nodeodm-status" class="service-status status-waiting">Waiting</span>
                </div>
                <div class="service-item">
                    <span class="service-name">🟢 Frontend Service</span>
                    <span id="frontend-status" class="service-status status-waiting">Waiting</span>
                </div>
            </div>
            
            <div class="spinner"></div>
        </div>
        
        <script>
            function updateProgress(percent, text) {
                document.getElementById('progress-fill').style.width = percent + '%';
                document.getElementById('progress-text').textContent = text;
            }
            
            function updateServiceStatus(service, status, statusClass) {
                const element = document.getElementById(service + '-status');
                if (element) {
                    element.textContent = status;
                    element.className = 'service-status ' + statusClass;
                }
            }
            
            // Make functions available globally
            window.updateProgress = updateProgress;
            window.updateServiceStatus = updateServiceStatus;
        </script>
    </body>
    </html>
  `));

  return loadingWindow;
}
module.exports = { createLoadingWindow };