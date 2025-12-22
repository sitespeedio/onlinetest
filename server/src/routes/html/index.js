import { Router } from 'express';
import { createRequire } from 'node:module';

import { nconf } from '../../config.js';
import { getLogger } from '@sitespeed.io/log';

import { getTestRunners } from '../../testrunners.js';
import { addTest, reRunTest } from '../../util/add-test.js';
import { updateLabel } from '../../database/index.js';
import { getText } from '../../util/text.js';

import { validateURL } from '../../middleware/validateurl.js';
import { validateScripting } from '../../middleware/validatescripting.js';
import { validateParameters } from '../../middleware/validateparameters.js';
import { validateQueue } from '../../middleware/validatequeue.js';
import { getQueueSize } from '../../queuehandler.js';

export const index = Router();
const logger = getLogger('sitespeedio.server');

const require = createRequire(import.meta.url);
const version = require('../../../package.json').version;

index.get('/', async function (request, response) {
  try {
    const testDomain = nconf.get('validTestDomains');
    const testRunners = getTestRunners();
    const queueNamesAndSize = {};
    for (const runner of testRunners) {
      for (const setup of runner.setup) {
        queueNamesAndSize[setup.queue] = await getQueueSize(setup.queue);
      }
    }
    response.render('index', {
      bodyId: 'index',
      title: getText('index.pagetitle'),
      description: getText('index.pagedescription'),
      serverConfig: testRunners,
      testDomains: testDomain,
      nconf,
      getText,
      queueNamesAndSize,
      serverVersion: version
    });
  } catch {
    response.render('500', {
      title: '500: Something is broken?',
      description: '500',
      message: 'The queue system is down, check your logs',
      nconf,
      getText
    });
  }
});

index.post(
  '/',
  validateURL,
  (request, response, next) => {
    if (request.inputValidationError) {
      return response.render('error', {
        message: request.inputValidationError,
        nconf,
        getText
      });
    }
    if (request.body.id) {
      return next('route');
    }

    return next();
  },
  validateParameters,
  validateScripting,
  validateQueue,
  async function (request, response) {
    if (request.inputValidationError) {
      return response.render('error', {
        message: request.inputValidationError,
        nconf,
        getText
      });
    }
    let url = request.body.url;
    const id = await addTest(request);
    logger.info('New URL %s with id %s', url, id);
    return response.redirect('/result/' + id);
  }
);

index.post('/', async (request, response) => {
  // Add validation that we have an id
  // const { id } = request.body;
  try {
    const newId = await reRunTest(request);
    return response.redirect(`/result/${newId}`);
  } catch (error) {
    return response.render('error', {
      message: error,
      nconf,
      getText
    });
  }
});

index.post('/update', async (request, response) => {
  const id = request.body.id;
  const label = request.body.label;
  try {
    await updateLabel(id, label);
    return response.redirect(`/search/`);
  } catch (error) {
    return response.render('error', {
      message: error,
      nconf,
      getText
    });
  }
});
