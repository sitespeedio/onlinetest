import {
  Registry,
  Histogram,
  Counter,
  Gauge,
  collectDefaultMetrics
} from 'prom-client';

export const register = new Registry();

register.setDefaultLabels({ service: 'sitespeedio_server' });
collectDefaultMetrics({ register });

// HTTP metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Queue metrics
export const queueSize = new Gauge({
  name: 'queue_size',
  help: 'Number of jobs waiting in the queue',
  labelNames: ['queue'],
  registers: [register]
});

export const queueJobsActive = new Gauge({
  name: 'queue_jobs_active',
  help: 'Number of jobs currently being processed',
  labelNames: ['queue'],
  registers: [register]
});

// Database metrics
export const databaseQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'PostgreSQL query latency in seconds',
  labelNames: ['query'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

export const databasePoolActiveConnections = new Gauge({
  name: 'db_pool_active_connections',
  help: 'Number of active database pool connections',
  registers: [register]
});

export const databasePoolIdleConnections = new Gauge({
  name: 'db_pool_idle_connections',
  help: 'Number of idle database pool connections',
  registers: [register]
});

export const databasePoolWaitingRequests = new Gauge({
  name: 'db_pool_waiting_requests',
  help: 'Number of requests waiting for a database connection',
  registers: [register]
});

// Test metrics
export const testsSubmittedTotal = new Counter({
  name: 'tests_submitted_total',
  help: 'Total number of tests submitted',
  labelNames: ['test_type', 'browser', 'location'],
  registers: [register]
});

export const testsCompletedTotal = new Counter({
  name: 'tests_completed_total',
  help: 'Total number of tests completed successfully',
  labelNames: ['test_type', 'browser', 'location'],
  registers: [register]
});

export const testsFailedTotal = new Counter({
  name: 'tests_failed_total',
  help: 'Total number of tests that failed',
  labelNames: ['test_type', 'browser', 'location'],
  registers: [register]
});

// Infrastructure metrics
export const testRunnersConnected = new Gauge({
  name: 'test_runners_connected',
  help: 'Number of currently connected test runners',
  labelNames: ['location'],
  registers: [register]
});


export const redisConnectionUp = new Gauge({
  name: 'redis_connection_up',
  help: 'Whether the Redis/KeyDB connection is healthy (1 = up, 0 = down)',
  registers: [register]
});
