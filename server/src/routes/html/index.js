import { Router } from 'express';

import nconf from 'nconf';
import log from 'intel';

import { getTestRunners } from '../../testrunners.js';
import { addTest } from '../../util/add-test.js';
import { getText } from '../../util/text.js';

import { validateURL } from '../../middleware/validateurl.js';
import { validateScripting } from '../../middleware/validatescripting.js';
import { validateParameters } from '../../middleware/validateparameters.js';
import { validateQueue } from '../../middleware/validatequeue.js';
import { getQueueSize } from '../../queuehandler.js';

export const index = Router();
const logger = log.getLogger('sitespeedio.server');

index.get('/', async function (request, response) {
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
    description: getText('index.pagedescripton'),
    serverConfig: testRunners,
    testDomains: testDomain,
    nconf,
    getText,
    queueNamesAndSize
  });
});

index.post(
  '/',
  validateParameters,
  validateURL,
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
