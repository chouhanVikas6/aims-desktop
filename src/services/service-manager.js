const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');
const kill = require('tree-kill');
const { EventEmitter } = require('events');
const { app } = require('electron');
const fs = require('fs');
const { getLogger } = require('../utils/logger');

class ServiceManager extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.isShuttingDown = false;
    this.logger = getLogger();
    
    this.logger.info('ServiceManager initialized');
  }

    // Add this new function to log directory structure
  logDirectoryStructure(dirPath, prefix = '', maxDepth = 5, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      this.logger.info(`${prefix}... (max depth reached)`);
      return;
    }

    try {
      if (!fs.existsSync(dirPath)) {
        this.logger.info(`${prefix}❌ Directory does not exist: ${dirPath}`);
        return;
      }

      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        this.logger.info(`${prefix}📄 ${path.basename(dirPath)} (file)`);
        return;
      }

      this.logger.info(`${prefix}📁 ${path.basename(dirPath)}/`);
      
      const items = fs.readdirSync(dirPath);
      items.forEach((item, index) => {
        const itemPath = path.join(dirPath, item);
        const isLast = index === items.length - 1;
        const newPrefix = prefix + (isLast ? '└── ' : '├── ');
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        
        try {
          const itemStats = fs.statSync(itemPath);
          if (itemStats.isDirectory()) {
            this.logger.info(`${newPrefix}📁 ${item}/`);
            this.logDirectoryStructure(itemPath, nextPrefix, maxDepth, currentDepth + 1);
          } else {
            const size = itemStats.size;
            const sizeStr = size > 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)}MB` : 
                           size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
            const executable = (itemStats.mode & parseInt('111', 8)) !== 0 ? ' 🟢' : '';
            this.logger.info(`${newPrefix}📄 ${item} (${sizeStr})${executable}`);
          }
        } catch (error) {
          this.logger.info(`${newPrefix}❌ ${item} (error: ${error.message})`);
        }
      });
    } catch (error) {
      this.logger.error(`Error reading directory ${dirPath}: ${error.message}`);
    }
  }

  // Add this function to log all relevant paths
  logAllPaths() {
    this.logger.info('=' .repeat(60));
    this.logger.info('📋 COMPLETE DIRECTORY STRUCTURE ANALYSIS');
    this.logger.info('=' .repeat(60));

    const isPackaged = app.isPackaged;
    
    // Log current working directory
    this.logger.info('\n🔍 Current Working Directory:');
    this.logDirectoryStructure(process.cwd(), '', 3);

    // Log resources path (for packaged apps)
    if (isPackaged && process.resourcesPath) {
      this.logger.info('\n🔍 Resources Directory (process.resourcesPath):');
      this.logDirectoryStructure(process.resourcesPath, '', 4);
    }

    // Log app path
    this.logger.info('\n🔍 App Path (app.getAppPath()):');
    this.logDirectoryStructure(app.getAppPath(), '', 3);

    // For development, also log parent directory
    if (!isPackaged) {
      const parentDir = path.dirname(process.cwd());
      this.logger.info('\n🔍 Parent Directory:');
      this.logDirectoryStructure(parentDir, '', 2);
      
      // Check for resources directory in current dir
      const resourcesDir = path.join(process.cwd(), 'resources');
      if (fs.existsSync(resourcesDir)) {
        this.logger.info('\n🔍 Local Resources Directory:');
        this.logDirectoryStructure(resourcesDir, '', 4);
      }
    }

    // Log temp directory structure (where AppImage mounts)
    if (isPackaged) {
      const tempDirs = ['/tmp', '/var/tmp'];
      tempDirs.forEach(tmpDir => {
        if (fs.existsSync(tmpDir)) {
          this.logger.info(`\n🔍 Checking ${tmpDir} for AppImage mounts:`);
          try {
            const items = fs.readdirSync(tmpDir);
            const appImageMounts = items.filter(item => 
              item.includes('.mount_') || item.includes('AIMS') || item.includes('aims')
            );
            if (appImageMounts.length > 0) {
              appImageMounts.forEach(mount => {
                const mountPath = path.join(tmpDir, mount);
                this.logger.info(`\n📁 Found potential AppImage mount: ${mountPath}`);
                this.logDirectoryStructure(mountPath, '', 3);
              });
            } else {
              this.logger.info(`   No AppImage mounts found in ${tmpDir}`);
            }
          } catch (error) {
            this.logger.error(`   Error reading ${tmpDir}: ${error.message}`);
          }
        }
      });
    }

    // Log environment variables related to paths
    this.logger.info('\n🔍 Path-related Environment Variables:');
    const pathVars = ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'APPDIR', 'APPIMAGE'];
    pathVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        this.logger.info(`   ${varName}: ${value}`);
      }
    });

    this.logger.info('\n' + '=' .repeat(60));
    this.logger.info('📋 END DIRECTORY STRUCTURE ANALYSIS');
    this.logger.info('=' .repeat(60));
  }

  // Enhanced logging for service output
  logServiceOutput(serviceName, stream, data) {
    const lines = data.toString().split('\n').filter(line => line.trim() !== '');
    lines.forEach(line => {
      this.logger.info(`[${serviceName}] [${stream}] ${line.trim()}`);
    });
  }

  getServicePaths() {
    this.logAllPaths(); // Log all paths for debugging
    const isPackaged = app.isPackaged;
    const currentDir = process.resourcesPath;
    const parentDir = isPackaged ? process.resourcesPath : path.dirname(currentDir);
    
    this.logger.info('🔍 ServiceManager Debug Info:');
    this.logger.info('   isPackaged:', isPackaged);
    this.logger.info('   process.cwd():', process.cwd());
    this.logger.info('   __dirname:', __dirname);
    this.logger.info('   app.getAppPath():', app.getAppPath());
    this.logger.info('   process.resourcesPath:', process.resourcesPath);
    this.logger.info('   process.execPath:', process.execPath);
    let debugmessage= "   currentDir: " + currentDir + "\n";
    debugmessage += "   parentDir: " + parentDir + "\n";
    debugmessage += "   __dirname: " + __dirname + "\n";
    debugmessage += "   app.getAppPath(): " + app.getAppPath() + "\n";
    debugmessage += "   process.resourcesPath: " + process.resourcesPath + "\n";
    debugmessage += "   process.execPath: " + process.execPath + "\n";

    return {
      backend: {
        name: 'Backend',
        path: path.join(currentDir, '/'),
        port: 3000,
        healthEndpoint: '/auth/token-status',
        startCommand: path.join(currentDir, '/aims-backend'),
        startArgs: ['start'],
        color: '🔵',
        required: true
      },
      nodeodm: {
        name: 'NodeODM',
        path: path.join(parentDir, 'NodeODM'),
        port: 3001,
        healthEndpoint: '/info',
        startCommand: 'npm',
        startArgs: ['start'],
        color: '🟡',
        required: false
      },
      frontend: {
        name: 'Frontend', 
        path: path.join(currentDir, '/aims-frontend'),
        port: 3004,
        healthEndpoint: '/',
        startCommand: 'node',
        startArgs: ['server.js'],
        color: '🟢',
        required: true
      }
    };
  }

  async checkServiceHealth(serviceConfig) {
    try {
      const response = await axios.get(
        `http://localhost:${serviceConfig.port}${serviceConfig.healthEndpoint}`,
        { timeout: 3000 }
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async startService(serviceKey, serviceConfig) {
    this.logger.info(`Starting service: ${serviceKey}`,serviceConfig);
    this.logger.info('currentDir:', process.cwd());
    return new Promise((resolve, reject) => {
      this.logger.info(`${serviceConfig.color} Starting ${serviceConfig.name}...`);
      this.emit('service-status', serviceKey, 'starting', `Starting ${serviceConfig.name}...`);

      // Check if already running
      this.checkServiceHealth(serviceConfig).then(isRunning => {
        if (isRunning) {
          this.logger.info(`${serviceConfig.color} ${serviceConfig.name} already running`);
          this.emit('service-status', serviceKey, 'running', `${serviceConfig.name} already running`);
          resolve();
          return;
        }

        // Check if path exists
        if (!fs.existsSync(serviceConfig.path)) {
          const error = `Path not found: ${serviceConfig.path} `+debugmessage;
          console.error(`${serviceConfig.color} ${serviceConfig.name}: ${error}`);
          this.emit('service-status', serviceKey, 'error', error);
          if (!serviceConfig.required) {
            resolve(); // Don't fail for optional services
          } else {
            reject(new Error(error));
          }
          return;
        }

        // Start the service

        const process = spawn(serviceConfig.startCommand, serviceConfig.startArgs, {
          cwd: serviceConfig.path,
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        // Store process reference
        this.services.set(serviceKey, {
          ...serviceConfig,
          process: process,
          pid: process.pid,
          startTime: Date.now()
        });

        this.logger.info(`${serviceConfig.color} ${serviceConfig.name} started with PID ${process.pid} and process ${JSON.stringify(process)}`);
        // Handle process events
        process.on('error', (error) => {
          console.error(`${serviceConfig.color} ${serviceConfig.name} error:`, error);
          this.emit('service-status', serviceKey, 'error', error.message);
          if (serviceConfig.required) {
            reject(error);
          } else {
            resolve();
          }
        });

        process.on('exit', (code) => {
          this.logger.info(`${serviceConfig.color} ${serviceConfig.name} exited with code ${code}`);
          this.services.delete(serviceKey);
          if (!this.isShuttingDown) {
            this.emit('service-status', serviceKey, 'stopped', `Service stopped (code: ${code})`);
          }
        });

        // Capture output
        process.stdout.on('data', (data) => {
          const output = data.toString();
          this.logServiceOutput(serviceConfig.name, 'STDOUT', output);
        });

        process.stderr.on('data', (data) => {
          const output = data.toString();
          
          // Log each line individually for better readability
          this.logServiceOutput(serviceConfig.name, 'STDERR', output);

        });

        // Wait for service to be ready
        const maxAttempts = 60; // 2 minutes timeout
        let attempts = 0;
        
        const checkReady = setInterval(async () => {
          if (this.isShuttingDown) {
            clearInterval(checkReady);
            return;
          }

          attempts++;
          const isHealthy = await this.checkServiceHealth(serviceConfig);
          
          if (isHealthy) {
            clearInterval(checkReady);
            this.logger.info(`${serviceConfig.color} ${serviceConfig.name} is ready!`);
            this.emit('service-status', serviceKey, 'running', `${serviceConfig.name} is ready!`);
            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkReady);
            const error = `${serviceConfig.name} failed to start within timeout`;
            console.error(`${serviceConfig.color} ${error}`);
            this.emit('service-status', serviceKey, 'timeout', error);
            if (serviceConfig.required) {
              reject(new Error(error));
            } else {
              resolve();
            }
          } else {
            // Update progress
            this.emit('service-status', serviceKey, 'starting', `${serviceConfig.name} starting... (${attempts}/${maxAttempts})`);
          }
        }, 2000);
      });
    });
  }

  async startAllServices() {
    const servicePaths = this.getServicePaths();
    
    try {
      this.emit('startup-progress', 0, 'Initializing services...');
      
      // Start backend first
      this.emit('startup-progress', 10, 'Starting backend service...');
      await this.startService('backend', servicePaths.backend);
      
      this.emit('startup-progress', 40, 'Backend ready, starting NodeODM...');
      
      // Start NodeODM (optional)
      try {
        await this.startService('nodeodm', servicePaths.nodeodm);
        this.emit('startup-progress', 70, 'NodeODM ready, starting frontend...');
      } catch (error) {
        this.logger.info('🟡 NodeODM failed to start (optional service)');
        this.emit('startup-progress', 70, 'NodeODM skipped, starting frontend...');
      }
      
      // Start frontend last
      await this.startService('frontend', servicePaths.frontend);
      
      this.emit('startup-progress', 100, 'All services ready!');
      this.emit('all-services-ready');
      return true;
    } catch (error) {
      console.error('Failed to start services:', error);
      this.emit('startup-failed', error.message);
      return false;
    }
  }

  async stopAllServices() {
    this.isShuttingDown = true;
    this.logger.info('🛑 Stopping all services...');

    const promises = [];
    for (const [serviceKey, service] of this.services) {
      if (service.process && !service.process.killed) {
        promises.push(new Promise((resolve) => {
          this.logger.info(`${service.color} Stopping ${service.name}...`);
          kill(service.process.pid, 'SIGTERM', (error) => {
            if (error) {
              console.error(`Error stopping ${service.name}:`, error);
            }
            resolve();
          });
        }));
      }
    }

    await Promise.all(promises);
    this.services.clear();
    this.logger.info('✅ All services stopped');
  }
}

module.exports = ServiceManager;