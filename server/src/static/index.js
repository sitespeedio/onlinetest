import path from 'node:path';

import { nconf } from '../config.js';
import express from 'express';

import { getLogger } from '@sitespeed.io/log';
const logger = getLogger('sitespeedio.server');

import { getBaseFilePath } from '../util/fileutil.js';

export function setupStatic(app) {
  app.use(
    '/img',
    express.static(getBaseFilePath(path.join('public', 'img')), {
      maxAge: '366 days'
    })
  );

  app.use(
    '/css',
    express.static(getBaseFilePath(path.join('public', 'css')), {
      maxAge: '366 days'
    })
  );

  app.use(
    '/js',
    express.static(getBaseFilePath(path.join('public', 'js')), {
      maxAge: '366 days'
    })
  );

  app.use(
    '/compare',
    express.static(getBaseFilePath(path.join('public', 'compare')), {
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
