import validator from 'validator';
import log from 'intel';
import nconf from 'nconf';

const { isURL } = validator;
const logger = log.getLogger('sitespeedio.server');

import { getText } from '../util/text.js';

export const validateScripting = (request, response, next) => {
  const testDomain = nconf.get('validTestDomains');
  let validRegEx;
  try {
    validRegEx = new RegExp(testDomain);
  } catch (error) {
    log.error('Could not use regular expression', error);
    request.inputValidationError = getText(
      'error.nonmatchingdomain',
      '',
      testDomain
    );
    return next();
  }

  if (request.body.scripting) {
    try {
      const matches = request.body.scripting.match(
        /(commands\.measure\.start|commands\.navigate)\('https?:\/\/[^\s']+'\)/g
      );
      const urls = matches.map(match => {
        const urlMatch = match.match(/'https?:\/\/[^\s']+'/);
        return urlMatch[0].slice(1, -1);
      });
      for (let url of urls) {
        if (isURL(url)) {
          const urlObject = new URL(url);
          if (validRegEx.test(urlObject.hostname) === false) {
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
        } else {
          logger.error('Non valid URL %s', url);
          request.inputValidationError = getText('error.urlnotvalid') + url;
          return next();
        }
      }
    } catch (error) {
      logger.error('Could not parse script', error);
      request.inputValidationError = getText('error.parsingscript');
      return next();
    }
  }
  next();
};
