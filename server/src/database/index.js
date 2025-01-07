import { getLogger } from '@sitespeed.io/log';

import DatabaseHelper from './databasehelper.js';

const logger = getLogger('sitespeedio.database');

const LIMITED_COLUMS =
  'id, location, test_type, run_date, browser_name, url, result_url, status, scripting_name, label, slug';

function logError(message, error) {
  if (error instanceof AggregateError) {
    for (const [index, theError] of error.errors.entries()) {
      logger.error(`${message} ${index + 1}: ${theError.message}`);
    }
  } else {
    logger.error(`${message}: ${error.message}`);
  }
}
/**
 * Save a test to the database.
 * @returns
 */
export async function saveTest(
  browser,
  url,
  location,
  test_type,
  scriptingName,
  scripting,
  label,
  slug,
  configuration,
  cliParameters
) {
  const insert =
    'INSERT INTO sitespeed_io_test_runs(added_date, browser_name, location, url, test_type, scripting_name, scripting, label, slug, configuration, cli_params) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id';
  const values = [
    new Date(),
    browser,
    location,
    url,
    test_type,
    scriptingName,
    scripting,
    label,
    slug,
    configuration,
    cliParameters
  ];

  try {
    const result = await DatabaseHelper.getInstance().query(insert, values);
    return result.rows[0].id;
  } catch (error) {
    logError('Could not save the test', error);
    throw error;
  }
}

/**
 * Update the status of the test
 */
export async function updateStatus(id, status) {
  logger.info('Update %s with %s', id, status);
  const update = 'UPDATE sitespeed_io_test_runs SET status = $1 WHERE id = $2';
  const values = [status, id];
  try {
    await DatabaseHelper.getInstance().query(update, values);
  } catch (error) {
    logError('Could not update test status by id', error);
  }
}

/**
 * Get the latests tests.
 */
export async function getLatestTests(limit, page) {
  const select =
    'SELECT ' +
    LIMITED_COLUMS +
    ' FROM sitespeed_io_test_runs ORDER BY added_date DESC LIMIT $1 OFFSET $2';
  const count = 'SELECT count(*) FROM sitespeed_io_test_runs';
  const offset = (page - 1) * limit;
  const values = [limit, offset];
  try {
    const result = await DatabaseHelper.getInstance().query(select, values);
    const numberOfHits = await DatabaseHelper.getInstance().query(count);
    return { result: result.rows, count: numberOfHits.rows[0].count };
  } catch (error) {
    logError('Could not get the latest tests', error);
  }
}

/**
 * Update a test.
 */
export async function updateTest(
  id,
  status,
  runTime,
  resultURL,
  browsertimeJSON,
  har
) {
  const update =
    'UPDATE sitespeed_io_test_runs SET status = $1, run_date = $2, result_url = $3, browsertime_result = $4,  har = $5 WHERE id = $6';

  const values = [
    status,
    runTime,
    resultURL,
    JSON.stringify(browsertimeJSON),
    JSON.stringify(har),
    id
  ];
  try {
    const result = await DatabaseHelper.getInstance().query(update, values);
    return result.rows[0];
  } catch (error) {
    logError('Could not update test by id', error);
  }
}

/**
 * Get a test by id.
 */
export async function getTest(id) {
  const insert = 'SELECT * FROM sitespeed_io_test_runs WHERE id = $1';
  const values = [id];
  try {
    const result = await DatabaseHelper.getInstance().query(insert, values);
    return result.rows[0];
  } catch (error) {
    logError('Could not get test by id', error);
  }
}

/**
 * Get a HAR file by a test id.
 */
export async function getTestHar(id) {
  const getHar = 'SELECT har FROM sitespeed_io_test_runs WHERE id = $1';
  const values = [id];
  try {
    const result = await DatabaseHelper.getInstance().query(getHar, values);
    return result.rows[0];
  } catch (error) {
    logError('Could not get the HAR by id', error);
  }
}

export async function testConnection(retries = 3, delay = 5000) {
  const test = 'SELECT 1 FROM sitespeed_io_test_runs';
  try {
    const databaseHelper = DatabaseHelper.getInstance();
    const result = await databaseHelper.query(test);
    return result.rows[0];
  } catch (error) {
    logError(
      `Could not get a connection to the database (retries ${retries})`,
      error
    );

    if (retries > 0) {
      logger.error(
        `Retrying in ${delay / 1000} seconds... (${retries} retries left)`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
      return testConnection(retries - 1, delay);
    } else {
      throw error;
    }
  }
}
