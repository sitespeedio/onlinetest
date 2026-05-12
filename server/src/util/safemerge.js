// Prototype-pollution-safe deep merge built on Object.assign.
// `userConfig` on /api/add comes straight from the request body and is merged
// into the sitespeed.io configuration. lodash.merge walks `__proto__` /
// `constructor` / `prototype` and lets a crafted payload write onto
// Object.prototype, so we skip those keys here and assign one property at a
// time with Object.assign instead.

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
