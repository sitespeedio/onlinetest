import dayjs from 'dayjs';
import { getLogger } from '@sitespeed.io/log';

import DatabaseHelper from './databasehelper.js';

const logger = getLogger('sitespeedio.database.search');

const LIMITED_COLUMS =
  'id, location, test_type, run_date, added_date, connectivity, browser_name, url, result_url, status, scripting_name, label, slug';

/**
 *  Get a test by text (searching).
 */
export async function getTestByText(text, limit, page) {
  const searchData = help(text);
  const { where, parameters } = generateMatch(searchData);

  const offset = (page - 1) * limit;

  if (
    parameters.length === 0 && // actually we should always have some text
    text
  ) {
    where.push('url ILIKE $1 OR scripting_name ILIKE $1');
    parameters.push(`%${text}%`);
  }

  const select =
    'SELECT ' +
    LIMITED_COLUMS +
    ' FROM sitespeed_io_test_runs where ' +
    where.join(' AND ') +
    ' ORDER BY added_date DESC LIMIT $' +
    (parameters.length + 1) +
    ' OFFSET $' +
    (parameters.length + 2);

  const count =
    'SELECT count(*) FROM sitespeed_io_test_runs where ' + where.join(' AND ');

  try {
    const numberOfHits = await DatabaseHelper.getInstance().query(
      count,
      parameters
    );
    parameters.push(limit, offset);
    const result = await DatabaseHelper.getInstance().query(select, parameters);
    return { result: result.rows, count: numberOfHits.rows[0].count };
  } catch (error) {
    logger.error('Could not get test by text ', error);
    logger.error(select);
  }
}

function generateMatch(parameters) {
  const where = [];
  const parameters_ = [];

  if (parameters.urlPerfectMatch) {
    where.push('url = $' + (parameters_.length + 1));
    parameters_.push(parameters.urlPerfectMatch);
  } else if (parameters.url) {
    where.push('url ILIKE $' + (parameters_.length + 1));
    const likeMatch = parameters.url.startsWith('http')
      ? `${parameters.url}%`
      : `%${parameters.url}%`;

    parameters_.push(likeMatch);
  }

  if (parameters.browser) {
    where.push('browser_name = $' + (parameters_.length + 1));
    parameters_.push(parameters.browser.toLowerCase());
  }

  if (parameters.location) {
    where.push('location = $' + (parameters_.length + 1));
    parameters_.push(parameters.location);
  }

  if (parameters.label) {
    where.push('label = $' + (parameters_.length + 1));
    parameters_.push(parameters.label);
  }

  if (parameters.slug) {
    where.push('slug = $' + (parameters_.length + 1));
    parameters_.push(parameters.slug);
  }

  if (parameters.scriptingName) {
    where.push('scripting_name = $' + (parameters_.length + 1));
    parameters_.push(parameters.scriptingName);
  }

  if (parameters.date) {
    where.push('DATE(run_date) = $' + (parameters_.length + 1));
    if (parameters.date.toLowerCase() === 'today') {
      parameters_.push(dayjs().format('YYYY-MM-DD'));
    } else if (parameters.date.toLowerCase() === 'yesterday') {
      parameters_.push(dayjs().subtract(1, 'day').format('YYYY-MM-DD'));
    } else {
      parameters_.push(parameters.date);
    }
  }

  if (parameters.when) {
    switch (parameters.when) {
      case 'lasthour': {
        where.push('run_date >= $' + (parameters_.length + 1));
        parameters_.push(dayjs().subtract(1, 'hour').toISOString());
        break;
      }
      case 'today': {
        where.push('DATE(run_date) = $' + (parameters_.length + 1));
        parameters_.push(dayjs().format('YYYY-MM-DD'));
        break;
      }
      case 'yesterday': {
        where.push('DATE(run_date) = $' + (parameters_.length + 1));
        parameters_.push(dayjs().subtract(1, 'day').format('YYYY-MM-DD'));

        break;
      }
      case 'lastweek': {
        where.push('DATE(run_date) > $' + (parameters_.length + 1));
        parameters_.push(dayjs().subtract(1, 'week').format('YYYY-MM-DD'));

        break;
      }
      case 'lastmonth': {
        where.push('DATE(run_date) > $' + (parameters_.length + 1));
        parameters_.push(dayjs().subtract(1, 'month').format('YYYY-MM-DD'));

        break;
      }
      // No default
    }
  }

  if (parameters.testType) {
    where.push('test_type = $' + (parameters_.length + 1));
    parameters_.push(parameters.testType);
  }

  if (parameters.before) {
    where.push('DATE(run_date) < $' + (parameters_.length + 1));
    parameters_.push(parameters.before);
  }

  if (parameters.after) {
    where.push('DATE(run_date) > $' + (parameters_.length + 1));
    parameters_.push(parameters.after);
  }

  return { where, parameters: parameters_, limit: parameters.limit };
}

