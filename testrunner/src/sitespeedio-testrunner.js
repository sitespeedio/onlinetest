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

// Heartbeat cadence. The server prunes runners whose lastSeenAt is older
// than 120 s (see server/src/testrunners.js), so 30 s gives us four chances
// before we get marked dead.
const HEARTBEAT_INTERVAL_MS = 30_000;
let heartbeatTimer;

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

    // Heartbeat. Reuses the existing `testrunners` queue used by start/stop;
    // the server treats a missing heartbeat as a dead runner and prunes us.
    // The serverConfig rides along so a server that no longer knows us
    // (pruned during a Redis blip, or restarted while our start broadcast
    // was lost) can re-register us instead of ignoring the heartbeat.
    const testRunnerQueue = await queueHandler.getQueue('testrunners');
    heartbeatTimer = setInterval(() => {
      testRunnerQueue
        .add(
          {
            type: 'heartbeat',
            hostname: serverConfig.hostname,
            serverConfig: serverConfig
          },
          // Heartbeats fire every 30s and carry the full serverConfig —
          // without cleanup the completed jobs pile up in Redis forever.
          { removeOnComplete: true, removeOnFail: true }
        )
        .catch(error =>
          logger.error('Failed to publish heartbeat: %s', error.message)
        );
    }, HEARTBEAT_INTERVAL_MS);
    heartbeatTimer.unref();

    process.on('uncaughtException', error => {
      // ioredis configuration is tricky to get right
      // this can spam the log but at least we catch everything
      logger.error('Uncaught Exception thrown:', error);
    });
  }

  async stop() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    }
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
