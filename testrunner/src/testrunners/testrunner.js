import { writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { execa } from 'execa';
import log from 'intel';
import nconf from 'nconf';

import { queueHandler } from '../queue/queuehandler.js';
import { getBaseFilePath } from '../util.js';
const { join } = path;

/**
 * Main function to handle job execution. This testrunner will use
 * the globally installed sitespeed.io by default.
 * It uses the sandboxed process/job in bull
 * https://github.com/OptimalBits/bull/
 *
 */
export default async function runJob(job) {
  const logger = log.getLogger(`sitespeedio.testrunner.${job.id}`);
  let workingDirectory;
  // Make sure we vatch everything that can go wrong
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
    resultQueue.add({
      result: testResult.result,
      id: job.id,
      status: testResult.exitCode === 0 ? 'completed' : 'failed',
      runTime
    });
    if (testResult.exitCode > 0) {
      throw new Error(
        `sitespeed.io exited with a failure exit code ${testResult.exitCode}`
      );
    } else {
      return {
        resultUrl: testResult.result.resultUrl,
        pageSummaryUrl:
          testResult.exitCode === 0
            ? testResult.result.pageSummaryUrl
            : testResult.result.resultUrl,
        status: testResult.exitCode === 0 ? 'completed' : 'failed'
      };
    }
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

  return jobConfig;
}

async function runTest(job, workingDirectory, configFileName, logger) {
  const parameters = await setupParameters(
    job,
    workingDirectory,
    configFileName
  );
  const binary = nconf.get('executable');
  let exitCode = 0;
  try {
    const process = execa(binary, parameters);
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
    logger.error('Could not run sitespeed.io', error);
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
    join(workingDirectory, `${job.queue.name}-${job.id}-result.json`)
  ];
  const a = await handleScriptingAndUrl(job, workingDirectory);
  parameters.push(...a);
  if (job.data.extras) {
    parameters.push(...job.data.extras.split(' '));
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
  const scriptContent = job.data.scripting.includes('export default')
    ? job.data.scripting
    : `export default async function (context, commands) {${job.data.scripting}}`;
  const filename = join(
    workingDirectory,
    (job.data.scriptingName || job.id) + scriptExtension
  );
  await writeFile(filename, scriptContent);
  return filename;
}

async function cleanupWorkingDirectory(directory, logger) {
  try {
    await rm(directory, { recursive: true });
  } catch (error) {
    logger.error('Failed to clean up working directory: %s', error);
  }
}
