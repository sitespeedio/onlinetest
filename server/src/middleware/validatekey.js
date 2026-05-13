import { timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

import { nconf } from '../config.js';
import { getLogger } from '@sitespeed.io/log';
const logger = getLogger('sitespeedio.server');
import { getText } from '../util/text.js';

// Compare two strings without leaking the prefix length through timing.
// timingSafeEqual requires equal-length buffers, so pad both to the same
// length first and then xor in a length-equality flag.
function safeCompare(a, b) {
  const aBuf = Buffer.from(String(a ?? ''));
  const bBuf = Buffer.from(String(b ?? ''));
  const length = Math.max(aBuf.length, bBuf.length, 1);
  const aPad = Buffer.alloc(length);
  const bPad = Buffer.alloc(length);
  aBuf.copy(aPad);
  bBuf.copy(bPad);
  return timingSafeEqual(aPad, bPad) && aBuf.length === bBuf.length;
}

// Resolve the key from any of the places a client might supply it: the JSON
// body (used by the sitespeed.io CLI on /api/add), an X-API-Key header, or
// an `api.key` query parameter. The query/header forms exist so GETs that
// have no body (status, har, result) can be protected via api.protectReads.
function getKeyFromRequest(request) {
  return (
    request.body?.api?.key ??
    request.get?.('x-api-key') ??
    request.query?.['api.key'] ??
    request.query?.apiKey
  );
}

export const validateKey = (request, response, next) => {
  // If a key is setup, verify it
  const key = nconf.get('api:key');
  if (key !== null && key !== undefined && key !== '') {
    const keyFromRequest = getKeyFromRequest(request);
    if (!safeCompare(keyFromRequest, key)) {
      // Don't log the supplied key — typos and stale secrets used to land
      // in long-lived log aggregation. Don't echo it back in the response
      // either; the client already knows what they sent.
      logger.info('Invalid API key supplied');
      return response.status(403).json({
        message: getText('error.invalidkey')
      });
    }
  }
  next();
};

// Same key check, but only enforced when `api.protectReads` (or
// `api.protectreads` via env) is set. Lets operators opt into requiring the
// API key on read endpoints (status / har / result / testRunners) without
// breaking deployments that have always served results publicly.
export const validateKeyForReads = (request, response, next) => {
  if (!nconf.any('api:protectreads', 'api:protectReads')) {
    return next();
  }
  return validateKey(request, response, next);
};
