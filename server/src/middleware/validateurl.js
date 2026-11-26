// middleware/validateURL.js
import validator from 'validator';
import { getLogger } from '@sitespeed.io/log';
import { nconf } from '../config.js';

const { isURL } = validator;

import { getText } from '../util/text.js';

const logger = getLogger('sitespeedio.server');

function checkURL(request, next, checkDomain) {
  const testDomain = nconf.any('valid:test:domains', 'validTestDomains');

  // From the web or the API
  let url = request.body.url;
  if (!url && request.body._) {
    url = request.body._[0];
  }

  if (url) {
    if (url != 'undefined' && !url.includes('http')) {
      url = 'https://' + url;
    }

    if (url === 'undefined' || !isURL(url)) {
      logger.error('Non valid URL %s', url);
      request.inputValidationError = getText('error.urlnotvalid', url);
      return next();
    }

    if (!checkDomain) {
      return next();
    }

    const urlObject = new URL(url);
    try {
      const validRegEx = new RegExp(testDomain);
      if (!validRegEx.test(urlObject.hostname)) {
        logger.error(
          'Non valid domain %s matching regex for url %s',
          urlObject.hostname,
          url
        );
        request.inputValidationError = getText(
          'error.nonmatchingdomain',
          url,
          testDomain
        );

        return next();
      }
    } catch (error) {
      logger.error('Could not use the regular expression', error);
      request.inputValidationError = getText(
        'error.nonmatchingdomain',
        url,
        testDomain
      );
    }
  }
  next();
}

export const validateURL = (request, response, next) =>
  checkURL(request, next, true);

// The API key already gives full control of the test configuration, so the
// domain check adds no protection for the API.
export const validateURLForAPI = (request, response, next) =>
  checkURL(request, next, false);
