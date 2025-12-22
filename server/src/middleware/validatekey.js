import { nconf } from '../config.js';
import { getLogger } from '@sitespeed.io/log';
const logger = getLogger('sitespeedio.server');
import { getText } from '../util/text.js';

export const validateKey = (request, response, next) => {
  // If a key is setup, verify it
  const key = nconf.get('api:key');
  if (key !== null) {
    const keyFromRequest = request.body.api.key;
    if (keyFromRequest != key) {
      logger.info('Wrong key from request:' + keyFromRequest);
      return response.status(403).json({
        message: keyFromRequest
          ? getText('error.keynotvalid', keyFromRequest)
          : getText('error.missingkey')
      });
    }
  }
  next();
};
