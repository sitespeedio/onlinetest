import { Router } from 'express';

import { nconf } from '../../../config.js';
import { getText } from '../../../util/text.js';
import {
  getExistingQueue,
  getExistingQueueNames,
  getQueueSize
} from '../../../queuehandler.js';
import { getTestRunners } from '../../../testrunners.js';

export const admin = Router();

async function buildAdminView() {
  const queues = getExistingQueueNames();
  const queueSizes = {};
  for (const queueName of queues) {
    queueSizes[queueName] = await getQueueSize(queueName);
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
  return { queues, queueSizes, testRunners };
}

admin.get('/', async function (request, response) {
  const { queues, queueSizes, testRunners } = await buildAdminView();
  response.render('admin/index', {
    bodyId: 'index',
    title: getText('index.title'),
    description: getText('index.descripton'),
    nconf,
    getText,
    queues,
    queueSizes,
    testRunners
  });
});

admin.post('/', async function (request, response) {
  const name = request.body.queueName;
  const queue = await getExistingQueue(name);
  await queue.empty();

  const { queues, queueSizes, testRunners } = await buildAdminView();
  response.render('admin/index', {
    bodyId: 'index',
    title: getText('index.title'),
    description: getText('index.descripton'),
    nconf,
    getText,
    queues,
    queueSizes,
    testRunners
  });
});
