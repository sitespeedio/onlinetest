import { getLogger } from '@sitespeed.io/log';
import { nconf } from '../config.js';
import DatabaseHelper from './databasehelper.js';

const logger = getLogger('sitespeedio.server.retention');

// Small batches keep each statement short, so new results can still be
// saved while a pass runs.
const BATCH_SIZE = 1000;

// run_date is set when the result arrives, so these rows are finished.
const CLEAR_DATA = `UPDATE sitespeed_io_test_runs SET har = NULL, browsertime_result = NULL WHERE id IN (SELECT id FROM sitespeed_io_test_runs WHERE run_date < NOW() - make_interval(days => $1::int) AND (har IS NOT NULL OR browsertime_result IS NOT NULL) LIMIT ${BATCH_SIZE})`;

// Tests that never ran have no run_date, so use added_date for them. Never
// remove a test that waits or runs.
const REMOVE_TESTS = `DELETE FROM sitespeed_io_test_runs WHERE id IN (SELECT id FROM sitespeed_io_test_runs WHERE status IN ('completed', 'failed') AND (run_date < NOW() - make_interval(days => $1::int) OR (run_date IS NULL AND added_date < NOW() - make_interval(days => $1::int))) LIMIT ${BATCH_SIZE})`;

let running = false;

/**
 * Remove test data that is older than retention.days. With retention.remove
 * set to data, clear the HAR and the browsertime result but keep the test for
 * search. With test, remove the whole test. A missing or 0 retention.days
 * keeps everything.
 */
export async function removeOldTestData() {
  const days = nconf.get('retention:days') ?? 0;
  const remove = nconf.get('retention:remove') ?? 'test';

  if (days === 0) return;
  if (!Number.isInteger(days) || days < 0) {
    logger.error('retention.days must be a whole number of days, got %s', days);
    return;
  }
  if (remove !== 'data' && remove !== 'test') {
    logger.error('retention.remove must be data or test, got %s', remove);
    return;
  }
  if (running) return;

  running = true;
  try {
    const query = remove === 'test' ? REMOVE_TESTS : CLEAR_DATA;
    let total = 0;
    let count;
    do {
      ({ rowCount: count } = await DatabaseHelper.getInstance().query(query, [
        days
      ]));
      total += count;
    } while (count === BATCH_SIZE);

    if (total > 0) {
      logger.info(
        remove === 'test'
          ? 'Retention removed %s tests older than %s days'
          : 'Retention cleared the HAR and result of %s tests older than %s days',
        total,
        days
      );
    }
    return total;
  } finally {
    running = false;
  }
}
