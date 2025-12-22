import { Router } from 'express';
import { createRequire } from 'node:module';
import path from 'node:path';

import { nconf } from '../../config.js';

import { getText } from '../../util/text.js';
import { getLatestTests } from '../../database/index.js';
import { getTestByText } from '../../database/search.js';
import dayjs from 'dayjs';

const require = createRequire(import.meta.url);
const version = require('../../../package.json').version;

export const search = Router();

function shortURL(url, longVersion) {
  if (longVersion) {
    if (url.length > 100) {
      let shortUrl = url.replace(/\?.*/, '');
      url = shortUrl.slice(0, 80) + '...' + shortUrl.slice(-17);
    }
  } else {
    if (url.length > 40) {
      let shortUrl = url.replace(/\?.*/, '');
      url = shortUrl.slice(0, 20) + '...' + shortUrl.slice(-17);
    }
  }
  return url;
}

function fixScriptName(name) {
  return path.basename(name);
}

search.get('/', async function (request, response) {
  const limit = request.query.limit || nconf.get('search:resultPerPage') || 100;
  const currentPage = Number.parseInt(request.query.page, 10) || 1;
  let result = await (request.query.search === '' ||
  request.query.search === undefined
    ? getLatestTests(limit, currentPage)
    : getTestByText(request.query.search, limit, currentPage));

  const totalPages = Math.ceil(result.count / limit);
  const firstResultIndex = (currentPage - 1) * limit + 1;
  let lastResultIndex = firstResultIndex + result.result.length - 1;
  // Ensure lastResultIndex does not exceed total count
  if (lastResultIndex > result.count) {
    lastResultIndex = result.count;
  }

  response.render('search', {
    bodyId: 'search',
    title: getText('search.pagetitle'),
    description: getText('search.pagedescription'),
    getText,
    nconf,
    data: result,
    dayjs,
    shortURL,
    fixScriptName,
    search: request.query?.search || '',
    currentPage: currentPage,
    totalPages: totalPages,
    firstResultIndex,
    lastResultIndex,
    searchQuery: decodeURIComponent(request.query.search || ''),
    serverVersion: version
  });
});
