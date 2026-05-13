// eslint-disable-next-line unicorn/import-style
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function getBaseFilePath(theFile) {
  const currentFileUrl = import.meta.url;
  const currentFilePath = fileURLToPath(currentFileUrl);
  const currentDirectory = dirname(currentFilePath);
  return path.resolve(currentDirectory, '../', theFile);
}

// Flags rejected from the user-supplied "extras" textarea. Anything matching
// either exactly or as a dotted-namespace prefix is dropped before the args
// reach sitespeed.io on the testrunner host. SYNC: server/src/static/index.js
// applies the same list to /sitespeed-help.json so the CLI picker doesn't
// suggest these.
export const BLOCKED_FLAG_PATTERNS = [
  // Arbitrary code / filesystem on the testrunner host
  '--browsertime.preScript',
  '--preScript',
  '--browsertime.postScript',
  '--postScript',
  '--browsertime.userTimingAddNav',
  '--userTimingAddNav',
  '--browsertime.firefox.binaryPath',
  '--firefox.binaryPath',
  '--browsertime.chrome.binaryPath',
  '--chrome.binaryPath',
  '--browsertime.edge.binaryPath',
  '--edge.binaryPath',
  '--browsertime.safari.binaryPath',
  '--safari.binaryPath',
  '--browsertime.chrome.args',
  '--chrome.args',
  '--browsertime.firefox.args',
  '--firefox.args',
  '--browsertime.edge.args',
  '--edge.args',
  '--browsertime.firefox.preference',
  '--firefox.preference',
  '--browsertime.firefox.acceptInsecureCerts',
  '--firefox.acceptInsecureCerts',
  '--config',
  // Plugin namespace (add / remove / load / disable / list)
  '--plugins',
  // Data sinks / output redirection
  '--graphite',
  '--influxdb',
  '--datadog',
  '--s3',
  '--gcs',
  '--grafana',
  '--scp',
  '--slack',
  '--matrix',
  '--api',
  '--resultBaseURL',
  '--outputFolder',
  // Verbose / log noise
  '--verbose',
  '-v',
  '-vv',
  '-vvv'
];

export function isBlockedFlag(token) {
  if (typeof token !== 'string') return false;
  const eq = token.indexOf('=');
  const name = eq === -1 ? token : token.slice(0, eq);
  for (const p of BLOCKED_FLAG_PATTERNS) {
    if (name === p) return true;
    if (name.startsWith(p + '.')) return true;
  }
  return false;
}

export function removeFlags(arguments_) {
  if (!arguments_) {
    return [];
  }
  const filtered = [];
  for (let index = 0; index < arguments_.length; index++) {
    const token = arguments_[index];
    if (isBlockedFlag(token)) {
      // For --flag <value>, also drop the value token. --flag=value carries
      // its own value, nothing else to skip.
      const next = arguments_[index + 1];
      if (
        !token.includes('=') &&
        typeof next === 'string' &&
        !next.startsWith('-')
      ) {
        index++;
      }
      continue;
    }
    filtered.push(token);
  }
  return filtered;
}

// Prototype-pollution-safe deep merge built on Object.assign. The job config
// arrives over the Bull queue and is merged into the sitespeed.io config, so
// we skip __proto__ / constructor / prototype keys that lodash.merge would
// otherwise walk straight onto Object.prototype.
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function safeMerge(target, ...sources) {
  for (const source of sources) {
    if (source === null || source === undefined) continue;
    if (typeof source !== 'object') continue;
    for (const key of Object.keys(source)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      const sourceValue = source[key];
      const targetValue = target[key];
      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        safeMerge(targetValue, sourceValue);
      } else {
        Object.assign(target, { [key]: sourceValue });
      }
    }
  }
  return target;
}
