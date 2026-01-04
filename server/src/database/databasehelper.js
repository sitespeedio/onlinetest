import postgrespackage from 'pg';
const { Pool } = postgrespackage;

import { nconf } from '../config.js';
import { getLogger } from '@sitespeed.io/log';

const logger = getLogger('sitespeedio.database.query');

class DatabaseHelper {
  constructor() {
    const DATABASE_USER = nconf.get('postgresql:user');
    const DATABASE_SERVER = nconf.get('postgresql:server') ?? '127.0.0.1';
    const DATABASE_NAME = nconf.get('postgresql:db');
    const DATABASE_PASSWORD = nconf.get('postgresql:password');
    const DATABASE_PORT = nconf.get('postgresql:port');

    this.pool = new Pool({
      user: DATABASE_USER,
      host: DATABASE_SERVER,
      database: DATABASE_NAME,
      password: DATABASE_PASSWORD,
      port: DATABASE_PORT
    });

    DatabaseHelper.instance = this;
  }

  static getInstance() {
    if (!DatabaseHelper.instance) {
      new DatabaseHelper();
    }
    return DatabaseHelper.instance;
  }
  /**
   * Helper function to query the datanase. Will automatically
   * mesure the time the query takes and log it to the query log.
   */
  query(text, parameters) {
    const start = Date.now();
    return this.pool.query(text, parameters).then(result => {
      const duration = Date.now() - start;
      logger.info(
        'Executed query: %s, that took %s ms and affected %s rows',
        text,
        duration,
        result.rowCount
      );
      return result;
    });
  }

  /**
   * Close the connection pool.
   */
  closeConnectionPool() {
    return this.pool.end();
  }
}

export default DatabaseHelper;
