import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';

import nconf from 'nconf';
import yaml from 'js-yaml';

import { getBaseFilePath } from './util/fileutil.js';

const defaultConfig = getBaseFilePath('./config/server.yaml');

nconf.argv();

nconf.env({
  parseValues: true,
  separator: '_',
  lowerCase: true
});

const configFile = nconf.get('config')
  ? path.resolve(process.cwd(), nconf.get('config'))
  : defaultConfig;

const fileExtension = path.extname(configFile).toLowerCase();

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

export { default as nconf } from 'nconf';
