#!/usr/bin/env node

/**
 * Frontend Wrapper Script
 * Runs the Next.js server with proper environment
 */

// Set up environment
const port = process.env.PORT || '3004';
console.log('Frontend wrapper starting on port:', port);

// Get the server file path from command line
const serverPath = process.argv[2];

if (!serverPath) {
  console.error('Server path not provided');
  process.exit(1);
}

console.log('Loading server from:', serverPath);

// Change to the server's directory
const path = require('path');
const fs = require('fs');

if (!fs.existsSync(serverPath)) {
  console.error(`Server file not found: ${serverPath}`);
  process.exit(1);
}

process.chdir(path.dirname(serverPath));

// Load and run the server
try {
  require(serverPath);
  console.log('✅ Frontend server started successfully');
} catch (error) {
  console.error('❌ Failed to start frontend server:', error);
  process.exit(1);
}
