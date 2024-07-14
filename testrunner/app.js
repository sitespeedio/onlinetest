#!/usr/bin/env node

import path from 'node:path';

import { createRequire } from 'node:module';
import fs from 'node:fs';
// eslint-disable-next-line unicorn/import-style
import { extname } from 'node:path';

import nconf from 'nconf';
import yaml from 'js-yaml';

const require = createRequire(import.meta.url);
const version = require('./package.json').version;

import { SitespeedioTestRunner } from './src/sitespeedio-testrunner.js';
import { validate } from './src/validateconfig.js';
import { getBaseFilePath } from './src/util.js';

const defaultConfig = getBaseFilePath('./config/default.yaml');

function getFilteredConfig() {
  const config = nconf.get();
  const filteredConfig = { ...config };

  // List of keys to exclude
  const keysToExclude = ['type', '_', '$0', 'config'];

  for (const key of keysToExclude) {
    delete filteredConfig[key];
  }

  return filteredConfig;
}

nconf.argv();

if (nconf.get('help')) {
  console.log('sitespeed.io  test runner ' + version);
  console.log('--help         Get help.');
  console.log(
    '--config       Path to a JSON/yaml configuration file that will replace default config.'
  );
  console.log('--version        The version number.');

  process.exit();
}

if (nconf.get('version')) {
  console.log(version);

  process.exit();
}

const configFile = nconf.get('config') || defaultConfig;
const fileExtension = extname(configFile).toLowerCase();
let configFromFile;

try {
  const fileContent = fs.readFileSync(
    path.resolve(process.cwd(), configFile),
    'utf8'
  );
  if (fileExtension === '.json') {
    configFromFile = JSON.parse(fileContent);
  } else if (fileExtension === '.yaml' || fileExtension === '.yml') {
    configFromFile = yaml.load(fileContent);
  } else {
    throw new Error(
      'Unsupported configuration file type. Only JSON and YAML are supported.'
    );
  }
  nconf.defaults(configFromFile);
} catch (error) {
  console.error('Error reading configuration file:', error);

  process.exit(1);
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

for (const eventType of [`exit`, `SIGINT`, `SIGTERM`]) {
  process.on(eventType, cleanUpAgent.bind(undefined, eventType));
}

testRunner.start();
