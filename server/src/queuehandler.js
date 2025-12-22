import NodeCache from 'node-cache';
const idToQueue = new NodeCache({ stdTTL: 60 * 60, checkperiod: 120 });
import Queue from 'bull';
import { getLogger } from '@sitespeed.io/log';
const logger = getLogger('sitespeedio.server');
const queues = {};
const deviceToQueue = {};
import { nconf } from './config.js';
import Redis from 'ioredis';

function getRedis() {
  const REDIS_PORT = nconf.get('redis:port');
  const REDIS_HOST = nconf.get('redis:host');
  const REDIS_PASSWORD = nconf.get('redis:password');
  if (REDIS_PASSWORD === 'jgsay7f2fgfgda6acCa7g()jaba51!') {
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
