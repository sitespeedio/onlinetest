import { Router } from 'express';

import { nconf } from '../../../config.js';
import { getText } from '../../../util/text.js';
import {
  getExistingQueue,
  getExistingQueueNames,
  getQueueCounts
} from '../../../queuehandler.js';
import { getTestRunners } from '../../../testrunners.js';

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
  // A queue is "served" if any currently-registered testrunner advertises
  // it in its setup. Used to flag queues that have pending work but no
  // worker — the most actionable thing an operator can see at a glance.
  const servedQueues = new Set();
  for (const runner of testRunners) {
    for (const setup of runner.setup || []) {
      if (setup.queue) servedQueues.add(setup.queue);
    }
  }
  return {
    queues,
    queueCounts,
    testRunners,
    servedQueues,
    internalQueues: INTERNAL_QUEUES
  };
}

admin.get('/', async function (request, response) {
  const { queues, queueCounts, testRunners, servedQueues, internalQueues } =
    await buildAdminView();
  response.render('admin/index', {
    bodyId: 'index',
    title: getText('index.title'),
    description: getText('index.descripton'),
    nconf,
    getText,
    queues,
    queueCounts,
    testRunners,
    servedQueues,
    internalQueues
  });
});

admin.post('/', async function (request, response) {
  const name = request.body.queueName;
  const queue = await getExistingQueue(name);
  await queue.empty();

  const { queues, queueCounts, testRunners, servedQueues, internalQueues } =
    await buildAdminView();
  response.render('admin/index', {
    bodyId: 'index',
    title: getText('index.title'),
    description: getText('index.descripton'),
    nconf,
    getText,
    queues,
    queueCounts,
    testRunners,
    servedQueues,
    internalQueues
  });
});
