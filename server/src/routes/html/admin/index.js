import { createRequire } from 'node:module';
import { Router } from 'express';

import { nconf } from '../../../config.js';
import { getText } from '../../../util/text.js';
import {
  getExistingQueue,
  getExistingQueueNames,
  getQueueCounts,
  getActiveJobs,
  getFailedJobs,
  retryFailedJob,
  isRedisHealthy
} from '../../../queuehandler.js';
import { getTestRunners } from '../../../testrunners.js';
import { isDatabaseHealthy } from '../../../database/index.js';

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
  // can show which testrunner picked up each job.
  const queueToHostname = {};
  for (const runner of testRunners) {
    for (const setup of runner.setup || []) {
      if (setup.queue && !queueToHostname[setup.queue]) {
        queueToHostname[setup.queue] = runner.hostname;
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

  // Recent failures across non-internal queues. Bull's `failedReason` is
  // the first line of whatever the testrunner threw. Truncate it for the
  // table so a 4-line stack trace doesn't blow up the layout; the full
  // log is one click away on /result/<id>.
  const failedJobs = [];
  for (const queueName of queues) {
    if (INTERNAL_QUEUES.has(queueName)) continue;
    const jobs = await getFailedJobs(queueName, 20);
    for (const job of jobs) {
      const finishedAt = job.finishedOn;
      let reason = (job.failedReason || '').split('\n')[0].trim();
      if (reason.length > 160) reason = reason.slice(0, 157) + '…';
      failedJobs.push({
        id: String(job.id),
        queue: queueName,
        target:
          job.data?.scriptingName || job.data?.url || job.data?.label || '',
        reason,
        attemptsMade: job.attemptsMade || 0,
        finishedAt,
        secondsAgo: finishedAt
          ? Math.max(0, Math.round((now - finishedAt) / 1000))
          : undefined
      });
    }
  }
  failedJobs.sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));
  // Show at most this many across all queues so the page stays scannable.
  const recentFailures = failedJobs.slice(0, 25);

  // Health banner aggregates everything an operator wants at a glance.
  let totalPending = 0;
  let totalActive = 0;
  let totalFailed = 0;
  for (const queueName of queues) {
    if (INTERNAL_QUEUES.has(queueName)) continue;
    const c = queueCounts[queueName] || {};
    totalPending += c.waiting || 0;
    totalActive += c.active || 0;
    totalFailed += c.failed || 0;
  }
  const health = {
    serverVersion,
    redis: isRedisHealthy(),
    database: await isDatabaseHealthy(),
    runnerCount: testRunners.length,
    totalPending,
    totalActive,
    totalFailed
  };

  return {
    queues,
    queueCounts,
    testRunners,
    servedQueues,
    internalQueues: INTERNAL_QUEUES,
    activeJobs,
    failedJobs: recentFailures,
    health
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
  renderAdmin(response, await buildAdminView());
});

admin.post('/', async function (request, response) {
  const name = request.body.queueName;
  const queue = await getExistingQueue(name);
  await queue.empty();
  renderAdmin(response, await buildAdminView());
});

// Re-enqueue a failed job. Bull's job.retry() pushes it back to the
// queue's wait list, so the next available testrunner on that queue
// picks it up and runs it again — same data, same attempt counter.
admin.post('/retry', async function (request, response) {
  const queueName = request.body.queueName;
  const jobId = request.body.jobId;
  if (queueName && jobId) {
    await retryFailedJob(queueName, jobId);
  }
  response.redirect('/admin/');
});
