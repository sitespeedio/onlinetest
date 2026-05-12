import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import nconf from 'nconf';
import yaml from 'js-yaml';

import { getBaseFilePath } from './util/fileutil.js';

// Load .env first from cwd (so running `node app.js` from the server
// dir keeps working), then from the project root so the per-package
// scripts (`npm start --prefix server`) pick up the single root .env
// that the .env.example.local docs describe. dotenv calls are additive
// and never overwrite already-set vars, so this is order-safe. In
// Docker the root path doesn't resolve to a real file — env vars come
// from docker-compose's env_file directive — and the call no-ops.
dotenv.config({ quiet: true });
dotenv.config({
  quiet: true,
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env')
});

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
