// middleware/validateURL.js
import validator from 'validator';
import { getLogger } from '@sitespeed.io/log';
import { nconf } from '../config.js';

const { isURL } = validator;

import { getText } from '../util/text.js';

const logger = getLogger('sitespeedio.server');

export const validateURL = (request, response, next) => {
  const testDomain = nconf.get('validTestDomains');

  // If its an API call using script, do not validate the URL
  if (request.body.api && request.body.api.scripting) {
    return next();
  }

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
};
