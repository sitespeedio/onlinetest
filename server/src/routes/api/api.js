import { Router } from 'express';
import { getLogger } from '@sitespeed.io/log';

import { createRequire } from 'node:module';

import { getConfigByTestId } from '../../configs.js';
import { getQueueById } from '../../queuehandler.js';
import { getTest, getTestHar } from '../../database/index.js';

import { validateKey } from '../../middleware/validatekey.js';
import { validateURL } from '../../middleware/validateurl.js';
import { validateParameters } from '../../middleware/validateparameters.js';

import { addTestFromAPI } from '../../util/add-test.js';
import { getTestRunners } from '../../testrunners.js';
import { getText } from '../../util/text.js';
import { validateQueue } from '../../middleware/validatequeue.js';
const logger = getLogger('sitespeedio.server.api');

const require = createRequire(import.meta.url);
const version = require('../../../package.json').version;

/**
 * Routes for the API. sitespeed.io CLI can call the API to add your own test.
 */

export const api = Router();

api.get('/', function (request, response) {
  response.json({
    message: `The sitespeed.io online API version: ${version} `
  });
});

/**
 * Get all different test runners
 */
api.get('/testRunners', async function (request, response) {
  response.json(getTestRunners());
});

/**
 * Get the HAR file for a test.
 */
api.get('/har/:testId', async function (request, response) {
  const id = request.params.testId;
  const har = await getTestHar(id);
  return har
    ? response.json(har.har)
    : response.status(400).json({
        id: id,
        message: 'There are no HAR for test id ' + id
      });
});

/**
 * Get the status of a test
 */
api.get('/status/:testId', async function (request, response) {
  const id = request.params.testId;
  const workQueue = getQueueById(id);
  if (!workQueue) {
    // if we don't have a queue for a test someone possible is trying to get
    // an old result, lets check the database
    const testResult = await getTest(id);
    return testResult
      ? response.json({
          status: testResult.status,
          logs: [],
          url: testResult.url,
          scriptingName: testResult.scripting_name,
          message: '',
          result: testResult.status === 'completed' ? testResult.result_url : ''
        })
      : response.status(400).json({
          id: id,
          message: getText('error.validation.nomatchingtestwithid', id)
        });
  }
  const job = await workQueue.getJob(id);

  if (!job) {
    const testResult = await getTest(id);
    return testResult
      ? response.json({
          status: testResult.status,
          logs: [],
          url: testResult.url,
          scriptingName: testResult.scripting_name,
          message: '',
          result: testResult.status === 'completed' ? testResult.result_url : ''
        })
      : response.status(400).json({
          id: id,
          message: getText('error.validation.nomatchingtestwithid', id)
        });
  }
  const status = await job.getState();
  const testConfig = getConfigByTestId(id);

  const { logs } = await workQueue.getJobLogs(id);

  logger.debug(`Status of job ${id} is ${status}`);
  let message = '';
  let resultUrl;
  switch (status) {
    case 'waiting': {
      const count = await workQueue.count();
      let placeInQueue = 1;
      if (count > 1) {
        const jobs = await workQueue.getWaiting(0, 100);
        for (let job of jobs) {
          if (job.opts.jobId === id) {
            break;
          } else {
            placeInQueue++;
          }
        }
      }
      message =
        count > 1
          ? getText('index.inqueue', count, placeInQueue)
          : getText('index.waitingtorunnext');

      break;
    }
    case 'completed': {
      logger.info('Job %s completed for %s', id, testConfig.url);

      message = 'Job completed.';
      resultUrl = job.returnvalue.pageSummaryUrl;
      break;
    }
    case 'active': {
      message = `Test ${id} is running.`;

      break;
    }
    case 'failed': {
      message = `Test ${id} failed.`;
      break;
    }
    // No default
  }
  response.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.header('Pragma', 'no-cache');
  response.header('Expires', 0);

  // Make sure we have the status updated in the database
  response.json({
    status: status,
    logs: logs,
    url: testConfig.url,
    scriptingName: testConfig.scriptingName,
    message: message,
    result: status === 'completed' ? resultUrl : ''
  });
});

/**
 * Add a new test
 */
api.post(
  '/add',
  validateKey,
  validateParameters,
  validateURL,
  validateQueue,
  async function (request, response) {
    if (request.inputValidationError) {
      return response
        .status(400)
        .json({ message: request.inputValidationError });
    }

    try {
      const userConfig = request.body;
      let url = userConfig._[0];
      let scripting = userConfig.api.scripting;
      let testType = userConfig.api.testType;
      let scriptingName = userConfig.api.scriptingName;
      let label = userConfig.api.label;
      let priority = userConfig.api.priority;
      let container = userConfig.api.dockerContainer;

      const location = userConfig.api.location;

      // We have the API info we need so we can remove it to make sure sitespeed.io
      // do not end up in an loop that keeps on calling itself
      delete userConfig.api;

      const id = await addTestFromAPI(
        userConfig,
        location,
        url,
        scripting,
        scriptingName,
        label,
        testType,
        priority,
        container
      );
      response.json({ id });
    } catch (error) {
      // make sure we catch everything and return some kind of error message
      return response.status(500).json({ message: error.message });
    }
  }
);
