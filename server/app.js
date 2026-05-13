#!/usr/bin/env node
import { createRequire } from 'node:module';

import { nconf } from './src/config.js';
import { SitespeedioServer } from './src/server.js';

const require = createRequire(import.meta.url);
const version = require('./package.json').version;

if (nconf.get('help')) {
  console.log('sitespeed.io server version ' + version);
  console.log('--help         Get help.');
  console.log(
    '--config       Path to a JSON/yaml configuration file that will replace default config.'
  );
  console.log('--version      The version number.');
  process.exit();
}

if (nconf.get('version')) {
  console.log(version);
  process.exit();
}

const server = new SitespeedioServer();
server.start();

// First signal triggers graceful drain; a second signal during drain
// short-circuits to immediate exit so an impatient operator (or a stuck
// connection) can't keep the process alive forever.
let shuttingDown = false;
const gracefulShutdown = async signal => {
  if (shuttingDown) {
    console.error(`Received ${signal} again during shutdown — forcing exit`);
    process.exit(1);
  }
  shuttingDown = true;
  try {
    await server.stop();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
