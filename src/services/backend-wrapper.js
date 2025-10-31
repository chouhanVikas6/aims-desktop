#!/usr/bin/env node

/**
 * Backend Wrapper Script - DEBUG VERSION
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Module = require('module');

console.log('\n' + '='.repeat(60));
console.log('🔍 BACKEND WRAPPER DEBUG INFO');
console.log('='.repeat(60));

// Log all environment variables
console.log('\n📋 Environment Check:');
console.log('  ELECTRON_RUN_AS_NODE:', process.env.ELECTRON_RUN_AS_NODE);
console.log('  process.cwd():', process.cwd());
console.log('  __dirname:', __dirname);
console.log('  process.execPath:', process.execPath);

// Get arguments
const backendPath = process.argv[2];
const args = process.argv.slice(3);

console.log('\n📥 Arguments:');
console.log('  Backend path:', backendPath);
console.log('  Backend args:', args.join(' '));

if (!backendPath) {
  console.error('❌ Backend path not provided');
  process.exit(1);
}

if (!fs.existsSync(backendPath)) {
  console.error(`❌ Backend binary not found at: ${backendPath}`);
  process.exit(1);
}

// Calculate paths
const backendDir = path.dirname(backendPath);
const nodeModulesPath = path.join(backendDir, 'node_modules');
const sqlite3Path = path.join(nodeModulesPath, 'sqlite3');

console.log('\n📂 Path Resolution:');
console.log('  Backend dir:', backendDir);
console.log('  node_modules path:', nodeModulesPath);
console.log('  sqlite3 path:', sqlite3Path);

// Check if paths exist
console.log('\n✅ Path Existence Check:');
console.log('  Backend dir exists?', fs.existsSync(backendDir));
console.log('  node_modules exists?', fs.existsSync(nodeModulesPath));
console.log('  sqlite3 exists?', fs.existsSync(sqlite3Path));

// List what's in node_modules
if (fs.existsSync(nodeModulesPath)) {
  console.log('\n📦 Contents of node_modules:');
  const contents = fs.readdirSync(nodeModulesPath);
  contents.forEach(item => {
    console.log('    -', item);
  });
} else {
  console.log('⚠️  node_modules directory does not exist!');
}

// Check sqlite3 contents if it exists
if (fs.existsSync(sqlite3Path)) {
  console.log('\n📦 Contents of sqlite3:');
  const sqlite3Contents = fs.readdirSync(sqlite3Path);
  sqlite3Contents.forEach(item => {
    console.log('    -', item);
  });
  
  // Check for lib directory
  const libPath = path.join(sqlite3Path, 'lib');
  if (fs.existsSync(libPath)) {
    console.log('\n📦 Contents of sqlite3/lib:');
    const libContents = fs.readdirSync(libPath);
    libContents.forEach(item => {
      console.log('    -', item);
    });
  }
}

// Create environment variables
const env = {
  ...process.env,
  NODE_PATH: nodeModulesPath,
  NODE_OPTIONS: '--no-experimental-fetch --no-warnings'
};

console.log('\n🔧 Environment Variables Being Set:');
console.log('  NODE_PATH:', env.NODE_PATH);
console.log('  NODE_OPTIONS:', env.NODE_OPTIONS);

console.log('\n🚀 Starting backend process...');
console.log('='.repeat(60) + '\n');

// CRITICAL: Prepend to module search paths BEFORE spawning
// This ensures the child process inherits the modified resolution
const originalResolveLookupPaths = Module._resolveLookupPaths;
Module._resolveLookupPaths = function(request, parent) {
  const paths = originalResolveLookupPaths.call(this, request, parent);
  if (paths) {
    // Inject our node_modules at the BEGINNING
    paths.unshift(nodeModulesPath);
  } 
  return paths;
};

// Create environment with multiple resolution hints
const envWithResolutionHints = {
  ...env,
  NODE_PATH: [
    nodeModulesPath,
    path.join(backendDir, 'node_modules'),
    process.cwd()
  ].join(path.delimiter),
  NODE_OPTIONS: '--no-experimental-fetch --no-warnings',
  // Force sqlite3 to be found
  npm_config_node_gyp: nodeModulesPath,
  // Set working directory hint
  PKG_EXECPATH: 'PKG',
  PKG_CACHE_PATH: backendDir
};

console.log('🚀 Starting backend with enhanced module resolution...\n');

// Start the backend process
const backendProcess = spawn(backendPath, args, {
  stdio: 'inherit',
  cwd: backendDir,  // Set working directory to backend dir
  env: envWithResolutionHints
});

// Handle backend process events
backendProcess.on('error', (err) => {
  console.error(`❌ Failed to start backend: ${err.message}`);
  process.exit(1);
});

backendProcess.on('exit', (code) => {
  console.log(`\n🔵 Backend exited with code ${code}`);
  process.exit(code);
});

// Forward signals to the child process
['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
  process.on(signal, () => {
    backendProcess.kill(signal);
  });
});
