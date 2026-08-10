import { getLogger, configureLog } from '@sitespeed.io/log';
import { nconf } from './config.js';

import { WebServer } from './webserver.js';
import {
  publish,
  onMessage,
  processJob,
  getExistingQueue,
  getExistingQueueNames,
  addDeviceToQueue
} from './queuehandler.js';
import {
  addTestRunner,
  removeTestRunner,
  touchTestRunner,
  pruneStaleTestRunners
} from './testrunners.js';
import {
  testConnection,
  updateStatus,
  updateTest,
  getTest,
  getStaleActiveTestIds
} from './database/index.js';
import DatabaseHelper from './database/databasehelper.js';
import { testsCompletedTotal, testsFailedTotal } from './metrics.js';

const logger = getLogger('sitespeedio.server');

async function setActiveStatus(jobid) {
  return updateStatus(jobid, 'active');
}

async function setFailedStatus(jobid, error) {
  // Bull's global:failed event passes the failedReason string as the
  // second argument — persist it so /admin can show why the job died
  // even after Bull evicts the failed job per `removeOnFail`.
  return updateStatus(jobid, 'failed', error);
}

async function setStalledStatus(jobid) {
  // Bull moved this job from active back to wait because its lock
  // expired (testrunner died mid-run). Mirror that in the DB so
  // /search and /result stop showing the row as 'active' while the
  // retry is queued — Bull will retry, and the next global:active /
  // global:failed will write the final state. We do *not* mark it
  // 'failed' here: a successful retry shouldn't leave a phantom
  // failure in the 24h count.
  return updateStatus(jobid, 'waiting');
}

// Cadence for the stale-active reconcile pass. Runs every 60 s, only
// touching rows older than RECONCILE_GRACE_MINUTES so we never race a
// freshly-active job whose `setActiveStatus` event is in flight.
const RECONCILE_INTERVAL_MS = 60_000;
const RECONCILE_GRACE_MINUTES = 5;

// Catches stale active rows the global:stalled handler missed —
// typically because the server was down when Bull fired the event,
// so no listener was attached. Walks every `status='active'` row
// older than the grace window, asks Bull what state the job is
// actually in, and rewrites the DB to match. If Bull no longer has
// the job at all (evicted by removeOnFail/removeOnComplete after a
// completion we never recorded), we mark the row failed with an
// explicit reason so it stops haunting /search.
async function reconcileStaleActiveRows() {
  const queueNames = getExistingQueueNames();
  if (queueNames.length === 0) return;

  const staleIds = await getStaleActiveTestIds(RECONCILE_GRACE_MINUTES);
  if (staleIds.length === 0) return;

  for (const id of staleIds) {
    let job;
    for (const queueName of queueNames) {
      const queue = getExistingQueue(queueName);
      if (!queue) continue;
      try {
        const candidate = await queue.getJob(id);
        if (candidate) {
          job = candidate;
          break;
        }
      } catch (error) {
        logger.error(
          'Reconcile: error querying queue %s for job %s: %s',
          queueName,
          id,
          error.message
        );
      }
    }

    if (!job) {
      logger.info(
        'Reconcile: %s is no longer in the queue, marking failed',
        id
      );
      await updateStatus(id, 'failed', 'Reconciled: job no longer in queue');
      continue;
    }

    let state;
    try {
      state = await job.getState();
    } catch (error) {
      logger.error('Reconcile: getState for %s failed: %s', id, error.message);
      continue;
    }

    if (state === 'active') continue;

    logger.info('Reconcile: %s Bull state is %s, updating DB', id, state);
    if (state === 'failed') {
      await updateStatus(
        id,
        'failed',
        job.failedReason || 'Reconciled: queue state was failed'
      );
    } else if (state === 'completed') {
      await updateStatus(id, 'completed');
    } else {
      // waiting / delayed / paused — Bull will run it again, mirror
      // its current resting state instead of inventing one.
      await updateStatus(id, 'waiting');
    }
  }
}

function setupLogging() {
  const logVerbose = nconf.get('log:verbose');
  configureLog({ level: logVerbose ? 'verbose' : 'info' });
}

