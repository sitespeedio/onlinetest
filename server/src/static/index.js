import fs from 'node:fs';
import path from 'node:path';

import { nconf } from '../config.js';
import express from 'express';

import { getLogger } from '@sitespeed.io/log';
const logger = getLogger('sitespeedio.server');

import { getBaseFilePath } from '../util/fileutil.js';

// SYNC: testrunner/src/utility.js applies the same list to user-supplied
// extras at execution time. This copy filters the CLI picker so the same
// options are not even suggested.
const BLOCKED_FLAG_PATTERNS = [
  '--browsertime.preScript',
  '--preScript',
  '--browsertime.postScript',
  '--postScript',
  '--browsertime.userTimingAddNav',
  '--userTimingAddNav',
  '--browsertime.firefox.binaryPath',
  '--firefox.binaryPath',
  '--browsertime.chrome.binaryPath',
  '--chrome.binaryPath',
  '--browsertime.edge.binaryPath',
  '--edge.binaryPath',
  '--browsertime.safari.binaryPath',
  '--safari.binaryPath',
  '--browsertime.chrome.args',
  '--chrome.args',
  '--browsertime.firefox.args',
  '--firefox.args',
  '--browsertime.edge.args',
  '--edge.args',
  '--browsertime.firefox.preference',
  '--firefox.preference',
  '--browsertime.firefox.acceptInsecureCerts',
  '--firefox.acceptInsecureCerts',
  '--config',
  '--plugins',
  '--graphite',
  '--influxdb',
  '--datadog',
  '--s3',
  '--gcs',
  '--grafana',
  '--scp',
  '--slack',
  '--matrix',
  '--api',
  '--resultBaseURL',
  '--outputFolder',
  '--verbose',
  '-v',
  '-vv',
  '-vvv'
];

function isBlockedFlag(token) {
  if (typeof token !== 'string') return false;
  const eq = token.indexOf('=');
  const name = eq === -1 ? token : token.slice(0, eq);
  for (const p of BLOCKED_FLAG_PATTERNS) {
    if (name === p) return true;
    if (name.startsWith(p + '.')) return true;
  }
  return false;
}

let cachedFilteredHelp;
function getFilteredHelp() {
  if (cachedFilteredHelp !== undefined) return cachedFilteredHelp;
  try {
    const raw = fs.readFileSync(
      getBaseFilePath(path.join('public', 'sitespeed-help.json')),
      'utf8'
    );
    const entries = JSON.parse(raw);
    const filtered = entries.filter(
      entry => !(entry.flags || []).some(f => isBlockedFlag(f))
    );
    cachedFilteredHelp = JSON.stringify(filtered);
    logger.info(
      `Filtered sitespeed-help.json: ${entries.length} → ${filtered.length} options (blocked ${entries.length - filtered.length} for safety)`
    );
  } catch (error) {
    logger.error('Could not load sitespeed-help.json for filtering', error);
    cachedFilteredHelp = '[]';
  }
  return cachedFilteredHelp;
}

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
    '/fonts',
    express.static(getBaseFilePath(path.join('public', 'fonts')), {
      maxAge: '366 days'
    })
  );

  app.use(
    '/compare',
    express.static(getBaseFilePath(path.join('public', 'compare')), {
      maxAge: '10 minutes'
    })
  );

  app.get('/sitespeed-help.json', (request, response) => {
    response.type('application/json').send(getFilteredHelp());
  });

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
