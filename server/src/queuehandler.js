import NodeCache from 'node-cache';
const idToQueue = new NodeCache({ stdTTL: 60 * 60, checkperiod: 120 });
import Queue from 'bull';
import { getLogger } from '@sitespeed.io/log';
const logger = getLogger('sitespeedio.server');
const queues = {};
const deviceToQueue = {};
import { nconf } from './config.js';
import Redis from 'ioredis';
import { queueSize, queueJobsActive, redisConnectionUp } from './metrics.js';

function getRedis() {
  const REDIS_PORT = nconf.get('redis:port');
  const REDIS_HOST = nconf.get('redis:host');
  const REDIS_PASSWORD = nconf.get('redis:password');
  if (REDIS_PASSWORD === 'CHANGE_ME_REDIS_PASSWORD') {
    logger.warning(
      'You use the default password for Redis/KeyDB, please change it!'
    );
  }
  const redis = new Redis({
    port: REDIS_PORT,
    host: REDIS_HOST,
    password: REDIS_PASSWORD
  });
  redis.on('error', error => {
    logger.error('Could not connect to Redis/KeyDB', error);
  });
  return redis;
}

export async function publish(channel, message) {
  return getRedis().publish(channel, message);
}

export function processJob(queueName, process) {
  if (queues[queueName]) {
    return queues(queueName).process(process);
  } else {
    const REDIS_PORT = nconf.get('redis:port');
    const REDIS_HOST = nconf.get('redis:host');
    const REDIS_PASSWORD = nconf.get('redis:password');
    const queue = new Queue(queueName, {
      redis: {
        port: REDIS_PORT,
        host: REDIS_HOST,
        password: REDIS_PASSWORD,
        retryStrategy: times => {
          const delay = Math.min(times * 100, 3000);
          logger.info(`Retry attempt ${times}: Retrying in ${delay} ms`);
          return delay;
        },
        reconnectOnError: error => {
          logger.error(`Reconnect on error: ${error.message}`);
          // Decide whether to reconnect based on error message content
          if (error.message.includes('ECONNRESET')) {
            logger.info('Reconnecting again, got a ECONNRESET');
            return true;
          }
          return false;
        }
      }
    });
    queues[queueName] = queue;
    return queues[queueName].process(process);
  }
}

export function off(queueName, message, process) {
  return queues[queueName].off(message, process);
}

export function onMessage(queueName, message, process) {
  if (queues[queueName]) {
    return queues[queueName].on(message, process);
  } else {
    const REDIS_PORT = nconf.get('redis:port');
    const REDIS_HOST = nconf.get('redis:host');
    const REDIS_PASSWORD = nconf.get('redis:password');
    let queue = new Queue(queueName, {
      redis: {
        port: REDIS_PORT,
        host: REDIS_HOST,
        password: REDIS_PASSWORD,
        retryStrategy: times => {
          const delay = Math.min(times * 100, 3000);
          logger.info(`Retry attempt ${times}: Retrying in ${delay} ms`);
          return delay;
        },
        reconnectOnError: error => {
          logger.error(`Reconnect on error: ${error.message}`);
          // Decide whether to reconnect based on error message content
          if (error.message.includes('ECONNRESET')) {
            logger.info('Reconnecting again, got a ECONNRESET');
            return true;
          }
          return false;
        }
      }
    });
    queues[queueName] = queue;

    queue.on('error', error => {
      logger.error('Error in %s queue: %s', queueName, error);
    });
    return queue.on(message, process);
  }
}

export async function getJob(jobId) {
  const queue = getQueueById(jobId);
  return queue ? queue.getJob(jobId) : undefined;
}

export async function getQueueSize(name) {
  const queue = getQueue(name);
  return queue.count();
}

// Full job-counts view: waiting / active / failed / delayed / completed /
// paused. The admin page uses waiting+active+failed; the other fields come
// for free in the same Bull call so we expose them all.
export async function getQueueCounts(name) {
  const queue = getQueue(name);
  try {
    return await queue.getJobCounts();
  } catch {
    return {
      waiting: 0,
      active: 0,
      failed: 0,
      delayed: 0,
      completed: 0,
      paused: 0
    };
  }
}

