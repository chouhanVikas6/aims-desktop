const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');
const kill = require('tree-kill');
const { EventEmitter } = require('events');
const { app } = require('electron');
const fs = require('fs');
const { getLogger } = require('../utils/logger');
const util = require('util');
const crypto = require('crypto');
const execAsync = util.promisify(require('child_process').exec);
require('../utils/polyfills'); // Load polyfills
class ServiceManager extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.isShuttingDown = false;
    this.logger = getLogger();
    this.progressCount = 1;

    this.logger.info('ServiceManager initialized');
  }

  // Add this new function to log directory structure
  logDirectoryStructure(dirPath, prefix = '', maxDepth = 5, currentDepth = 0) {
    return;
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
    this.logger.info('='.repeat(60));
    this.logger.info('📋 COMPLETE DIRECTORY STRUCTURE ANALYSIS');
    this.logger.info('='.repeat(60));

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

    this.logger.info('\n' + '='.repeat(60));
    this.logger.info('📋 END DIRECTORY STRUCTURE ANALYSIS');
    this.logger.info('='.repeat(60));
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
    const currentDir = isPackaged ? process.resourcesPath : process.cwd() + '/resources';
    const parentDir = isPackaged ? process.resourcesPath : path.dirname(currentDir) + '/resources';
    const backendBinaryName = process.platform === 'win32' ? 'aims-backend.exe' : 'aims-backend';

    this.logger.info('🔍 ServiceManager Debug Info:');
    this.logger.info('   isPackaged:', isPackaged);
    this.logger.info('   process.cwd():', process.cwd());
    this.logger.info('   __dirname:', __dirname);
    this.logger.info('   app.getAppPath():', app.getAppPath());
    this.logger.info('   process.resourcesPath:', process.resourcesPath);
    this.logger.info('   process.execPath:', process.execPath);

    return {
      backend: {
        name: 'Backend',
        path: path.join(currentDir, '/'),
        port: 3000,
        healthEndpoint: '/auth/token-status',
        startCommand: process.execPath,
        startArgs: [
          path.join(__dirname, '../services/frontend-wrapper.js'),
          path.join(currentDir, '/aims-backend/dist/main.js')
        ],
        env: {
          ELECTRON_RUN_AS_NODE: '1',// Run Electron as Node.js
          "AIMS_ADMIN": "http://192.168.0.176:3002",
          "CLOUD_ADMIN_SERVER_URL": "http://192.168.0.176:3002",
          "CLOUD_ADMIN_ENCRYPTION_KEY": process.env.CLOUD_ADMIN_ENCRYPTION_KEY,
          "AIMSAT_URL": "http://localhost:3001",
          "FRONTEND_URL": "http://localhost:3004",

          "GOOGLE_CLIENT_ID": process.env.GOOGLE_CLIENT_ID,
          "GOOGLE_CLIENT_SECRET": process.env.GOOGLE_CLIENT_SECRET,
          "GOOGLE_REDIRECT_URI": "http://127.0.0.1:3000/auth/google-drive/callback",
          "GOOGLE_DRIVE_MOCK": "false",

          "NODE_ENV": "production",
          "PORT": "3000"
        },
        color: '🔵',
        required: true
      },
      backend2: {
        name: 'Backend',
        path: path.join(currentDir, '/'),
        port: 3000,
        healthEndpoint: '/auth/token-status',
        // USE WRAPPER with ELECTRON_RUN_AS_NODE
        startCommand: process.execPath,
        startArgs: [
          path.join(__dirname, '../services/backend-wrapper.js'),
          path.join(currentDir, backendBinaryName),
          'start'
        ],
        env: {
          ELECTRON_RUN_AS_NODE: '1',// Run Electron as Node.js
          "AIMS_ADMIN": "http://192.168.0.176:3002",
          "CLOUD_ADMIN_SERVER_URL": "http://192.168.0.176:3002",
          "CLOUD_ADMIN_ENCRYPTION_KEY": process.env.CLOUD_ADMIN_ENCRYPTION_KEY,
          "AIMSAT_URL": "http://localhost:3001",
          "FRONTEND_URL": "http://localhost:3004",

          "GOOGLE_CLIENT_ID": process.env.GOOGLE_CLIENT_ID,
          "GOOGLE_CLIENT_SECRET": process.env.GOOGLE_CLIENT_SECRET,
          "GOOGLE_REDIRECT_URI": "http://localhost:3000/auth/google-drive/callback",
          "GOOGLE_DRIVE_MOCK": "false",

          "NODE_ENV": "development",
          "PORT": "3000"
        },
        color: '🔵',
        required: true
      },

      frontend: {
        name: 'Frontend',
        path: path.join(currentDir, '/aims-frontend'),
        port: 3004,
        healthEndpoint: '/',
        startCommand: process.execPath,  // Electron binary (has Node.js built-in)
        startArgs: [
          path.join(__dirname, '../services/frontend-wrapper.js'),
          path.join(currentDir, '/aims-frontend/server.js')
        ],
        env: {
          PORT: '3004',
          ELECTRON_RUN_AS_NODE: '1'  // ADD THIS - Critical!
        },
        color: '🟢',
        required: true
      }
    };
  }

  async checkServiceHealth(serviceConfig) {
    try {
      const response = await axios.get(
        `http://localhost:${serviceConfig.port}${serviceConfig.healthEndpoint}`,
        { timeout: 1000 }  // Reduced from 3000ms for faster checks
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async runDockerCommand(args) {
    return new Promise((resolve, reject) => {
      const docker = spawn('docker', args);

      let stdout = '';
      let stderr = '';

      docker.stdout.on('data', (data) => { stdout += data.toString(); });
      docker.stderr.on('data', (data) => { stderr += data.toString(); });

      docker.on('close', (code) => {
        if (code === 0) resolve(stdout.trim());
        else reject(new Error(stderr || `Docker exited with code ${code}`));
      });
    });
  }

  async increaseProgressCount() {
    this.progressCount++;
    if (this.progressCount < 30) {
      this.progressCount = 30;
    } else if (this.progressCount < 70) {
      this.progressCount = 70;
    } else {
      this.progressCount = 90;
    }
    this.emit('startup-progress', this.progressCount, 'Starting services...');
  }

  // Add AimsAi Docker functions
  async startAimsAiDocker() {
    const dockerImage = 'opendronemap/nodeodm:3.5.6';
    const containerName = 'AimsAi';
    const hostPort = 3001;
    const containerPort = 3000;

    try {
      this.logger.info('🐳 Starting AimsAi with Docker...');

      // Check if Docker is available
      try {
        await execAsync('docker --version');
        this.logger.info('✅ Docker is available');
      } catch (error) {
        throw new Error('Docker is not installed or not accessible');
      }
      // Stop and remove existing container if it exists
      try {
        await execAsync(`docker stop ${containerName}`);
        await execAsync(`docker rm ${containerName}`);
        this.logger.info('🗑️ Removed existing AimsAi container');
      } catch (error) {
        this.logger.info('ℹ️ No existing container to remove');
      }

      // Pull latest NodeODM image
      this.logger.info('📥 Pulling AimsAi Docker image...');
      this.emit('service-status', 'aims-ai', 'starting', 'Pulling Docker image...');

      try {
        await execAsync(`docker pull ${dockerImage}`);
        this.logger.info('✅ AimsAi image pulled successfully');
      } catch (error) {
        this.logger.warn('⚠️ Failed to pull image, using existing local image');
      }

      // Create data directories for persistence
      const userDataPath = app.getPath('userData');
      const AimsAiDataDir = path.join(userDataPath, 'aims-ai-data');

      if (!fs.existsSync(AimsAiDataDir)) {
        fs.mkdirSync(AimsAiDataDir, { recursive: true });
        this.logger.info(`📁 Created aims-ai data directory: ${AimsAiDataDir}`);
      }
      // Start AimsAi container
      const dockerArgs = [
        'run', '-d',
        '--name', containerName,
        '-p', `${hostPort}:${containerPort}`,
        dockerImage,
        '--max-concurrency', '12',
        '--memory=15g'
      ];

      this.logger.info(`🚀 Starting AimsAi container: docker ${dockerArgs.join(' ')}`);
      this.emit('service-status', 'AimsAi', 'starting', 'Starting Docker container...');

      const { stdout: containerId } = await this.runDockerCommand(dockerArgs);
      // execAsync(`docker ${dockerArgs.join(' ')}`);

      // this.logger.info(`✅ AimsAi container started with ID: ${containerId.trim()}`);

      // Store container info
      // this.dockerContainers.set('AimsAi', {
      //   containerId: containerId.trim(),
      //   containerName,
      //   port: hostPort,
      //   startTime: Date.now()
      // });
      // Wait for AimsAi to be ready
      // await this.waitForNodeODMReady(hostPort);

      this.emit('service-status', 'aims-ai', 'running', 'AimsAi Docker container is ready!');
      this.logger.info('🎉 AimsAi Docker container is ready!');
      this.increaseProgressCount();
      return true;

    } catch (error) {
      this.logger.error('❌ Failed to start AimsAi Docker container:', error.message);
      this.emit('service-status', 'aims-ai', 'error', `Docker start failed: ${error.message}`);
      throw error;
    }
  }
  async startService(serviceKey, serviceConfig) {
    this.logger.info(`Starting service: ${serviceKey}`, serviceConfig);
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
          const error = `Path not found: ${serviceConfig.path} `;
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
        // Add environment variables to fix Node.js API issues
        const env = {
          ...process.env,
          // NODE_OPTIONS: '--no-experimental-fetch --no-warnings',
          NODE_PATH: path.join(serviceConfig.path, 'node_modules'),
          ...(serviceConfig.env || {})  // Merge service-specific env vars
        };

        const processAimsAi = spawn(serviceConfig.startCommand, serviceConfig.startArgs, {
          cwd: serviceConfig.path,
          // shell: true,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: env
        });

        // Store process reference
        this.services.set(serviceKey, {
          ...serviceConfig,
          process: processAimsAi,
          pid: processAimsAi.pid,
          startTime: Date.now()
        });

        this.logger.info(`${serviceConfig.color} ${serviceConfig.name} started with PID ${processAimsAi.pid}`);
        // Handle process events
        processAimsAi.on('error', (error) => {
          console.error(`${serviceConfig.color} ${serviceConfig.name} error:`, error);
          this.emit('service-status', serviceKey, 'error', error.message);
          if (serviceConfig.required) {
            reject(error);
          } else {
            resolve();
          }
        });

        processAimsAi.on('exit', (code) => {
          this.logger.info(`${serviceConfig.color} ${serviceConfig.name} exited with code ${code}`);
          this.services.delete(serviceKey);
          if (!this.isShuttingDown) {
            this.emit('service-status', serviceKey, 'stopped', `Service stopped (code: ${code})`);
          }
        });
        // Capture output
        processAimsAi.stdout.on('data', (data) => {
          const output = data.toString();
          this.logServiceOutput(serviceConfig.name, 'STDOUT', output);
        });

        processAimsAi.stderr.on('data', (data) => {
          const output = data.toString();

          // Log each line individually for better readability
          this.logServiceOutput(serviceConfig.name, 'STDERR', output);

        });

        // Wait for service to be ready
        const maxAttempts = 240; // 120 seconds timeout (240 * 500ms)
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
            this.increaseProgressCount();
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
            // Update progress every 4 checks (2 seconds) to avoid log spam
            if (attempts % 4 === 0) {
              this.emit('service-status', serviceKey, 'starting', `${serviceConfig.name} starting... (${Math.floor(attempts / 2)}s elapsed)`);
            }
          }
        }, 500);  // Check every 500ms for faster detection
      });
    });
  }

  async startAllServices() {
    const servicePaths = this.getServicePaths();
    try {
      this.emit('startup-progress', 0, 'Initializing services...');


      // Start AimsAi (optional) - skip if Docker not available
      try {
        this.startAimsAiDocker();
        this.emit('startup-progress', 10, 'AimsAi ready, starting frontend...');
      } catch (error) {
        this.logger.info('🟡 AimsAi failed to start (optional service):', error.message);
        this.emit('startup-progress', 10, 'AimsAi skipped, starting frontend...');
      }

      // Start backend first - MUST await to ensure backend is ready before frontend
      this.emit('startup-progress', 20, 'Starting backend service...');
      await this.startService('backend', servicePaths.backend);
      this.emit('startup-progress', 40, 'Backend ready, starting frontend...');

      // Start frontend only after backend is confirmed ready
      await this.startService('frontend', servicePaths.frontend);
      this.emit('startup-progress', 70, 'Frontend ready!');



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

          // Set a timeout for force kill
          const forceKillTimer = setTimeout(() => {
            if (!service.process.killed) {
              this.logger.warn(`${service.color} Force killing ${service.name} (didn't respond to SIGTERM)`);
              kill(service.process.pid, 'SIGKILL', () => resolve());
            }
          }, 3000); // 3 second timeout

          // Try graceful shutdown first
          kill(service.process.pid, 'SIGTERM', (error) => {
            clearTimeout(forceKillTimer);
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