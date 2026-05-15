import { nconf } from '../../config.js';
import { getLogger } from '@sitespeed.io/log';

import { Router } from 'express';
import { getConfigByTestId } from '../../configs.js';
import { getQueueById } from '../../queuehandler.js';
import { getText } from '../../util/text.js';

import { getTest } from '../../database/index.js';

export const result = Router();
const logger = getLogger('sitespeedio.server');

result.get('/:id', async function (request, response) {
  const id = request.params.id;
  const workQueue = getQueueById(id);
  if (workQueue) {
    const job = await workQueue.getJob(id);
    if (job) {
      const status = await job.getState();
      if (status === 'completed' || status === 'failed') {
        if (job.returnvalue.pageSummaryUrl) {
          return response.redirect(job.returnvalue.pageSummaryUrl);
        } else if (status === 'failed') {
          const { logs } = await workQueue.getJobLogs(id);
          return response.render('error', {
            status: status,
            id: id,
            logs: logs,
            nconf,
            message: getText('error.testfailed'),
            getText
          });
        } else {
          logger.error(
            'Missing resultBaseURL setup for sitespeeed.io or no result file JSON created'
          );
          logger.error('Job status:' + status);
          return response.render('error', {
            id: id,
            nconf,
            message: getText('error.missingresultbaseurl'),
            getText
          });
        }
      } else {
        const testConfig = getConfigByTestId(id);
        const count = await workQueue.count();
        let placeInQueue = 1;
        if (count > 1) {
          const jobs = await workQueue.getWaiting(0, 500);
          for (let job of jobs) {
            if (job.opts.jobId === id) {
              break;
            } else {
              placeInQueue++;
            }
          }
        }

        // Bull keeps a job in the 'active' set until its periodic
        // stalled-jobs check moves it back to 'wait' — up to
        // ~stalledInterval (default 30 s) after the worker dies.
        // During that window getState() still says 'active' even
        // though no live worker is touching it, and running.pug would
        // happily render "Streaming logs · running" over stale log
        // lines from the dead worker. Cheap inline fix: peek at the
        // job's lock key in Redis. No lock owner means the worker
        // has died and Bull hasn't caught up yet — render the
        // stalled message instead.
        let stalled = false;
        if (status === 'active') {
          try {
            const lockOwner = await workQueue.client.get(job.lockKey());
            if (!lockOwner) {
              stalled = true;
            }
          } catch (error) {
            logger.error('Lock probe failed for %s: %s', id, error.message);
          }
        }

        let message;
        if (stalled) {
          message = getText('index.stalledretrying');
        } else if (count > 1) {
          message = getText('index.inqueue', count, placeInQueue);
        } else {
          message = getText('index.waitingtorunnext');
        }

        response.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.header('Pragma', 'no-cache');
        response.header('Expires', 0);
        return response.render('running', {
          status: stalled ? 'stalled' : status,
          message,
          id: id,
          url: testConfig.url,
          nconf,
          getText
        });
      }
    } else {
      return response.render('error', {
        id: id,
        nconf,
        message: getText('error.validation.nomatchingtestwithid', id),
        getText
      });
    }
  } else {
    const testResult = await getTest(id);
    if (!testResult) {
      return response.render('error', {
        id: id,
        nconf,
        message: getText('error.validation.nomatchingtestwithid', id),
        getText
      });
    } else if (
      testResult.status === 'completed' ||
      testResult.status === 'failed'
    ) {
      if (testResult.result_url) {
        return response.redirect(testResult.result_url);
      } else if (testResult.status === 'failed') {
        return response.render('error', {
          status: testResult,
          id: id,
          logs: [],
          nconf,
          message: getText('error.testfailed'),
          getText
        });
      } else {
        logger.error(
          'Missing resultBaseURL setup for sitespeeed.io or no result JSON created'
        );
        return response.render('error', {
          id: id,
          nconf,
          message: getText('error.missingresultbaseurl'),
          getText
        });
      }
    } else {
      response.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.header('Pragma', 'no-cache');
      response.header('Expires', 0);
      return response.render('running', {
        status: testResult.status,
        message: '',
        id: id,
        url: testResult.url,
        nconf,
        getText
      });
    }
  }
});
