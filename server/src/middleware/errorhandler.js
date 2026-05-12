import { nconf } from '../config.js';
import { getText } from '../util/text.js';

import { getLogger } from '@sitespeed.io/log';
const logger = getLogger('sitespeedio.server');

export const error404 = function (request, response) {
  response.status(400);
  response.render('404', {
    title: '404: File Not Found',
    description: '404',
    nconf,
    getText
  });
};

// Express identifies error-handling middleware by arity — the function must
// declare four parameters even though `next` is unused here, otherwise the
// renderer is registered as a regular handler and never fires on thrown errors.
// eslint-disable-next-line no-unused-vars
export const error500 = function (error, request, response, next) {
  logger.error(error.stack);
  response.status(500);
  response.render('500', {
    title: '500: Something is broken?',
    description: '500',
    nconf,
    message: error.message,
    getText
  });
};
