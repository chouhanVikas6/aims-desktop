const fs = require('fs');
const path = require('path');
const os = require('os');

class Logger {
  constructor() {
    // Create log file in temp directory or user home
    const logDir = path.join(os.homedir(), '.aims-desktop-logs');

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(logDir, `aims-desktop-${timestamp}.log`);

    // Initialize log file
    this.writeToFile(`=== AIMS Desktop Log Started ===`);
    this.writeToFile(`Timestamp: ${new Date().toISOString()}`);
    this.writeToFile(`Platform: ${process.platform}`);
    this.writeToFile(`Node Version: ${process.version}`);
    this.writeToFile(`Log File: ${this.logFile}`);
    this.writeToFile(`===============================\n`);

    console.log(`📝 Logging to: ${this.logFile}`);
  }

  writeToFile(message) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\n`;
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(level, message, ...args) {
    const formattedMessage = `${level.toUpperCase()}: ${message} ${args.length > 0 ? JSON.stringify(args) : ''}`;

    // Write to console
    console.log(formattedMessage);

    // Write to file
    this.writeToFile(formattedMessage);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }

  service(serviceName, message, ...args) {
    this.log('service', `[${serviceName}] ${message}`, ...args);
  }

  getLogPath() {
    return this.logFile;
  }

  // Capture console output
  captureConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
      this.writeToFile(`CONSOLE: ${message}`);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
      this.writeToFile(`ERROR: ${message}`);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
      this.writeToFile(`WARN: ${message}`);
      originalWarn.apply(console, args);
    };
  }

  // Create debug info summary
  createDebugSummary() {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      isPackaged: require('electron').app.isPackaged,
      cwd: process.cwd(),
      execPath: process.execPath,
      resourcesPath: process.resourcesPath,
      appPath: require('electron').app.getAppPath(),
      logFile: this.logFile
    };

    this.writeToFile(`DEBUG SUMMARY: ${JSON.stringify(debugInfo, null, 2)}`);
    return debugInfo;
  }
}

// Singleton instance
let loggerInstance = null;

function getLogger() {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

module.exports = { Logger, getLogger };