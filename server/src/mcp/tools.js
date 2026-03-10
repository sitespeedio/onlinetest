import { z } from 'zod';
import { nconf } from '../config.js';
import { getTestRunners } from '../testrunners.js';
import { addTestFromAPI } from '../util/add-test.js';
import { getTest, getTestResult, getTestHar } from '../database/index.js';

const POLL_INTERVAL_MS = 3000;

function validateTestUrl(url) {
  const testDomain = nconf.any('valid:test:domains', 'validTestDomains');
  if (!testDomain) return;
  const hostname = new URL(url).hostname;
  if (!new RegExp(testDomain).test(hostname)) {
    throw new Error(`Domain not allowed: ${hostname}`);
  }
}

function validateLocation(location) {
  const runners = getTestRunners();
  const locations = runners.map(r => r.name);
  if (!locations.includes(location)) {
    throw new Error(
      `Unknown location: "${location}". Available: ${locations.join(', ')}`
    );
  }
}

async function submitTest(
  url,
  location,
  browser,
  testType,
  connectivity,
  iterations,
  label
) {
  validateTestUrl(url);
  validateLocation(location);
  const userConfig = {
    browsertime: {
      browser,
      connectivity: { profile: connectivity, engine: 'throttle' },
      iterations
    },
    ...(testType === 'emulatedMobile' ? { mobile: true } : {}),
    android: testType === 'android'
  };
  return addTestFromAPI(
    userConfig,
    location,
    url,
    undefined,
    undefined,
    label,
    testType,
    10
  );
}

// Shared parameter shape for both run_performance_test and run_and_wait
const runTestParameters = {
  url: z.string().url().describe('The URL to performance test'),
  location: z.string().default('default').describe('Test runner location name'),
  browser: z
    .enum(['chrome', 'firefox', 'edge'])
    .default('chrome')
    .describe('Browser to use'),
  testType: z
    .enum(['desktop', 'emulatedMobile', 'android'])
    .default('desktop')
    .describe('Type of test'),
  connectivity: z
    .enum(['native', '3g', '4g', 'cable'])
    .default('native')
    .describe('Network connectivity profile'),
  iterations: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(3)
    .describe('Number of test iterations'),
  label: z
    .string()
    .optional()
    .describe('Optional label to identify this test run')
};

export function registerTools(server) {
  server.tool(
    'list_test_locations',
    'List all available test runner locations with their supported browsers, test types, and connectivity options.',
    {},
    async () => {
      const runners = getTestRunners();
      return {
        content: [{ type: 'text', text: JSON.stringify(runners, undefined, 2) }]
      };
    }
  );

  server.tool(
    'run_performance_test',
    'Submit a URL for web performance testing with sitespeed.io. Returns a testId immediately — use get_test_status to poll for completion, or run_and_wait to block until done.',
    runTestParameters,
    async ({
      url,
      location,
      browser,
      testType,
      connectivity,
      iterations,
      label
    }) => {
      const id = await submitTest(
        url,
        location,
        browser,
        testType,
        connectivity,
        iterations,
        label
      );
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                testId: id,
                message:
                  'Test submitted. Use get_test_status to poll or run_and_wait for an all-in-one call.'
              },
              undefined,
              2
            )
          }
        ]
      };
    }
  );

  server.tool(
    'get_test_status',
    'Get the current status of a performance test (waiting, active, completed, or failed). Returns the HTML result URL when completed.',
    {
      testId: z
        .string()
        .uuid()
        .describe('The test ID returned by run_performance_test')
    },
    async ({ testId }) => {
      const test = await getTest(testId);
      if (!test) {
        throw new Error('No test found with id ' + testId);
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: test.status,
                url: test.url,
                scriptingName: test.scripting_name,
                result: test.status === 'completed' ? test.result_url : ''
              },
              undefined,
              2
            )
          }
        ]
      };
    }
  );

  server.tool(
    'get_test_result',
    'Get the full Browsertime performance metrics JSON for a completed test. Includes Core Web Vitals (LCP, CLS, INP), SpeedIndex, TTFB, First Contentful Paint, and all timing data per iteration.',
    { testId: z.string().uuid().describe('The test ID of a completed test') },
    async ({ testId }) => {
      const row = await getTestResult(testId);
      if (!row?.browsertime_result) {
        throw new Error('No result available yet for test ' + testId);
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(row.browsertime_result, undefined, 2)
          }
        ]
      };
    }
  );

  server.tool(
    'get_test_har',
    'Get the HAR (HTTP Archive) file for a completed test. Contains all network requests, response headers, timings, and payload sizes.',
    { testId: z.string().uuid().describe('The test ID of a completed test') },
    async ({ testId }) => {
      const row = await getTestHar(testId);
      if (!row?.har) {
        throw new Error('No HAR available yet for test ' + testId);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(row.har, undefined, 2) }]
      };
    }
  );

  server.tool(
    'run_and_wait',
    'Submit a performance test and automatically poll until it completes, then return the full result with performance metrics JSON. This is the primary tool for interactive use.',
    {
      ...runTestParameters,
      timeoutSeconds: z
        .number()
        .int()
        .min(30)
        .max(600)
        .default(300)
        .describe('Maximum seconds to wait for the test to complete')
    },
    async ({
      url,
      location,
      browser,
      testType,
      connectivity,
      iterations,
      label,
      timeoutSeconds
    }) => {
      const id = await submitTest(
        url,
        location,
        browser,
        testType,
        connectivity,
        iterations,
        label
      );
      const deadline = Date.now() + timeoutSeconds * 1000;

      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        const test = await getTest(id);
        if (!test) continue;

        if (test.status === 'completed') {
          const row = await getTestResult(id);
          if (!row?.browsertime_result) {
            throw new Error(
              'Test completed but no metrics available for ' + id
            );
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    testId: id,
                    status: 'completed',
                    resultUrl: test.result_url,
                    metrics: row.browsertime_result
                  },
                  undefined,
                  2
                )
              }
            ]
          };
        }

        if (test.status === 'failed') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { testId: id, status: 'failed' },
                  undefined,
                  2
                )
              }
            ]
          };
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                testId: id,
                status: 'timeout',
                message: `Test did not complete within ${timeoutSeconds}s. Use get_test_status to continue polling.`
              },
              undefined,
              2
            )
          }
        ]
      };
    }
  );
}
