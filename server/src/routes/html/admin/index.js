import { Router } from 'express';

import { nconf } from '../../../config.js';
import { getText } from '../../../util/text.js';
import {
  getExistingQueue,
  getExistingQueueNames,
  getQueueSize
} from '../../../queuehandler.js';

export const admin = Router();

admin.get('/', async function (request, response) {
  const queues = getExistingQueueNames();
  let queueSizes = {};

  for (const queueName of queues) {
    const size = await getQueueSize(queueName);
    queueSizes[queueName] = size;
  }

  response.render('admin/index', {
    bodyId: 'index',
    title: getText('index.title'),
    description: getText('index.descripton'),
    nconf,
    getText,
    queues,
    queueSizes
  });
});

admin.post('/', async function (request, response) {
  const name = request.body.queueName;
  const queue = await getExistingQueue(name);
  await queue.empty();

  const queues = getExistingQueueNames();
  let queueSizes = {};

  for (const queueName of queues) {
    const size = await getQueueSize(queueName);
    queueSizes[queueName] = size;
  }

  response.render('admin/index', {
    bodyId: 'index',
    title: getText('index.title'),
    description: getText('index.descripton'),
    nconf,
    getText,
    queues,
    queueSizes
  });
});
