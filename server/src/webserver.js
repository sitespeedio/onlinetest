import http from 'node:http';
import { createSecureServer } from 'node:http2';

import path from 'node:path';
import { createRequire } from 'node:module';

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
import { register, httpRequestDuration, httpRequestsTotal } from './metrics.js';

const logger = getLogger('sitespeedio.server');

const KNOWN_PREFIXES = [
  '/api',
  '/result',
  '/search',
  '/admin',
  '/compare-redirect'
];

function normalizeRoute(path) {
  for (const prefix of KNOWN_PREFIXES) {
    if (path.startsWith(prefix)) {
      return prefix;
    }
  }
  if (
    path.startsWith('/img/') ||
    path.startsWith('/css/') ||
    path.startsWith('/js/')
  ) {
    return '/static';
  }
  return path === '/' ? '/' : '/other';
}

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

  app.use((request, response, next) => {
    if (request.path === '/metrics') {
      return next();
    }
    const end = httpRequestDuration.startTimer();
    response.on('finish', () => {
      const route = request.route?.path || normalizeRoute(request.path);
      const labels = {
        method: request.method,
        route,
        status_code: response.statusCode
      };
      end(labels);
      httpRequestsTotal.inc(labels);
    });
    next();
  });

  app.get('/metrics', async (request, response) => {
    response.set('Content-Type', register.contentType);
    response.end(await register.metrics());
  });

  app.use(minify);
  app.use(express.json());

  app.set('view engine', 'pug');
  app.set('views', path.resolve(getBaseFilePath('./views')));

  // Make the server version available to every pug render so the
  // theme CSS / admin CSS link tags can stamp a `?v=…` cache-buster
  // on their hrefs. The classic-script tags on the standalone-compare
  // pages stamp themselves at build time; the templated pug pages
  // need an in-process equivalent.
  const require = createRequire(import.meta.url);
  app.locals.serverVersion = require('../package.json').version;

  app.enable('view cache');

  // HSTS uses helmet's default (max-age=15552000; includeSubDomains). It is
  // a no-op for plain-HTTP deployments and prevents downgrade attacks for
  // HTTPS ones. CSP is transitional: inline <script> blocks still live in
  // many pug templates, so 'unsafe-inline' stays for now — but external
  // script loads and other cross-origin fetches are blocked. Tighten this
  // policy once the inline scripts are extracted into /js files.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          // Compare HARs carry absolute URLs to the screenshots, filmstrip
          // frames and video on the originating sitespeed.io result server
          // (`_meta.screenshot` / `_meta.filmstrip[].file` / `_meta.video`).
          // Allow any HTTPS origin for those media types so cross-origin
          // result servers render instead of showing empty image/video slots.
          imgSrc: ["'self'", 'data:', 'https:'],
          mediaSrc: ["'self'", 'https:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      }
    })
  );

  if (
    nconf.any('basicauth:login', 'basicAuth:login') != undefined &&
    nconf.any('basicauth:password', 'basicAuth:password') != undefined
  ) {
    logger.info('Setup basic auth');
    const genericAuth = new BasicAuth(
      nconf.any('basicauth:login', 'basicAuth:login'),
      nconf.any('basicauth:password', 'basicAuth:password'),
      'Access to the site',
      'Authentication required.',
      '/api/'
    );

    app.use((request, response, next) =>
      genericAuth.authenticate(request, response, next)
    );
  }

  const adminLogin = nconf.any(
    'admin:basicauth:login',
    'admin:basicAuth:login'
  );

  const adminPassword = nconf.any(
    'admin:basicauth:password',
    'admin:basicAuth:password'
  );

  if (adminLogin != undefined && adminPassword != undefined) {
    const adminAuth = new BasicAuth(
      adminLogin,
      adminPassword,
      'Access to admin',
      'Authentication required.'
    );

    app.use('/admin', (request, response, next) =>
      adminAuth.authenticate(request, response, next)
    );
  } else {
    logger.warn('Running /admin without basic auth');
  }

  app.use(
    urlencoded({
      // to support URL-encoded bodies
      extended: true
    })
  );

  if (nconf.any('disablegui', 'disableGUI')) {
    logger.info('Disabling GUI');
  } else {
    app.use('/', index);
  }

  if (nconf.any('disablesearchgui', 'disableSearchGUI')) {
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
      this.server = createSecureServer(sslOptions, this.app);
      this.server.listen(port, () => {
        logger.info('Web app listening on HTTPS :%s', port);
      });
    } else {
      this.server = http.createServer(this.app);
      this.server.listen(port, () => {
        logger.info('Web app listening on :%s', port);
      });
    }
  }

  // Stop accepting new connections and wait for in-flight requests to
  // finish. If they don't finish within `server.shutdown.timeoutMs`, force
  // the remaining sockets closed so the process can actually exit on a
  // rolling restart.
  async stop() {
    if (!this.server) return;
    const timeoutMs =
      nconf.any('server:shutdown:timeoutMs', 'server:shutdown:timeoutms') ??
      30_000;
    logger.info('Closing HTTP server (drain timeout %d ms)', timeoutMs);
    await new Promise(resolve => {
      let timer = setTimeout(() => {
        timer = undefined;
        logger.warn(
          'Drain timeout hit; force-closing remaining HTTP connections'
        );
        if (typeof this.server.closeAllConnections === 'function') {
          this.server.closeAllConnections();
        }
      }, timeoutMs);
      this.server.close(error => {
        if (timer) clearTimeout(timer);
        if (error) {
          logger.error('Error while closing HTTP server', error);
        } else {
          logger.info('HTTP server closed');
        }
        resolve();
      });
    });
    this.server = undefined;
  }
}