async function setupResultQueue() {
  processJob('result', async job => {
    await updateTest(
      job.data.id,
      job.data.status,
      job.data.runTime,
      job.data.result.pageSummaryUrl,
      job.data.result.browsertime,
      job.data.result.har,
      job.data.failedReason
    );

    const test = await getTest(job.data.id);
    if (test) {
      const labels = {
        test_type: test.test_type,
        browser: test.browser_name,
        location: test.location
      };
      if (job.data.status === 'completed') {
        testsCompletedTotal.inc(labels);
      } else {
        testsFailedTotal.inc(labels);
      }
    }
  });
}

function registerTestRunner(serverConfig) {
  addTestRunner(serverConfig);
  for (let setup of serverConfig.setup) {
    let queueName = setup.queue;

    const queue = getExistingQueue(queueName);
    // We only add queue that do not exist
    if (!queue) {
      onMessage(queueName, 'global:active', setActiveStatus);
      onMessage(queueName, 'global:failed', setFailedStatus);
      onMessage(queueName, 'global:stalled', setStalledStatus);
      addDeviceToQueue(setup.deviceId, serverConfig.name, queueName);
    }
  }
}

async function setupTestRunnerQueue() {
  // Create the queue that handle testrunners
  processJob('testrunners', async job => {
    return new Promise(resolve => {
      // The testrunner can send three message types: start (new runner is
      // up), stop (graceful shutdown) and heartbeat (still here). A runner
      // that misses heartbeats long enough gets pruned server-side.
      if (job.data.type === 'heartbeat') {
        const known = touchTestRunner(job.data.hostname);
        // A heartbeat from an unknown hostname means the runner is alive
        // but fell out of the registry — pruned during a Redis blip, or
        // its start broadcast was lost across a server restart. The
        // runner sends its serverConfig with each heartbeat so we can
        // heal by re-registering instead of ignoring it forever.
        if (!known && job.data.serverConfig) {
          logger.info(
            'Re-registering testrunner %s from heartbeat',
            job.data.hostname
          );
          registerTestRunner(job.data.serverConfig);
        }
        return resolve();
      }
      if (job.data.type === 'start') {
        logger.info(
          'Got a new testrunner %s : %j',
          job.data.serverConfig.name,
          job.data.serverConfig
        );

        registerTestRunner(job.data.serverConfig);
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

    this.webserver = new WebServer();
    await this.webserver.start();
    await setupTestRunnerQueue();
    await setupResultQueue();
    // Periodically prune testrunners that have stopped heartbeating —
    // crashes / OOM kills / host reboots never emit a graceful stop, so
    // without this they'd stay registered forever and the metrics would
    // lie.
    this.pruneTimer = setInterval(pruneStaleTestRunners, 60_000);
    this.pruneTimer.unref();
    // Reconcile DB rows that were left at status='active' by a
    // testrunner that died before its global:stalled event reached
    // us — typically because the server itself was restarting at
    // the same time, so no listener was attached. The grace window
    // inside the helper avoids racing freshly-active jobs.
    this.reconcileTimer = setInterval(
      () =>
        reconcileStaleActiveRows().catch(error =>
          logger.error('Reconcile pass failed: %s', error.message)
        ),
      RECONCILE_INTERVAL_MS
    );
    this.reconcileTimer.unref();
    // Tell the world that we are starting
    await publish('server', 'start');
  }

  async stop() {
    logger.info('Closing down server');

    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = undefined;
    }

    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
      this.reconcileTimer = undefined;
    }

    // Stop accepting new HTTP requests and drain the in-flight ones before
    // we tear down the database pool — otherwise a request mid-query will
    // hit a closed pool and 500 just before the process exits.
    if (this.webserver) {
      try {
        await this.webserver.stop();
      } catch (error) {
        logger.error('Error during HTTP server shutdown', error);
      }
    }

    // Close the queues?

    // Close the database pool
    await DatabaseHelper.getInstance().closeConnectionPool();
  }
}
