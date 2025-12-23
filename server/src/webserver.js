import http from 'node:http';
import { createSecureServer } from 'node:http2';

import path from 'node:path';

import express from 'express';
import helmet from 'helmet';
import compress from 'compression';
import bodyParser from 'body-parser';
import { nconf } from './config.js';
import { getLogger } from '@sitespeed.io/log';
const { urlencoded } = bodyParser;
import responseTime from 'response-time';
import { minify as _minify } from 'express-beautify';
import fs from 'node:fs';

import { index } from './routes/html/index.js';
import { admin } from './routes/html/admin/index.js';
import { result } from './routes/html/result.js';
import { search } from './routes/html/search.js';
import { har } from './routes/html/har.js';
import { api } from './routes/api/api.js';

import { BasicAuth } from './middleware/basicauth.js';
import { error404, error500 } from './middleware/errorhandler.js';
import { setupStatic } from './static/index.js';
import { getBaseFilePath } from './util/fileutil.js';

const logger = getLogger('sitespeedio.server');

function setupExpressServer() {
  const app = express();

  const minify = _minify({
    collapseWhitespace: true,
    minifyCSS: true,
    minifyJS: true,
    removeAttributeQuotes: true,
    removeComments: true
  });

  app.use(compress());
  app.use(responseTime());
  app.use(minify);
  app.use(express.json());

  app.set('view engine', 'pug');
  app.set('views', path.resolve(getBaseFilePath('./views')));

  app.enable('view cache');

  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP
      hsts: false // Disable HTTP Strict Transport Security
    })
  );

  if (
    nconf.get('basicAuth:login') != undefined &&
    nconf.get('basicAuth:password') != undefined
  ) {
    logger.info('Setup basic auth');
    const genericAuth = new BasicAuth(
      nconf.get('basicAuth:login'),
      nconf.get('basicAuth:password'),
      'Access to the site',
      'Authentication required.',
      '/api/'
    );

    app.use((request, response, next) =>
      genericAuth.authenticate(request, response, next)
    );
  }

  const adminAuth = new BasicAuth(
    nconf.get('admin:basicAuth:login'),
    nconf.get('admin:basicAuth:password'),
    'Access to admin',
    'Authentication required.'
  );

  app.use('/admin', (request, response, next) =>
    adminAuth.authenticate(request, response, next)
  );

  app.use(
    urlencoded({
      // to support URL-encoded bodies
      extended: true
    })
  );

  if (nconf.get('disableGUI')) {
    logger.info('Disabling GUI');
  } else {
    app.use('/', index);
  }

  if (nconf.get('disableSearchGUI')) {
    logger.info('Disabling search');
  } else {
    app.use('/search', search);
  }

  app.use('/admin', admin);
  app.use('/result/', result);
  app.use('/api', api);
  app.use('/compare-redirect', har);

  setupStatic(app);

  app.use(error404);
  app.use(error500);

  return app;
}

export class WebServer {
  constructor() {}

  async start() {
    this.app = setupExpressServer();
    const port = nconf.get('server:port');

    if (
      nconf.get('server:ssl:key') != undefined &&
      nconf.get('server:ssl:cert') != undefined
    ) {
      const sslOptions = {
        key: fs.readFileSync(nconf.get('server:ssl:key')),
        cert: fs.readFileSync(nconf.get('server:ssl:cert'))
      };
      const server = createSecureServer(sslOptions, this.app);
      server.listen(3000, () => {
        logger.info('Web app listening on HTTPS :%s', port);
      });
    } else {
      http.createServer(this.app).listen(port, () => {
        logger.info('Web app listening on :%s', port);
      });
    }
  }

  async stop() {
    await this.app.close();
  }
}
