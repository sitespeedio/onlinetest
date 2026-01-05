import { getLogger, configureLog } from '@sitespeed.io/log';
import os from 'node:os';
import { createRequire } from 'node:module';

import run from './testrunners/testrunner.js';
import runDocker from './testrunners/docker-testrunner.js';
import { queueHandler } from './queue/queuehandler.js';
import { nconf } from './config.js';

const require = createRequire(import.meta.url);
const version = require('../package.json').version;

const logger = getLogger('sitespeedio.testrunner');

const queues = [];

export class SitespeedioTestRunner {
  constructor() {
    const logVerbose = nconf.get('log:verbose');
    configureLog({ level: logVerbose ? 'verbose' : 'info' });
  }

  async start() {
    const serverConfig = nconf.get('location');

    // If hostname isn't configured add it
    const hostname = os.hostname();
    if (serverConfig.hostname === undefined) {
      serverConfig.hostname = hostname;
      logger.info('No hostname found in configuration. Will use %s', hostname);
    }

    logger.info(`Starting testrunner ${hostname} version ${version}`);

    const testRunners = [];
    // Setup the queues for each job
    for (let internalTestRunner of serverConfig.setup) {
      // If we haven't configured specific queues, we give them names
      if (!internalTestRunner.queue) {
        internalTestRunner.queue =
          `${serverConfig.name}` +
          (internalTestRunner.deviceId
            ? `-${internalTestRunner.deviceId}`
            : '');
      }

      const testRunnerName = internalTestRunner.queue;

      if (testRunners.includes(testRunnerName)) {
        // If we alread have that worker, do not add it again
        // That happens if you have desktop/emulated mobile that runs on the same server
        continue;
      }

      testRunners.push(testRunnerName);
      let jobQueue = await queueHandler.getQueue(testRunnerName);
      queues.push(jobQueue);
      internalTestRunner.queueName = testRunnerName;
      if (internalTestRunner.useDocker) {
        logger.info('Setup Docker testrunner for %s', testRunnerName);
        jobQueue.process(runDocker);
      } else {
        logger.info('Setup testrunner for %s', testRunnerName);
        jobQueue.process(run);
      }
    }

    await queueHandler.start(serverConfig);

    process.on('uncaughtException', error => {
      // ioredis configuration is tricky to get right
      // this can spam the log but at least we catch everything
      logger.error('Uncaught Exception thrown:', error);
    });
  }

  async stop() {
    try {
      const serverConfig = nconf.get('location');

      const hostname = os.hostname();
      if (serverConfig.hostname === undefined) {
        serverConfig.hostname = hostname;
      }

      const testRunnerQueue = await queueHandler.getQueue('testrunners');

      if (testRunnerQueue.client.status === 'ready') {
        logger.info('Closing down testrunner:' + serverConfig.name);
        await testRunnerQueue.add({
          type: 'stop',
          name: serverConfig.name,
          serverConfig: serverConfig
        });
      } else {
        logger.info('No connnection to Redis');
      }

      for (let queue of queues) {
        logger.info('Closing down queue:' + queue.name);
        await queue.close();
      }

      logger.info('Stopping Redis connection');
      queueHandler.stop();
    } catch (error) {
      logger.error(`Error encountered while shutting down: ${error.message}`);
    } finally {
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit();
    }
  }
}
