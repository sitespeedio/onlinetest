import { getLogger } from '@sitespeed.io/log';

import { testRunnersConnected } from './metrics.js';

const logger = getLogger('sitespeedio.server');

const testRunners = {};

// A testrunner that hasn't published a heartbeat in this many ms is
// considered dead. The testrunner side currently heartbeats every 30s, so
// 120s of silence is "missed four in a row" — enough to be confident it's
// gone and not just having a bad Redis blip.
const STALE_AFTER_MS = 120_000;

function queueNamesForConfig(config) {
  return new Set(
    (config.setup || [])
      .map(s => s.queue)
      .filter(name => typeof name === 'string' && name.length > 0)
  );
}

function mergeByHostname(target, source) {
  const now = Date.now();
  if (target[source.hostname]) {
    target[source.hostname].setup = [
      ...target[source.hostname].setup,
      ...source.setup
    ];
    target[source.hostname].lastSeenAt = now;
  } else {
    target[source.hostname] = { ...source, firstSeenAt: now, lastSeenAt: now };
  }
}

function removeByHostname(hostnameToRemove) {
  delete testRunners[hostnameToRemove];
}

function updateTestRunnerMetrics() {
  testRunnersConnected.reset();
  for (const runner of Object.values(testRunners)) {
    testRunnersConnected.set({ location: runner.name }, 1);
  }
}

// Warn when a new registration claims a queue name that a different
// hostname is already serving. Bull will hand the work to whichever worker
// it sees first and the operator gets no signal that two boxes are racing
// for the same jobs.
function warnOnQueueCollision(incoming) {
  const incomingQueues = queueNamesForConfig(incoming);
  if (incomingQueues.size === 0) return;
  for (const existing of Object.values(testRunners)) {
    if (existing.hostname === incoming.hostname) continue;
    const existingQueues = queueNamesForConfig(existing);
    for (const queue of incomingQueues) {
      if (existingQueues.has(queue)) {
        logger.error(
          'Testrunner queue collision: %s and %s both claim queue %s. ' +
            'Change LOCATION_NAME (or deviceId) on one of them.',
          existing.hostname,
          incoming.hostname,
          queue
        );
      }
    }
  }
}

export function addTestRunner(config) {
  warnOnQueueCollision(config);
  mergeByHostname(testRunners, config);
  updateTestRunnerMetrics();
}

export function removeTestRunner(config) {
  removeByHostname(config.hostname);
  updateTestRunnerMetrics();
}

// Heartbeat handler: a known runner says "still here". Unknown runners
// (heartbeat before the start message lands, or after a server-side prune)
// are ignored — the next start broadcast will register them properly.
export function touchTestRunner(hostname) {
  const runner = testRunners[hostname];
  if (runner) {
    runner.lastSeenAt = Date.now();
  }
}

export function pruneStaleTestRunners(now = Date.now()) {
  for (const [hostname, runner] of Object.entries(testRunners)) {
    if (now - (runner.lastSeenAt ?? 0) > STALE_AFTER_MS) {
      logger.warn(
        'Pruning stale testrunner %s (no heartbeat for %ds)',
        hostname,
        Math.round((now - runner.lastSeenAt) / 1000)
      );
      removeByHostname(hostname);
    }
  }
  updateTestRunnerMetrics();
}

export function getTestRunners() {
  return Object.values(testRunners);
}

export function getTestRunnersConfiguration(name) {
  return Object.values(testRunners).find(
    testRunner => testRunner.name === name
  );
}