// Active jobs across a queue, capped so the admin call can't pull
// thousands of records on a runaway. The job objects Bull returns are
// heavy — the caller is expected to project only what it needs.
export async function getActiveJobs(name, limit = 20) {
  const queue = getQueue(name);
  try {
    return await queue.getActive(0, limit - 1);
  } catch {
    return [];
  }
}

// Most-recently-failed jobs from a queue. Bull keeps up to
// `queue:removeOnFail` failures (defaults to 50, configurable in
// server.yaml). The caller is expected to sort by `finishedOn` after
// merging across queues.
export async function getFailedJobs(name, limit = 20) {
  const queue = getQueue(name);
  try {
    return await queue.getFailed(0, limit - 1);
  } catch {
    return [];
  }
}

// Re-enqueue a previously-failed job via Bull's built-in retry. Returns
// true on success, false if the job no longer exists or isn't in a
// failed state (someone already retried it, or removeOnFail evicted it
// between page render and click).
export async function retryFailedJob(queueName, jobId) {
  const queue = getQueue(queueName);
  try {
    const job = await queue.getJob(jobId);
    if (!job) return false;
    const state = await job.getState();
    if (state !== 'failed') return false;
    await job.retry();
    return true;
  } catch {
    return false;
  }
}

// Cheap health probe. Any open Bull queue exposes its underlying ioredis
// client; status 'ready' means the connection is up and authenticated.
// We pick the first connected queue — if none exist yet (very first
// request after boot, before any testrunner has registered) we fall back
// to 'unknown' rather than lying with 'down'.
export function isRedisHealthy() {
  for (const queue of Object.values(queues)) {
    if (queue.client && queue.client.status === 'ready') return true;
  }
  return false;
}

export function getExistingQueue(name) {
  return queues[name];
}

export function getQueue(name) {
  if (queues[name]) {
    return queues[name];
  } else {
    let queue;
    const REDIS_PORT = nconf.get('redis:port');
    const REDIS_HOST = nconf.get('redis:host');
    const REDIS_PASSWORD = nconf.get('redis:password');
    logger.info(
      `Connecting to KeyValue backend on ${REDIS_HOST}:${REDIS_PORT}`
    );

    queue = new Queue(name, {
      redis: {
        port: REDIS_PORT,
        host: REDIS_HOST,
        password: REDIS_PASSWORD,
        retryStrategy: times => {
          const delay = Math.min(times * 100, 3000);
          logger.info(`Retry attempt ${times}: Retrying in ${delay} ms`);
          return delay;
        },
        reconnectOnError: error => {
          logger.error(`Reconnect on error: ${error.message}`);
          // Decide whether to reconnect based on error message content
          if (error.message.includes('ECONNRESET')) {
            logger.info('Reconnecting again, got a ECONNRESET');
            return true;
          }
          return false;
        }
      }
    });
    queues[name] = queue;
    return queue;
  }
}

export function addDeviceToQueue(deviceId, location, queueName) {
  if (deviceId) {
    deviceToQueue[deviceId] = queueName;
  } else {
    deviceToQueue[location] = queueName;
  }
}

export function getDeviceQueue(deviceId, location) {
  return deviceId ? deviceToQueue[deviceId] : deviceToQueue[location];
}
export function getQueueById(id) {
  const name = idToQueue.get(id);
  return queues[name];
}

export function setIdAndQueue(id, queue) {
  idToQueue.set(id, queue.name);
}

export function getExistingQueueNames() {
  return Object.keys(queues);
}

async function updateQueueMetrics() {
  let redisHealthy = false;
  for (const [name, queue] of Object.entries(queues)) {
    try {
      const counts = await queue.getJobCounts();
      queueSize.set({ queue: name }, counts.waiting || 0);
      queueJobsActive.set({ queue: name }, counts.active || 0);
      if (queue.client && queue.client.status === 'ready') {
        redisHealthy = true;
      }
    } catch {
      // Ignore errors during metrics collection
    }
  }
  redisConnectionUp.set(redisHealthy ? 1 : 0);
}

const QUEUE_METRICS_INTERVAL_MS = 10_000;
setInterval(updateQueueMetrics, QUEUE_METRICS_INTERVAL_MS).unref();
