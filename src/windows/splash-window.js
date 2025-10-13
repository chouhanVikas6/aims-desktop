const { BrowserWindow } = require('electron');
const path = require('path');

class SplashWindow {
  constructor() {
    this.window = null;
  }

  create() {
    this.window = new BrowserWindow({
      width: 600,
      height: 400,
      frame: false, // Remove window frame for clean look
      alwaysOnTop: true,
      transparent: true,
      resizable: false,
      webPreferences: {
        contextIsolation: true,
        enableRemoteModule: false
      },
      show: false
    });

    this.window.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>ZOID</title>
          <style>
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }
              
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
              
              .splash-container {
                  text-align: center;
                  position: relative;
                  z-index: 10;
              }
              
              .logo {
                  font-size: 4.5em;
                  font-weight: 900;
                  color: white;
                  text-shadow: 0 0 30px rgba(255,255,255,0.5);
                  letter-spacing: 8px;
                  margin-bottom: 20px;
                  animation: logoGlow 2s ease-in-out infinite alternate;
              }
              
              .tagline {
                  font-size: 1.2em;
                  color: rgba(255,255,255,0.9);
                  font-weight: 300;
                  letter-spacing: 2px;
                  opacity: 0;
                  animation: fadeInUp 1s ease-out 0.3s forwards;
              }
              
              .loading-dots {
                  display: flex;
                  justify-content: center;
                  margin-top: 30px;
                  gap: 5px;
              }
              
              .dot {
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  background: white;
                  animation: dotPulse 1.4s ease-in-out infinite both;
              }
              
              .dot:nth-child(1) { animation-delay: -0.32s; }
              .dot:nth-child(2) { animation-delay: -0.16s; }
              .dot:nth-child(3) { animation-delay: 0; }
              
              .background-animation {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  overflow: hidden;
                  z-index: 1;
              }
              
              .floating-shape {
                  position: absolute;
                  background: rgba(255,255,255,0.1);
                  border-radius: 50%;
                  animation: float 6s ease-in-out infinite;
              }
              
              .shape1 {
                  width: 80px;
                  height: 80px;
                  top: 20%;
                  left: 10%;
                  animation-delay: 0s;
              }
              
              .shape2 {
                  width: 60px;
                  height: 60px;
                  top: 60%;
                  right: 15%;
                  animation-delay: 2s;
              }
              
              .shape3 {
                  width: 40px;
                  height: 40px;
                  bottom: 30%;
                  left: 20%;
                  animation-delay: 4s;
              }
              
              @keyframes logoGlow {
                  0% {
                      text-shadow: 0 0 30px rgba(255,255,255,0.5);
                      transform: scale(1);
                  }
                  100% {
                      text-shadow: 0 0 50px rgba(255,255,255,0.8);
                      transform: scale(1.02);
                  }
              }
              
              @keyframes fadeInUp {
                  0% {
                      opacity: 0;
                      transform: translateY(30px);
                  }
                  100% {
                      opacity: 1;
                      transform: translateY(0);
                  }
              }
              
              @keyframes dotPulse {
                  0%, 80%, 100% {
                      transform: scale(0);
                      opacity: 0.5;
                  }
                  40% {
                      transform: scale(1);
                      opacity: 1;
                  }
              }
              
              @keyframes float {
                  0%, 100% {
                      transform: translateY(0px) rotate(0deg);
                      opacity: 0.3;
                  }
                  50% {
                      transform: translateY(-20px) rotate(180deg);
                      opacity: 0.6;
                  }
              }
              
              .version {
                  position: absolute;
                  bottom: 20px;
                  left: 50%;
                  transform: translateX(-50%);
                  color: rgba(255,255,255,0.7);
                  font-size: 0.9em;
                  font-weight: 300;
              }
          </style>
      </head>
      <body>
          <div class="background-animation">
              <div class="floating-shape shape1"></div>
              <div class="floating-shape shape2"></div>
              <div class="floating-shape shape3"></div>
          </div>
          
          <div class="splash-container">
              <div class="logo">ZOID</div>
              <div class="tagline">AERIAL IMAGE MANAGEMENT SYSTEM</div>
              
              <div class="loading-dots">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
              </div>
          </div>
          
          <div class="version">v1.0.0</div>
      </body>
      </html>
    `));

    return this.window;
  }

  show() {
    if (this.window) {
      this.window.center();
      this.window.show();
    }
  }

  close() {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }

  isDestroyed() {
    return !this.window || this.window.isDestroyed();
  }
}

module.exports = SplashWindow;