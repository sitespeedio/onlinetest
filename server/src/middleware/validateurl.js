// middleware/validateURL.js
import validator from 'validator';
import log from 'intel';
import nconf from 'nconf';

const { isURL } = validator;

import { getText } from '../util/text.js';

const logger = log.getLogger('sitespeedio.server');

export const validateURL = (request, response, next) => {
  const testDomain = nconf.get('validTestDomains');
  const validRegEx = new RegExp(testDomain);
  // From the web or the API
  let url = request.body.url;

  if (!url && request.body._) {
    url = request.body._[0];
  }

  if (url) {
    if (url != 'undefined' && !url.includes('http')) {
      url = 'https://' + url;
    }

    if (url === 'undefined' || !isURL(url.toLowerCase())) {
      logger.error('Non valid URL %s', url);
      request.inputValidationError = getText('error.urlnotvalid', url);
      return next();
    }

    const urlObject = new URL(url);
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
  }
  next();
};
