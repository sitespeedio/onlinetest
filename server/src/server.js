import { getLogger, configureLog } from '@sitespeed.io/log';
import { nconf } from './config.js';

import { WebServer } from './webserver.js';
import {
  publish,
  onMessage,
  processJob,
  getExistingQueue,
  addDeviceToQueue
} from './queuehandler.js';
import { addTestRunner, removeTestRunner } from './testrunners.js';
import { testConnection, updateStatus, updateTest } from './database/index.js';
import DatabaseHelper from './database/databasehelper.js';

const logger = getLogger('sitespeedio.server');

async function setActiveStatus(jobid) {
  return updateStatus(jobid, 'active');
}

async function setFailedStatus(jobid) {
  return updateStatus(jobid, 'failed');
}

function setupLogging() {
  const logVerbose = nconf.get('log:verbose');
  configureLog({ level: logVerbose ? 'verbose' : 'info' });
}

async function setupResultQueue() {
  processJob('result', async job => {
    return updateTest(
      job.data.id,
      job.data.status,
      job.data.runTime,
      job.data.result.pageSummaryUrl,
      job.data.result.browsertime,
      job.data.result.har
    );
  });
}

async function setupTestRunnerQueue() {
  // Create the queue that handle testrunners
  processJob('testrunners', async job => {
    return new Promise(resolve => {
      // The testrunner can send two different messages; either that the
      // queue is starting or that the queue is shutting down.
      if (job.data.type === 'start') {
        logger.info(
          'Got a new testrunner %s : %j',
          job.data.serverConfig.name,
          job.data.serverConfig
        );

        addTestRunner(job.data.serverConfig);
        for (let setup of job.data.serverConfig.setup) {
          let queueName = setup.queue;

          const queue = getExistingQueue(queueName);
          // We only add queue that do not exist
          if (!queue) {
            onMessage(queueName, 'global:active', setActiveStatus);
            onMessage(queueName, 'global:failed', setFailedStatus);
            addDeviceToQueue(
              setup.deviceId,
              job.data.serverConfig.name,
              queueName
            );
          }
        }
        return resolve();
      } else {
        logger.info('TestRunner %s is shutting down', job.data.name);

        removeTestRunner(job.data.serverConfig);

        for (let setup of job.data.serverConfig.setup) {
          let queueName = setup.queue;
          const queue = getExistingQueue(queueName);
          if (queue) {
            // TODO this will break if many works on the same queue
            // off(queueName, 'global:active', setActiveStatus);
            // off(queueName, 'global:failed', setFailedStatus);
          }
        }
        return resolve();
      }
    });
  });
}

export class SitespeedioServer {
  constructor() {
    setupLogging();
  }

  async start() {
    process.on('uncaughtException', error => {
      // ioredis configuration is tricky to get right
      // this can spam the log but at least we catch everything
      logger.error('Uncaught Exception thrown:', error);
      logger.error('Trace', error.stack);
    });

    try {
      await testConnection();
    } catch (error) {
      logger.error('Could not access the database', error);
      throw error;
    }

    const webserver = new WebServer();
    await webserver.start();
    await setupTestRunnerQueue();
    await setupResultQueue();
    // Tell the world that we are starting
    await publish('server', 'start');
  }

  async stop() {
    logger.info('Closing down server');

    // Close the queues?

    // Close the database pool
    await DatabaseHelper.getInstance().closeConnectionPool();
  }
}
