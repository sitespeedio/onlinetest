import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

import NodeCache from 'node-cache';
import { getLogger } from '@sitespeed.io/log';

import { nconf } from '../config.js';

const logger = getLogger('sitespeedio.server.slack');

// Slack accepts posts to a response_url for 30 minutes. Keep the entry a
// bit longer so a late result still gets a try (and a log line on failure).
const pendingResponses = new NodeCache({ stdTTL: 60 * 60, checkperiod: 120 });

const BROWSERS = new Set(['chrome', 'firefox', 'edge']);
const MAX_ITERATIONS = 21;

export function getSlackConfig() {
  return {
    signingSecret: nconf.any('slack:signingsecret', 'slack:signingSecret'),
    location: nconf.get('slack:location'),
    serverUrl: nconf.any('slack:serverurl', 'slack:serverUrl'),
    allowedChannels:
      nconf.any('slack:allowedchannels', 'slack:allowedChannels') || [],
    label: nconf.get('slack:label') || 'slack',
    connectivity: nconf.get('slack:connectivity') || 'native'
  };
}

/**
 * Verify that a request comes from Slack, see
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function isValidSlackSignature(
  signingSecret,
  timestamp,
  signature,
  rawBody,
  now = Date.now()
) {
  if (!signingSecret || !timestamp || !signature || !rawBody) {
    return false;
  }
  // Reject old requests so a captured request cannot be replayed.
  if (Math.abs(now / 1000 - Number(timestamp)) > 60 * 5) {
    return false;
  }
  const expected =
    'v0=' +
    createHmac('sha256', signingSecret)
      .update(`v0:${timestamp}:${rawBody}`)
      .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Parse the text of the slash command:
 * <url> [chrome|firefox|edge] [mobile] [replay] [runs=N]
 */
export function parseCommand(text) {
  const result = {
    browser: 'chrome',
    testType: 'desktop',
    replay: false,
    iterations: 1
  };
  for (const token of String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)) {
    // Slack sends links as <https://example.com> or <https://example.com|label>
    const link = token.match(/^<([^|>]+)(?:\|[^>]*)?>$/);
    const value = link ? link[1] : token;
    const lower = value.toLowerCase();
    if (/^https?:\/\//i.test(value)) {
      if (result.url) {
        return { error: 'Add only one URL.' };
      }
      result.url = value;
    } else if (BROWSERS.has(lower)) {
      result.browser = lower;
    } else if (lower === 'mobile') {
      result.testType = 'emulatedMobile';
    } else if (lower === 'replay') {
      result.replay = true;
    } else if (/^runs=\d+$/.test(lower)) {
      const runs = Number(lower.split('=')[1]);
      if (runs < 1 || runs > MAX_ITERATIONS) {
        return { error: `Use runs=1 to runs=${MAX_ITERATIONS}.` };
      }
      result.iterations = runs;
    } else {
      return { error: `Unknown option "${token}".` };
    }
  }
  if (!result.url) {
    return { error: 'Add the URL to test.' };
  }
  return result;
}

export function usage(command = '/sitespeed') {
  return `Usage: ${command} <url> [chrome|firefox|edge] [mobile] [replay] [runs=N]`;
}

export function rememberResponseUrl(id, responseUrl) {
  // Only post to Slack, never to a URL that someone else supplied.
  if (
    typeof responseUrl === 'string' &&
    responseUrl.startsWith('https://hooks.slack.com/')
  ) {
    pendingResponses.set(id, responseUrl);
  }
}

/**
 * Post the outcome of a test that was added from Slack. Does nothing for
 * tests that were added in other ways.
 */
export async function notifySlack(id, status, resultUrl, url) {
  const responseUrl = pendingResponses.get(id);
  if (!responseUrl) {
    return;
  }
  pendingResponses.del(id);
  const text =
    status === 'completed'
      ? `Test of ${url} is done: ${resultUrl}`
      : `Test of ${url} failed (id ${id}).`;
  try {
    const response = await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response_type: 'in_channel', text })
    });
    if (!response.ok) {
      logger.error(
        'Could not post the result of %s to Slack: %s',
        id,
        response.status
      );
    }
  } catch (error) {
    logger.error('Could not post the result of %s to Slack', id, error);
  }
}
