#!/usr/bin/env node

/**
 * Backend Wrapper Script
 * 
 * This script creates a custom environment for the AIMS backend
 * to run with all necessary Node.js APIs available.
 */

// Ensure crypto is globally available
const crypto = require('crypto');
global.crypto = {
  getRandomValues: function(buffer) {
    return crypto.randomFillSync(buffer);
  },
  randomUUID: function() {
    return crypto.randomUUID();
  },
  subtle: {}
};
console.log('Added crypto polyfill to global scope');

// Create a child process to run the backend
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the backend binary path from command line arguments
const backendPath = process.argv[2];
const args = process.argv.slice(3);

if (!backendPath) {
  console.error('Backend path not provided');
  process.exit(1);
}

if (!fs.existsSync(backendPath)) {
  console.error(`Backend binary not found at: ${backendPath}`);
  process.exit(1);
}

console.log(`Starting backend: ${backendPath} with args: ${args.join(' ')}`);

// Create environment variables
const env = {
  ...process.env,
  NODE_OPTIONS: '--no-experimental-fetch --no-warnings',
  // Add crypto module to Node.js
  NODE_PATH: path.join(process.cwd(), 'node_modules')
};

// Start the backend process
const backendProcess = spawn(backendPath, args, {
  stdio: 'inherit',
  env: env
});

// Handle backend process events
backendProcess.on('error', (err) => {
  console.error(`Failed to start backend: ${err.message}`);
  process.exit(1);
});

backendProcess.on('exit', (code) => {
  console.log(`Backend exited with code ${code}`);
  process.exit(code);
});

// Forward signals to the child process
['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
  process.on(signal, () => {
    backendProcess.kill(signal);
  });
});
