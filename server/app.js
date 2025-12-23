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

const gracefulShutdown = async () => {
  await server.stop();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
