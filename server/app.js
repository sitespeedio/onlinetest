#!/usr/bin/env node
import path from 'node:path';

// eslint-disable-next-line unicorn/import-style
import { extname } from 'node:path';
import { createRequire } from 'node:module';
import fs from 'node:fs';

import nconf from 'nconf';
import yaml from 'js-yaml';

import { SitespeedioServer } from './src/server.js';
import { getBaseFilePath } from './src/util/fileutil.js';

const require = createRequire(import.meta.url);
const version = require('./package.json').version;
const defaultConfig = getBaseFilePath('./config/default.yaml');

nconf.argv();

if (nconf.get('help')) {
  console.log('sitespeed.io  server version ' + version);
  console.log('--help         Get help.');
  console.log(
    '--config       Path to a JSON/yaml configuration file that will replace default config.'
  );
  console.log('--version        The version number.');
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit();
}

if (nconf.get('version')) {
  console.log(version);
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit();
}

const configFile = nconf.get('config')
  ? path.resolve(process.cwd(), nconf.get('config'))
  : defaultConfig;
const fileExtension = extname(configFile).toLowerCase();
let configFromFile;

try {
  const fileContent = fs.readFileSync(configFile, 'utf8');
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
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
}

const server = new SitespeedioServer();
server.start();

const gracefulShutdown = async () => {
  await server.stop();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