function help(searchText) {
  let date,
    before,
    after,
    when,
    location,
    urlPerfectMatch,
    url,
    testType,
    browser,
    label,
    slug,
    scriptingName,
    limit;

  const dateMatch = searchText.match(
    /date:\s*((\d{4}-\d{2}-\d{2})|today|yesterday)/
  );
  const beforeMatch = searchText.match(/before:\s*(\d{4}-\d{2}-\d{2})/);
  const afterMatch = searchText.match(/after:\s*(\d{4}-\d{2}-\d{2})/);
  const whenMatch = searchText.match(
    /when:\s*(.*?)(?=(date:|before:|after:|testType:|browser:|name:|slug:|label:|http|$))/s
  );
  const locationMatch = searchText.match(
    /location:\s*(.*?)(?=(date:|before:|after:|testType:|browser:|name:|label:|slug:|w:|when:|http|$))/s
  );
  const urlMatchPerfect = searchText.match(/(http\S*)/);
  const urlMatch = searchText.match(
    /url:\s*(.*?)(?=(date:|before:|after:|location:|browser:|name:|label:|slug:|when:|$))/s
  );
  const testTypeMatch = searchText.match(
    /testType:\s*(.*?)(?=(date:|before:|after:|location:|browser:|name:|label:|slug:|when:|http|$))/s
  );
  const browserMatch = searchText.match(
    /browser:\s*(.*?)(?=(date:|before:|after:|location:|testType:|name:|label:|slug:|when:|http|$))/s
  );
  const labelMatch = searchText.match(
    /label:\s*(.*?)(?=(date:|before:|after:|location:|testType:|browser:|name:|when:|http|$))/s
  );
  const scriptingNameMatch = searchText.match(
    /name:\s*(.*?)(?=(date:|before:|after:|location:|testType:|browser:|label:|slug:|when:|http|$))/s
  );

  const slugMatch = searchText.match(
    /slug:\s*(.*?)(?=(date:|before:|after:|location:|testType:|browser:|name:|when:|http|$))/s
  );

  const limitMatch = searchText.match(/limit:\s*(\d+)/);

  if (dateMatch) {
    date = dateMatch[1];
  }

  if (beforeMatch) {
    before = beforeMatch[1];
  }

  if (afterMatch) {
    after = afterMatch[1];
  }

  if (locationMatch) {
    location = locationMatch[1].trim();
  }

  limit = limitMatch ? limitMatch[1] : 100;

  if (urlMatch) {
    url = urlMatch[1].trim();
  } else if (urlMatchPerfect) {
    urlPerfectMatch = urlMatchPerfect[1].trim();
  }

  if (testTypeMatch) {
    testType = testTypeMatch[1].trim();
  }

  if (whenMatch) {
    when = whenMatch[1].trim();
  }

  if (browserMatch) {
    browser = browserMatch[1].trim();
  }

  if (labelMatch) {
    label = labelMatch[1].trim();
  }

  if (slugMatch) {
    slug = slugMatch[1].trim();
  }

  if (scriptingNameMatch) {
    scriptingName = scriptingNameMatch[1].trim();
  }

  return {
    date,
    location,
    before,
    after,
    when,
    url,
    urlPerfectMatch,
    testType,
    browser,
    label,
    slug,
    scriptingName,
    limit
  };
}
