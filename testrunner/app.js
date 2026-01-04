#!/usr/bin/env node

import { createRequire } from 'node:module';

import { getFilteredConfig, nconf } from './src/config.js';
import { SitespeedioTestRunner } from './src/sitespeedio-testrunner.js';
import { validate } from './src/validateconfig.js';

const require = createRequire(import.meta.url);
const version = require('./package.json').version;

if (nconf.get('help')) {
  console.log('sitespeed.io  test runner ' + version);
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

try {
  validate(getFilteredConfig());
} catch {
  process.exit(1);
}

const testRunner = new SitespeedioTestRunner();

async function cleanUpAgent(type) {
  testRunner.stop(type);
}

for (const eventType of ['exit', 'SIGINT', 'SIGTERM']) {
  process.on(eventType, cleanUpAgent.bind(undefined, eventType));
}

testRunner.start();
