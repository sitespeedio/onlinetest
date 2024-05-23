// eslint-disable-next-line unicorn/import-style
import { join } from 'node:path';

import nconf from 'nconf';
import express from 'express';

import log from 'intel';
const logger = log.getLogger('sitespeedio.server');

export function setupStatic(app) {
  app.use(
    '/img',
    express.static(join('public', 'img'), {
      maxAge: '366 days'
    })
  );

  app.use(
    '/css',
    express.static(join('public', 'css'), {
      maxAge: '366 days'
    })
  );

  app.use(
    '/js',
    express.static(join('public', 'js'), {
      maxAge: '366 days'
    })
  );

  app.use(
    '/compare',
    express.static(join('public', 'compare'), {
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
