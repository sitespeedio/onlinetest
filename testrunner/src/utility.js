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

export function removeFlags(arguments_) {
  if (!arguments_) {
    return [];
  }

  return arguments_.filter(
    flag => !['--verbose', '-v', '-vv', '-vvv'].includes(flag)
  );
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
