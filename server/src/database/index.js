import { getLogger } from '@sitespeed.io/log';

import DatabaseHelper from './databasehelper.js';

const logger = getLogger('sitespeedio.database');

const LIMITED_COLUMS =
  'id, location, test_type, run_date, added_date, connectivity, browser_name, url, result_url, status, scripting_name, label, slug';

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
 * Update the status of the test. When the new status is terminal
 * (completed/failed) we also stamp finished_date so we can measure
 * end-to-end duration; for failed transitions we capture the reason
 * (Bull failedReason, caught error, etc.) so /admin can surface it
 * without having to round-trip through Bull's retained-failures list.
 */
export async function updateStatus(id, status, reason) {
  logger.info('Update %s with %s', id, status);
  let update;
  let values;
  if (status === 'failed') {
    update =
      'UPDATE sitespeed_io_test_runs SET status = $1, finished_date = NOW(), failed_reason = $2 WHERE id = $3';
    values = [status, reason || undefined, id];
  } else if (status === 'completed') {
    update =
      'UPDATE sitespeed_io_test_runs SET status = $1, finished_date = NOW() WHERE id = $2';
    values = [status, id];
  } else {
    update = 'UPDATE sitespeed_io_test_runs SET status = $1 WHERE id = $2';
    values = [status, id];
  }
  try {
    await DatabaseHelper.getInstance().query(update, values);
  } catch (error) {
    logError('Could not update test status by id', error);
  }
}

/**
 * IDs of tests stuck at status='active' for longer than the given
 * grace window. Used by the periodic reconcile pass to find rows that
 * a dead testrunner left behind — a healthy worker updates the row
 * within seconds, so anything still 'active' minutes later is a
 * candidate to re-check against Bull's actual state.
 */
