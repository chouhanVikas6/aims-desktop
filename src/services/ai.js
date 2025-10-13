const Docker = require('dockerode');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs-extra');
const path = require('path');

class AiManager {
  constructor(config) {
    this.config = config;
    this.docker = new Docker();
    this.container = null;
    this.baseUrl = `http://127.0.0.1:${config.port}`;
  }

  async start() {
    if (this.container) {
      const isRunning = await this.isRunning();
      if (isRunning) {
        console.log('Ai is already running');
        return;
      }
    }

    try {
      // Pull image if not present
      console.log('Pulling Ai Docker image...');
      await this.pullImage();

      // Create and start container
      console.log('Starting Ai container...');
      this.container = await this.docker.createContainer({
        Image: this.config.dockerImage,
        ExposedPorts: { '3000/tcp': {} },
        HostConfig: {
          PortBindings: { '3000/tcp': [{ HostPort: String(this.config.port) }] },
          AutoRemove: false,
        },
        Env: [
          'NODE_ENV=production'
        ]
      });

      await this.container.start();
      
      // Wait for service to be ready
      await this.waitForReady();
      console.log(`Ai started successfully on port ${this.config.port}`);
    } catch (error) {
      console.error('Failed to start Ai:', error);
      throw error;
    }
  }

  async stop() {
    if (this.container) {
      try {
        await this.container.stop({ t: 10 });
        await this.container.remove();
        this.container = null;
        console.log('Ai stopped successfully');
      } catch (error) {
        console.error('Error stopping Ai:', error);
      }
    }
  }

  async restart() {
    await this.stop();
    await this.start();
  }

  async isRunning() {
    if (!this.container) return false;
    
    try {
      const info = await this.container.inspect();
      return info.State.Running === true;
    } catch (error) {
      return false;
    }
  }

  async pullImage() {
    return new Promise((resolve, reject) => {
      this.docker.pull(this.config.dockerImage, (err, stream) => {
        if (err) return reject(err);
        
        this.docker.modem.followProgress(stream, (err, output) => {
          if (err) return reject(err);
          resolve(output);
        });
      });
    });
  }

  async waitForReady(timeout = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`${this.baseUrl}/info`, { 
          timeout: 5000 
        });
        
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Service not ready yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Ai service did not become ready within timeout period');
  }

  // API methods for Ai operations
  async createTask(imagesPath, options = {}) {
    const url = `${this.baseUrl}/task/new/init`;
    const form = new FormData();
    
    // Add images
    if (fs.statSync(imagesPath).isDirectory()) {
      const imageFiles = fs.readdirSync(imagesPath)
        .filter(file => /\.(jpg|jpeg|png|tiff|tif)$/i.test(file));
      
      for (const imageFile of imageFiles) {
        const imagePath = path.join(imagesPath, imageFile);
        form.append('images', fs.createReadStream(imagePath), imageFile);
      }
    } else {
      // Single file or zip
      form.append('images', fs.createReadStream(imagesPath));
    }
    
    // Add options
    Object.keys(options).forEach(key => {
      form.append(key, String(options[key]));
    });

    const response = await fetch(url, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Ai task creation failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getTaskStatus(taskId) {
    const response = await fetch(`${this.baseUrl}/task/${taskId}/info`);
    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.statusText}`);
    }
    return response.json();
  }

  async downloadResult(taskId, outputPath, assetType = 'all') {
    const response = await fetch(`${this.baseUrl}/task/${taskId}/download/${assetType}`);
    if (!response.ok) {
      throw new Error(`Failed to download result: ${response.statusText}`);
    }

    const dest = fs.createWriteStream(outputPath);
    return new Promise((resolve, reject) => {
      response.body.pipe(dest);
      response.body.on('error', reject);
      dest.on('finish', resolve);
      dest.on('error', reject);
    });
  }
}

module.exports = AiManager;
