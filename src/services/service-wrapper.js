#!/usr/bin/env node

// This script wraps the execution of the backend and frontend services
// to inject polyfills and handle environment setup

// Load polyfills first
require('../utils/polyfills');

// Get the command to execute
const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);

console.log(`[Service Wrapper] Starting service: ${command} with args: ${commandArgs.join(' ')}`);

// Dynamically require the target script
try {
  // If the command is a file path, require it
  if (command.endsWith('.js')) {
    require(command);
  } else {
    // Otherwise, spawn a child process
    const { spawnSync } = require('child_process');
    const result = spawnSync(command, commandArgs, {
      stdio: 'inherit',
      shell: true
    });
    
    if (result.error) {
      console.error(`[Service Wrapper] Error executing command: ${result.error.message}`);
      process.exit(1);
    }
    
    process.exit(result.status);
  }
} catch (error) {
  console.error(`[Service Wrapper] Failed to execute: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
