import { getDeviceQueue, getExistingQueue } from '../queuehandler.js';
import get from 'lodash.get';
import log from 'intel';
const logger = log.getLogger('sitespeedio.server');

import { getText } from '../util/text.js';

function getQueueName(location, deviceId) {
  return getDeviceQueue(deviceId, location);
}

export const validateQueue = (request, response, next) => {
  const location = request.body.location || request.body.api.location;

  if (location) {
    const deviceId =
      request.body.deviceId ||
      get(request.body, 'browsertime.firefox.android.deviceSerial') ||
      get(request.body, 'browsertime.chrome.android.deviceSerial');

    const queueName = getQueueName(location, deviceId);

    const testRunnerQueue = getExistingQueue(queueName);

    if (!testRunnerQueue) {
      logger.info('Access to a non existing queue %s', queueName);
      request.inputValidationError = getText('error.nonexistingqueue');
      return next();
    }
    next();
  } else {
    request.inputValidationError = getText('error.missinglocation');

    return next();
  }
};
