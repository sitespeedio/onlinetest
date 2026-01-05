import { writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { execa } from 'execa';
import { getLogger } from '@sitespeed.io/log';
import { nconf } from '../config.js';
import get from 'lodash.get';
import merge from 'lodash.merge';

import { queueHandler } from '../queue/queuehandler.js';
import { getBaseFilePath, removeFlags } from '../utility.js';
const { join } = path;
const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Main function to handle job execution. This testrunner will use
 * the globally installed sitespeed.io by default.
 * It uses the sandboxed process/job in bull
 * https://github.com/OptimalBits/bull/
 *
 */
export default async function runJob(job) {
  const logger = getLogger(`sitespeedio.testrunner.${job.id}`);
  let workingDirectory;

  // The number of objects to keep in the queue before removal
  const removeOnComplete = nconf.get('queue:removeOnComplete') || 200;
  const removeOnFail = nconf.get('queue:removeOnFail') || 200;

  // Make sure we catch everything that can go wrong
  try {
    logger.info('Start job');
    workingDirectory = await createWorkingDirectory(job);
    const configFilePath = await setupConfigurationFile(workingDirectory, job);
    const testResult = await runTest(
      job,
      workingDirectory,
      configFilePath,
      logger
    );
    logger.info('Finished job with exitCode %s', testResult.exitCode);
    const resultQueue = await queueHandler.getQueue('result');

    let runTime = testResult.result.timestamp;
    if (
      testResult.result.browsertime &&
      testResult.result.browsertime.length > 0
    ) {
      // The timestamp from Browsertime is more exact
      runTime = testResult.result.browsertime[0].info.timestamp;
    }
    await resultQueue.add(
      {
        result: testResult.result,
        id: job.id,
        status: testResult.exitCode === 0 ? 'completed' : 'failed',
        runTime
      },
      {
        removeOnComplete,
        removeOnFail
      }
    );

    return {
      resultUrl: testResult.result.resultUrl,
      pageSummaryUrl:
        testResult.exitCode === 0
          ? testResult.result.pageSummaryUrl
          : testResult.result.resultUrl,
      status: testResult.exitCode === 0 ? 'completed' : 'failed'
    };
  } catch (error) {
    logger.error('Job execution failed: %s', error.message);
    job.log('Job failed:' + error.message);
    throw error;
  } finally {
    if (workingDirectory) {
      await cleanupWorkingDirectory(workingDirectory, logger);
    }
  }
}

async function createWorkingDirectory(job) {
  const baseWorkingDirectory = nconf.get('workingDirectory') || os.tmpdir();

  const directory = `${baseWorkingDirectory}/${job.queue.name}/${job.id}`;
  await mkdir(directory, { recursive: true });
  return directory;
}

async function setupConfigurationFile(workingDirectory, job) {
  const configFileName = `${job.queue.name}-${job.id}-config.json`;
  const sitespeedConfig = prepareSitespeedConfig(job);
  await writeFile(
    join(workingDirectory, configFileName),
    JSON.stringify(sitespeedConfig)
  );
  return configFileName;
}

function prepareSitespeedConfig(job) {
  let jobConfig = job.data.config;
  if (jobConfig.lighthouse && jobConfig.lighthouse.enable) {
    jobConfig.plugins = {
      ...jobConfig.plugins,
      // TODO this should be configurable
      add: '@sitespeed.io/plugin-lighthouse'
    };
  }

  jobConfig.extends =
    nconf.get('sitespeedioConfigFile') === undefined
      ? getBaseFilePath('./config/sitespeedDefault.json')
      : path.resolve(nconf.get('sitespeedioConfigFile'));

  const testrunnerConfig = nconf.get('sitespeed.io') || {};
  const config = merge({}, testrunnerConfig, jobConfig);
  return config;
}

async function runTest(job, workingDirectory, configFileName, logger) {
  const parameters = await setupParameters(
    job,
    workingDirectory,
    configFileName
  );

  let binary = nconf.get('executable');
  let environment = {};
  if (
    (job.data.extras && job.data.extras.includes('--webpagereplay')) ||
    job.data.config.webpagereplay
  ) {
    binary = path.resolve(__dirname, '../../wpr/replay.sh');

    if (
      (job.data.extras && job.data.extras.includes('--android')) ||
      job.data.config.android
    ) {
      environment = {
        env: {
          ANDROID: true
        }
      };
    }

    const deviceId =
      get(job.data.config, 'browsertime.firefox.android.deviceSerial') ||
      get(job.data.config, 'browsertime.chrome.android.deviceSerial');

    if (deviceId) {
      environment.env.DEVICE_SERIAL = deviceId;
    }
  }

  let exitCode = 0;
  try {
    const process = execa(binary, parameters, environment);
    process.stdout.on('data', chunk => {
      logger.debug(chunk.toString());
      job.log(chunk.toString());
    });
    process.stderr.on('data', chunk => {
      logger.debug(chunk.toString());
      job.log(chunk.toString());
    });
    await process;
  } catch (error) {
    // if sitespeed.io exits with 0 zero, execa will throw an error
    logger.error(`Could not run sitespeed.io. Exit code: ${error.exitCode}`);
    logger.error(`Stdout: ${error.stdout}`);
    logger.error(`Stderr: ${error.stderr}`);
    exitCode = error.exitCode;
  }
  try {
    const result = await readFile(
      join(workingDirectory, `${job.queue.name}-${job.id}-result.json`)
    );
    return { result: JSON.parse(result.toString()), exitCode };
  } catch {
    return { result: {}, exitCode };
  }
}

async function setupParameters(job, workingDirectory, configFileName) {
  let parameters = [
    '--config',
    join(workingDirectory, configFileName),
    '--storeResult',
    join(workingDirectory, `${job.queue.name}-${job.id}-result.json`),
    '--disableAPI',
    true
  ];
  const a = await handleScriptingAndUrl(job, workingDirectory);
  parameters.push(...a);

  if (job.data?.extras) {
    const extrasArray = job.data.extras.split(' ');
    const filteredExtras = removeFlags(extrasArray);
    parameters.push(...filteredExtras);
  }

  return parameters;
}

async function handleScriptingAndUrl(job, workingDirectory) {
  if (job.data.scripting) {
    return [await handleScriptingFile(job, workingDirectory)];
  } else if (job.data.url) {
    return [job.data.url];
  }
  return [];
}

async function handleScriptingFile(job, workingDirectory) {
  const scriptExtension = job.data.scripting.includes('module.exports')
    ? '.cjs'
    : '.mjs';
  const filename = join(
    workingDirectory,
    (job.data.scriptingName || job.id) + scriptExtension
  );
  await writeFile(filename, job.data.scripting);
  return filename;
}

async function cleanupWorkingDirectory(directory, logger) {
  try {
    await rm(directory, { recursive: true });
  } catch (error) {
    logger.error('Failed to clean up working directory: %s', error);
  }
}
