#!/usr/bin/env node

/**
 * Frontend Wrapper Script
 * 
 * This script creates a custom environment for the Next.js frontend
 * to run with all necessary Web APIs available.
 */

// Add Web API polyfills
if (typeof global.Request === 'undefined') {
  class Request {
    constructor(input, init) {
      this.url = input;
      this.method = (init && init.method) || 'GET';
      this.headers = (init && init.headers) || {};
      this.body = (init && init.body) || null;
    }
  }
  
  class Response {
    constructor(body, init) {
      this.body = body;
      this.status = (init && init.status) || 200;
      this.statusText = (init && init.statusText) || '';
      this.headers = (init && init.headers) || {};
    }
    
    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
    
    text() {
      return Promise.resolve(this.body);
    }
  }
  
  class Headers {
    constructor(init) {
      this._headers = {};
      if (init) {
        Object.keys(init).forEach(key => {
          this._headers[key.toLowerCase()] = init[key];
        });
      }
    }
    
    get(name) {
      return this._headers[name.toLowerCase()];
    }
    
    set(name, value) {
      this._headers[name.toLowerCase()] = value;
    }
    
    has(name) {
      return !!this._headers[name.toLowerCase()];
    }
  }
  
  global.Request = Request;
  global.Response = Response;
  global.Headers = Headers;
  global.fetch = function(url, options) {
    return Promise.resolve(new Response('{}'));
  };
  
  console.log('Added Web API polyfills');
}

// Create a child process to run the frontend
const { spawn } = require('child_process');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let env = {};
let command = '';
let commandArgs = [];

// Extract environment variables (in the format KEY=VALUE)
for (let i = 0; i < args.length; i++) {
  if (args[i].includes('=')) {
    const [key, value] = args[i].split('=');
    env[key] = value;
  } else {
    command = args[i];
    commandArgs = args.slice(i + 1);
    break;
  }
}

if (!command) {
  console.error('Command not provided');
  process.exit(1);
}

console.log(`Starting frontend: ${command} ${commandArgs.join(' ')}`);
console.log('Environment:', env);

// Create environment variables
const processEnv = {
  ...process.env,
  ...env,
  NODE_OPTIONS: '--no-experimental-fetch --no-warnings',
  NODE_PATH: path.join(process.cwd(), 'node_modules')
};

// Start the frontend process
const frontendProcess = spawn(command, commandArgs, {
  stdio: 'inherit',
  env: processEnv
});

// Handle frontend process events
frontendProcess.on('error', (err) => {
  console.error(`Failed to start frontend: ${err.message}`);
  process.exit(1);
});

frontendProcess.on('exit', (code) => {
  console.log(`Frontend exited with code ${code}`);
  process.exit(code);
});

// Forward signals to the child process
['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
  process.on(signal, () => {
    frontendProcess.kill(signal);
  });
});
