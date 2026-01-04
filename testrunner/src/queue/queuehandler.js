import Queue from 'bull';
import Redis from 'ioredis';

import { nconf } from '../config.js';
import { getLogger } from '@sitespeed.io/log';

const logger = getLogger('sitespeedio.testrunner');

const delay = ms => new Promise(response => setTimeout(response, ms));

class QueueHandler {
  constructor() {
    this.queues = {};
  }

  async start(serverConfig) {
    const port = nconf.get('redis:port') ?? 6379;
    const host = nconf.get('redis:host') ?? '127.0.0.1';
    const password = nconf.get('redis:password');

    logger.info(
      `Trying to connect to Redis using host ${host} and port ${port}`
    );

    if (!password) {
      logger.info('No queue password is setup');
    }

    this.redis = new Redis({
      port,
      host,
      password,
      tls: nconf.get('redis:tls') ? { servername: host } : undefined,
      retryStrategy: times => {
        const delay = Math.min(times * 500, 3000);
        logger.info(`Retry MAIN attempt ${times}: Retrying in ${delay} ms`);
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
    });

    // Let listen on messages from the server
    this.redis.subscribe('server', error => {
      if (error) {
        logger.error('Failed to subscribe: %s', error.message);
      } else {
        logger.info('Listen on the server channel for server updates');
      }
    });

    this.redis.on('error', error => {
      logger.error('Error in KeyDB/Redis connection %s', error);
    });

    // Lets tell the world (or the testsrunners queue) that we are live
    const testRunnersQueue = await this.getQueue('testrunners');
    testRunnersQueue.add({ type: 'start', serverConfig: serverConfig });

    // If the server comes online, lets tell it that we are ready
    this.redis.on('message', (channel, message) => {
      if (channel === 'server' && message === 'start') {
        logger.info('Got message that server is starting');
        testRunnersQueue.add({
          type: 'start',
          serverConfig: serverConfig
        });
      }
    });
  }

  async getQueue(name) {
    const port = nconf.get('redis:port') ?? 6379;
    const host = nconf.get('redis:host') ?? '127.0.0.1';
    const password = nconf.get('redis:password');

    if (this.queues[name]) {
      return this.queues[name];
    }
    logger.info(`Connecting queue ${name} on ${host}:${port}`);

    const queue = new Queue(name, {
      redis: {
        port,
        host,
        password,
        tls: nconf.get('redis:tls') ? { servername: host } : undefined,
        retryStrategy: times => {
          const delay = Math.min(times * 200, 3000);
          logger.info(
            `Retry ${name} attempt ${times}: Retrying in ${delay} ms`
          );
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

    queue.on('error', error => {
      logger.error('Error in %s queue: %s', name, error);
    });

    queue.on('lock-extension-failed', function (job, error) {
      logger.error('lock-extension-failed in %s queue: %s', name, error);
    });

    // give some time to connect
    await delay(1000);

    if (queue.client.status === 'ready') {
      logger.info('Your queue %s is ready', name);
    } else {
      logger.error(
        `Could not connect to the Redis like queue on ${host}:${port}`
      );
      throw new Error('The queue is not available');
    }
    this.queues[name] = queue;
    return queue;
  }

  async stop() {
    // Make sure the redis connection we handle ourselves is closed
    this.redis.quit();
  }
}

export const queueHandler = new QueueHandler();