export async function getStaleActiveTestIds(graceMinutes) {
  const select = `SELECT id FROM sitespeed_io_test_runs
                   WHERE status = 'active'
                     AND added_date < NOW() - ($1 || ' minutes')::interval`;
  try {
    const result = await DatabaseHelper.getInstance().query(select, [
      String(graceMinutes)
    ]);
    return result.rows.map(row => row.id);
  } catch (error) {
    logError('Could not list stale active tests', error);
    return [];
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
 * Update the label of a test.
 */
export async function updateLabel(id, label) {
  const update = 'UPDATE sitespeed_io_test_runs SET label = $1 WHERE id = $2';

  const values = [label, id];
  try {
    const result = await DatabaseHelper.getInstance().query(update, values);
    return result.rows[0];
  } catch (error) {
    logError('Could not update label for id', error);
  }
}

/**
 * Update a test. failedReason is the testrunner-supplied explanation
 * (exit code + tail of stderr) when status='failed'; for 'completed'
 * runs it is undefined and the column stays NULL.
 */
export async function updateTest(
  id,
  status,
  runTime,
  resultURL,
  browsertimeJSON,
  har,
  failedReason
) {
  // finished_date = NOW() captures the wall-clock time the result
  // landed in the DB; pair with added_date / run_date to measure queue
  // wait and run duration.
  const update =
    'UPDATE sitespeed_io_test_runs SET status = $1, run_date = $2, result_url = $3, browsertime_result = $4,  har = $5, finished_date = NOW(), failed_reason = $6 WHERE id = $7';

  const values = [
    status,
    runTime,
    resultURL,
    JSON.stringify(browsertimeJSON),
    JSON.stringify(har),
    failedReason || undefined,
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
 * Get the browsertime result for a test id.
 */
export async function getTestBrowsertime(id) {
  const query =
    'SELECT browsertime_result FROM sitespeed_io_test_runs WHERE id = $1';
  const values = [id];
  try {
    const result = await DatabaseHelper.getInstance().query(query, values);
    return result.rows[0];
  } catch (error) {
    logError('Could not get the browsertime result by id', error);
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

/**
 * Most-recent failed test runs within the last 24 h, ordered newest-first.
 * Bounded to the same 24 h window as the health pill so the table and the
 * pill always agree on what counts as "recent" — unlike Bull's retained-
 * failures list, which accumulates indefinitely and never decays.
 */
export async function getRecentFailures(limit) {
  const select =
    "SELECT id, location, url, scripting_name, label, failed_reason, finished_date FROM sitespeed_io_test_runs WHERE status = 'failed' AND finished_date >= NOW() - INTERVAL '24 hours' ORDER BY finished_date DESC LIMIT $1";
  try {
    const result = await DatabaseHelper.getInstance().query(select, [limit]);
    return result.rows;
  } catch (error) {
    logError('Could not get recent failures', error);
    return [];
  }
}

// Cheap one-shot DB ping for the admin health banner. Unlike
// testConnection() (which retries with a 5s delay and is meant for
// startup), this returns false fast on any failure so it won't stall
// the admin page when Postgres is down.
export async function isDatabaseHealthy() {
  try {
    const databaseHelper = DatabaseHelper.getInstance();
    await databaseHelper.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// Admin-page statistics: status breakdowns over 24 h and 7 d plus
// hourly buckets for the activity chart. Cached for STATS_CACHE_TTL_MS
// so the 15-second admin auto-refresh doesn't punish Postgres — the
// numbers don't move fast enough to warrant a fresh query every tick.
const STATS_CACHE_TTL_MS = 60_000;
let statsCache;
let statsCachedAt = 0;

function emptyStatusTally() {
  return { total: 0, completed: 0, failed: 0, active: 0, queued: 0, other: 0 };
}

const HOUR_MS = 3_600_000;

function emptyStats() {
  const buckets = [];
  const startHour = new Date();
  startHour.setMinutes(0, 0, 0);
  for (let index = 23; index >= 0; index--) {
    const t = new Date(startHour.getTime() - index * HOUR_MS);
    buckets.push({
      label: String(t.getHours()).padStart(2, '0'),
      completed: 0,
      failed: 0,
      other: 0,
      total: 0
    });
  }
  return {
    lastHour: emptyStatusTally(),
    last24h: emptyStatusTally(),
    last7d: emptyStatusTally(),
    last30d: emptyStatusTally(),
    hourly: buckets,
    hourlyByLocation: {}
  };
}

function tallyStatusRows(rows) {
  const tally = emptyStatusTally();
  for (const row of rows) {
    const n = Number(row.count) || 0;
    tally.total += n;
    switch (row.status) {
      case 'completed': {
        tally.completed = n;
        break;
      }
      case 'failed': {
        tally.failed = n;
        break;
      }
      case 'active': {
        tally.active = n;
        break;
      }
      case 'queued': {
        tally.queued = n;
        break;
      }
      default: {
        tally.other += n;
      }
    }
  }
  return tally;
}

// Per-location 24 h sparklines: one 24-element array of total counts
// (all statuses summed) keyed by `location`. Drives the inline trend
// preview on each queue row in /admin. We aggregate across status here
// because the sparkline is a "is this queue alive?" indicator — a
// 60×16 SVG isn't the place to read off completed vs. failed split.
function buildHourlyByLocation(rows) {
  const byLocHour = {};
  for (const row of rows) {
    const loc = row.location;
    if (!loc) continue;
    const t = row.hour instanceof Date ? row.hour : new Date(row.hour);
    const key = t.toISOString();
    if (!byLocHour[loc]) byLocHour[loc] = {};
    byLocHour[loc][key] = (byLocHour[loc][key] || 0) + (Number(row.count) || 0);
  }
  const startHour = new Date();
  startHour.setMinutes(0, 0, 0);
  const result = {};
  for (const [loc, hours] of Object.entries(byLocHour)) {
    const buckets = [];
    for (let index = 23; index >= 0; index--) {
      const t = new Date(startHour.getTime() - index * HOUR_MS);
      buckets.push(hours[t.toISOString()] || 0);
    }
    result[loc] = buckets;
  }
  return result;
}

function buildHourlyBuckets(rows) {
  const byHour = {};
  for (const row of rows) {
    const t = row.hour instanceof Date ? row.hour : new Date(row.hour);
    const key = t.toISOString();
    if (!byHour[key]) {
      byHour[key] = { completed: 0, failed: 0, other: 0 };
    }
    const n = Number(row.count) || 0;
    switch (row.status) {
      case 'completed': {
        byHour[key].completed += n;
        break;
      }
      case 'failed': {
        byHour[key].failed += n;
        break;
      }
      default: {
        byHour[key].other += n;
      }
    }
  }
  const buckets = [];
  const startHour = new Date();
  startHour.setMinutes(0, 0, 0);
  for (let index = 23; index >= 0; index--) {
    const t = new Date(startHour.getTime() - index * HOUR_MS);
    const key = t.toISOString();
    const entry = byHour[key] || { completed: 0, failed: 0, other: 0 };
    buckets.push({
      label: String(t.getHours()).padStart(2, '0'),
      completed: entry.completed,
      failed: entry.failed,
      other: entry.other,
      total: entry.completed + entry.failed + entry.other
    });
  }
  return buckets;
}

export async function getStatistics() {
  const now = Date.now();
  if (statsCache && now - statsCachedAt < STATS_CACHE_TTL_MS) {
    return statsCache;
  }
  try {
    const databaseHelper = DatabaseHelper.getInstance();
    const [
      lastHourResult,
      last24hResult,
      last7dResult,
      last30dResult,
      hourlyResult
    ] = await Promise.all([
      databaseHelper.query(
        `SELECT status, COUNT(*)::int AS count
           FROM sitespeed_io_test_runs
          WHERE added_date >= NOW() - INTERVAL '1 hour'
          GROUP BY status`
      ),
      databaseHelper.query(
        `SELECT status, COUNT(*)::int AS count
           FROM sitespeed_io_test_runs
          WHERE added_date >= NOW() - INTERVAL '24 hours'
          GROUP BY status`
      ),
      databaseHelper.query(
        `SELECT status, COUNT(*)::int AS count
           FROM sitespeed_io_test_runs
          WHERE added_date >= NOW() - INTERVAL '7 days'
          GROUP BY status`
      ),
      databaseHelper.query(
        `SELECT status, COUNT(*)::int AS count
           FROM sitespeed_io_test_runs
          WHERE added_date >= NOW() - INTERVAL '30 days'
          GROUP BY status`
      ),
      databaseHelper.query(
        `SELECT date_trunc('hour', added_date) AS hour,
                location,
                status,
                COUNT(*)::int AS count
           FROM sitespeed_io_test_runs
          WHERE added_date >= NOW() - INTERVAL '24 hours'
          GROUP BY hour, location, status
          ORDER BY hour`
      )
    ]);
    statsCache = {
      lastHour: tallyStatusRows(lastHourResult.rows),
      last24h: tallyStatusRows(last24hResult.rows),
      last7d: tallyStatusRows(last7dResult.rows),
      last30d: tallyStatusRows(last30dResult.rows),
      hourly: buildHourlyBuckets(hourlyResult.rows),
      hourlyByLocation: buildHourlyByLocation(hourlyResult.rows)
    };
    statsCachedAt = now;
    return statsCache;
  } catch (error) {
    logError('Could not fetch admin statistics', error);
    // Don't break /admin when stats fail — return the previous good
    // value if we have one, otherwise zeros so the template renders.
    return statsCache || emptyStats();
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
