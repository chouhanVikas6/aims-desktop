// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  openLogDirectory: () => ipcRenderer.send('open-log-directory'),
  
  // Google OAuth - opens native BrowserWindow for authentication
  googleOAuth: {
    authenticate: (authUrl) => ipcRenderer.invoke('google-oauth-authenticate', authUrl),
  },
  
  // Platform detection
  isElectron: true,
});
