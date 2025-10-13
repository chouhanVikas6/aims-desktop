export default function loadErrorPage() {
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>ZOID Desktop - Connection Error</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 40px;
                background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
                color: white;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container {
                max-width: 600px;
                text-align: center;
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                padding: 40px;
                border-radius: 20px;
                border: 1px solid rgba(255,255,255,0.2);
            }
                h1 { font-size: 2.5em; margin-bottom: 20px; font-weight: 300; }
            .error-icon { font-size: 4em; margin-bottom: 20px; }
            .retry-btn {
                background: #059669;
                border: none;
                color: white;
                padding: 15px 30px;
                border-radius: 8px;
                font-size: 1em;
                cursor: pointer;
                margin: 20px 10px;
                transition: background 0.3s;
            }
            .retry-btn:hover { background: #047857; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error-icon">⚠️</div>
            <h1>Frontend Connection Failed</h1>
            <p>Unable to connect to the frontend service at http://localhost:3004</p>
            <button class="retry-btn" onclick="location.reload()">🔄 Retry</button>
            <button class="retry-btn" onclick="window.close()" style="background: #6b7280;">❌ Close</button>
        </div>
    </body>
    </html>
  `));
}