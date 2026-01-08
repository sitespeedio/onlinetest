import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

import nconf from 'nconf';
import yaml from 'js-yaml';

import { getBaseFilePath } from './utility.js';

const DEFAULT_CONFIG = getBaseFilePath('./config/testrunner.yaml');

const KEYS_TO_EXCLUDE = ['type', '_', '$0', 'config'];

const ENV_LIST = [
  'redis_host',
  'redis_port',
  'redis_password',
  'minio_password',
  'docker_extraparameters',
  'docker_container',
  'location_name',
  'sitespeed.io_s3_endpoint',
  'sitespeed.io_s3_bucketname',
  'sitespeed.io_s3_key',
  'sitespeed.io_s3_secret',
  'sitespeed.io_s3_region',
  'sitespeed.io_s3_options_forcePathStyle',
  'sitespeed.io_s3_removeLocalResult',
  'sitespeed.io_resultBaseURL'
];

function readConfigFile(configFilePath) {
  const fileExtension = path.extname(configFilePath).toLowerCase();
  const fileContent = fs.readFileSync(configFilePath, 'utf8');

  if (fileExtension === '.json') {
    return JSON.parse(fileContent);
  }

  if (fileExtension === '.yaml' || fileExtension === '.yml') {
    return yaml.load(fileContent);
  }

  throw new Error(
    'Unsupported configuration file type. Only JSON and YAML are supported.'
  );
}

function initConfig() {
  nconf.argv();

  nconf.env({
    parseValues: true,
    separator: '_',
    whitelist: ENV_LIST,
    lowerCase: true,
    transform: function (object) {
      // S3 have some special naming
      switch (object.key) {
        case 'sitespeed.io_s3_options_forcepathstyle': {
          object.key = 'sitespeed.io_s3_options_forcePathStyle';
          break;
        }
        case 'sitespeed.io_resultbaseurl': {
          object.key = 'sitespeed.io_resultBaseURL';
          break;
        }
        case 'sitespeed.io_s3_removelocalresult': {
          object.key = 'sitespeed.io_s3_removeLocalResult';
          break;
        }
        // Make sure the Minio password is passed on to sitespeed.io
        case 'minio_password': {
          object.key = 'sitespeed.io_s3_secret';
          break;
        }
      }
      return object;
    }
  });

  const configFile = nconf.get('config') || DEFAULT_CONFIG;
  const resolvedPath = path.resolve(process.cwd(), configFile);

  try {
    const configFromFile = readConfigFile(resolvedPath);
    nconf.defaults(configFromFile);
  } catch (error) {
    console.error('Error reading configuration file:', error);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  }
}

function getFilteredConfig() {
  const config = nconf.get();
  const filteredConfig = { ...config };

  for (const key of KEYS_TO_EXCLUDE) {
    delete filteredConfig[key];
  }

  return filteredConfig;
}

// Initialize immediately on import (same behavior as your current CLI file)
initConfig();

export { getFilteredConfig };
export { default as nconf } from 'nconf';
