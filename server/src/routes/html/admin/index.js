import { createRequire } from 'node:module';
import { Router } from 'express';

import { nconf } from '../../../config.js';
import { getText } from '../../../util/text.js';
import {
  getExistingQueue,
  getExistingQueueNames,
  getQueueCounts,
  getActiveJobs,
  isRedisHealthy
} from '../../../queuehandler.js';
import { getTestRunners } from '../../../testrunners.js';
import {
  isDatabaseHealthy,
  getStatistics,
  getRecentFailures
} from '../../../database/index.js';

const require = createRequire(import.meta.url);
const serverVersion = require('../../../../package.json').version;

export const admin = Router();

// Internal queues created by the server itself for orchestration — they
// don't have an external testrunner consuming them, so the "no worker"
// badge would be misleading. Keep this list narrow.
const INTERNAL_QUEUES = new Set(['testrunners', 'result']);

async function buildAdminView() {
  const queues = getExistingQueueNames();
  const queueCounts = {};
  for (const queueName of queues) {
    queueCounts[queueName] = await getQueueCounts(queueName);
  }
  const now = Date.now();
  const testRunners = getTestRunners().map(runner => ({
    hostname: runner.hostname,
    location: runner.name,
    setup: runner.setup,
    lastSeenAt: runner.lastSeenAt,
    secondsSinceSeen: runner.lastSeenAt
      ? Math.max(0, Math.round((now - runner.lastSeenAt) / 1000))
      : undefined
  }));
  // Map every queue name to a hostname (if any) so the active-jobs table
  // can show which testrunner picked up each job. Also keep a queue ->
  // location map so the queue-row sparkline can pull the right 24 h
  // throughput slice (per-location is the closest signal we have
  // without storing the queue name on each test row).
  const queueToHostname = {};
  const queueToLocation = {};
  for (const runner of testRunners) {
    for (const setup of runner.setup || []) {
      if (setup.queue && !queueToHostname[setup.queue]) {
        queueToHostname[setup.queue] = runner.hostname;
      }
      if (setup.queue && !queueToLocation[setup.queue]) {
        queueToLocation[setup.queue] = runner.location;
      }
    }
  }
  // A queue is "served" if any currently-registered testrunner advertises
  // it in its setup. Used to flag queues that have pending work but no
  // worker — the most actionable thing an operator can see at a glance.
  const servedQueues = new Set(Object.keys(queueToHostname));
  // Pull active (in-flight) jobs from each non-internal queue. Capped per
  // queue so a runaway can't blow up the admin response.
  const activeJobs = [];
  for (const queueName of queues) {
    if (INTERNAL_QUEUES.has(queueName)) continue;
    const jobs = await getActiveJobs(queueName, 20);
    for (const job of jobs) {
      const startedAt = job.processedOn || job.timestamp;
      activeJobs.push({
        id: String(job.id),
        queue: queueName,
        url: job.data?.url || undefined,
        scriptingName: job.data?.scriptingName || undefined,
        label: job.data?.label || undefined,
        runner: queueToHostname[queueName] || undefined,
        startedAt,
        secondsRunning: startedAt
          ? Math.max(0, Math.round((now - startedAt) / 1000))
          : undefined
      });
    }
  }
  activeJobs.sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));

  const failureRows = await getRecentFailures(25);
  const recentFailures = failureRows.map(row => {
    let reason = (row.failed_reason || '').split('\n')[0].trim();
    if (reason.length > 160) reason = reason.slice(0, 157) + '…';
    const finishedAt = row.finished_date
      ? new Date(row.finished_date).getTime()
      : undefined;
    return {
      id: String(row.id),
      target: row.scripting_name || row.url || row.label || '',
      reason,
      finishedAt,
      secondsAgo: finishedAt
        ? Math.max(0, Math.round((now - finishedAt) / 1000))
        : undefined
    };
  });

  // Pull DB-backed activity stats first — the health banner uses the
  // 24 h failed count from here. The helper itself caches for 60s so
  // the admin auto-refresh doesn't beat on Postgres every 15s.
  const stats = await getStatistics();

  // Health banner aggregates everything an operator wants at a glance.
  // Pending/active are right-now Bull counts (truly ephemeral); failed
  // is the last-24 h count from the DB rather than Bull's retained-
  // failures count. Bull's count keeps every failure that hasn't been
  // retried or evicted by `removeOnFail`, so it accumulates over weeks
  // and never decays — that's a backlog, not a health signal. The
  // Recent failures table on the same page is the place to see the
  // retry backlog; the health pill should answer "did stuff break
  // today?" and drop back to 0 when it didn't.
  let totalPending = 0;
  let totalActive = 0;
  for (const queueName of queues) {
    if (INTERNAL_QUEUES.has(queueName)) continue;
    const c = queueCounts[queueName] || {};
    totalPending += c.waiting || 0;
    totalActive += c.active || 0;
  }
  const totalFailed = (stats.last24h && stats.last24h.failed) || 0;
  const health = {
    serverVersion,
    redis: isRedisHealthy(),
    database: await isDatabaseHealthy(),
    runnerCount: testRunners.length,
    totalPending,
    totalActive,
    totalFailed
  };

  // Per-queue sparkline arrays (24 hourly totals). Only filled for
  // non-internal queues whose location we can resolve from a currently-
  // connected runner — anything else gets no sparkline rather than a
  // misleading flat line.
  const queueSparklines = {};
  for (const queueName of queues) {
    if (INTERNAL_QUEUES.has(queueName)) continue;
    const loc = queueToLocation[queueName];
    if (!loc) continue;
    const buckets = stats.hourlyByLocation && stats.hourlyByLocation[loc];
    if (buckets) queueSparklines[queueName] = buckets;
  }

  // The Queues table is for operator-actionable queues only. Internal
  // orchestration queues (testrunners, result) have no worker, no
  // sparkline, no failure handling and an inert Empty button — showing
  // them just adds rows you can't do anything with.
  const visibleQueues = queues.filter(q => !INTERNAL_QUEUES.has(q));

  return {
    queues: visibleQueues,
    queueCounts,
    testRunners,
    servedQueues,
    internalQueues: INTERNAL_QUEUES,
    activeJobs,
    failedJobs: recentFailures,
    health,
    stats,
    queueSparklines
  };
}

function renderAdmin(response, view) {
  response.render('admin/index', {
    bodyId: 'index',
    title: getText('index.title'),
    description: getText('index.descripton'),
    nconf,
    getText,
    ...view
  });
}

admin.get('/', async function (request, response) {
  // The page auto-refreshes via client-side polling; make sure nothing
  // along the path serves a cached copy that defeats it.
  response.set('Cache-Control', 'no-store');
  renderAdmin(response, await buildAdminView());
});

admin.post('/', async function (request, response) {
  const name = request.body.queueName;
  const queue = await getExistingQueue(name);
  await queue.empty();
  response.set('Cache-Control', 'no-store');
  renderAdmin(response, await buildAdminView());
});
