// eslint-disable-next-line unicorn/import-style
import { join } from 'node:path';

import nconf from 'nconf';
import express from 'express';

import log from 'intel';
const logger = log.getLogger('sitespeedio.server');

import { getBaseFilePath } from '../util/fileutil.js';

export function setupStatic(app) {
  app.use(
    '/img',
    express.static(getBaseFilePath(join('public', 'img')), {
      maxAge: '366 days'
    })
  );

  app.use(
    '/css',
    express.static(getBaseFilePath(join('public', 'css')), {
      maxAge: '366 days'
    })
  );

  app.use(
    '/js',
    express.static(getBaseFilePath(join('public', 'js')), {
      maxAge: '366 days'
    })
  );

  app.use(
    '/compare',
    express.static(getBaseFilePath(join('public', 'compare')), {
      maxAge: '10 minutes'
    })
  );

  if (nconf.get('html:extras:path')) {
    logger.info(
      'Setting up extra folder /extras to ' + nconf.get('html:extras:path')
    );
    app.use(
      '/extras',
      express.static(nconf.get('html:extras:path'), {
        maxAge: '10 minutes'
      })
    );
  }
}
