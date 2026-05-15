import { writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { execa } from 'execa';
import { getLogger } from '@sitespeed.io/log';
import { nconf } from '../config.js';

import { queueHandler } from '../queue/queuehandler.js';
import { removeFlags, safeMerge } from '../utility.js';
const { join } = path;

const parseDockerExtraParameters = parameters => {
  if (!parameters) {
    return [];
  }
  return parameters.split(' ').map(parameter => parameter.trim());
};

export default async function runJob(job) {
  const logger = getLogger(`sitespeedio.dockertestrunner.${job.id}`);
  const dockerLogger = getLogger(
    `sitespeedio.dockertestrunner.process.${job.id}`
  );
  // The number of objects to keep in the queue before removal
  const removeOnComplete = nconf.get('queue:removeOnComplete') || 200;
  const removeOnFail = nconf.get('queue:removeOnFail') || 200;

  let workingDirectory;
  try {
    logger.info(`Start with job ${job.id}`);
    const baseWorkingDirectory = os.tmpdir();
    const dockerContainer =
      job.data.dockerContainer || nconf.get('docker:container');

    const dockerExtraParameters = parseDockerExtraParameters(
      nconf.get('docker:extraparameters')
    );

    workingDirectory = join(baseWorkingDirectory, job.queue.name, job.id);
    await mkdir(workingDirectory, { recursive: true });
    const configFileName = `${job.queue.name}-${job.id}-config.json`;
    const resultFileName = `${job.queue.name}-${job.id}-result.json`;

    // Modify config for use with default settings
    if (nconf.get('sitespeedioConfigFile') !== undefined) {
      job.data.config.extends = nconf.get('sitespeedioConfigFile');
    }

    const testrunnerConfig = nconf.get('sitespeed.io') || {};
    const config = safeMerge({}, testrunnerConfig, job.data.config);

    // If we use baseline setup the directory by default
    if (
      (job.data.extras && job.data.extras.includes('--compare.')) ||
      config.compare
    ) {
      // This is inside the container and we always use /baseline
      if (job.data.config.compare) {
        config.compare.baselinePath = '/baseline';
      } else {
        config.compare = {
          baselinePath: '/baseline'
        };
      }
    }

    await writeFile(
      join(workingDirectory, configFileName),
      JSON.stringify(config)
    );

    const parameters = setupDockerParameters(
      dockerContainer,
      dockerExtraParameters,
      workingDirectory,
      configFileName,
      resultFileName,
      (job.data.extras && job.data.extras.includes('--webpagereplay')) ||
        job.data.config.webpagereplay,
      (job.data.extras && job.data.extras.includes('--compare.')) ||
        job.data.config.compare
    );

    if (job.data.scripting) {
      const scriptingFileName = await handleScriptingFile(
        job,
        workingDirectory
      );
      parameters.push(scriptingFileName);
    } else if (job.data.url) {
      parameters.push(job.data.url);
    }

    // Handle extra parameters from the GUI
    if (job.data?.extras) {
      const extrasArray = job.data.extras.split(' ');
      const filteredExtras = removeFlags(extrasArray);
      parameters.push(...filteredExtras);
    }

    job.log('Starting test in Docker container ' + dockerContainer);
    const testResult = await runDocker(
      job,
      parameters,
      workingDirectory,
      resultFileName,
      logger,
      dockerLogger
    );
    logger.info(
      `Finished with job ${job.id} with exit code ${testResult.exitCode}`
    );
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
        runTime,
        failedReason: testResult.failedReason
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
    logger.error(
      'Failed to execute job %s: error: %s %s',
      job.id,
      error.message,
      job.data.url
    );
    job.log('Job failed:' + error.message);
    throw error;
  }
}

async function handleScriptingFile(job, workingDirectory) {
  const scriptExtension = job.data.scripting.includes('module.exports')
    ? '.cjs'
    : '.mjs';
  // `scriptingName + ext` is always truthy (even "undefined.mjs") so the
  // `|| job.id + ext` branch never fired — scripted runs without a name
  // were written as `undefined.mjs`. Resolve the basename first.
  const basename = (job.data.scriptingName || job.id) + scriptExtension;
  const filename = join(workingDirectory, basename);

  await writeFile(filename, job.data.scripting);
  return join('/sitespeed.io', basename);
}

function setupDockerParameters(
  dockerContainer,
  dockerExtraParameters,
  workingDirectory,
  configFileName,
  resultFileName,
  usingWebPageReplay,
  usingBaseline
) {
  const baseParameters = [
    'run',
    '--rm',
    '--volume',
    `${workingDirectory}:/sitespeed.io`,
    ...dockerExtraParameters,
    dockerContainer,
    '--config',
    join('/sitespeed.io', configFileName),
    '--storeResult',
    join('/sitespeed.io', resultFileName),
    '--disableAPI',
    true
  ];

  //
  if (usingWebPageReplay) {
    baseParameters.splice(1, 0, '-e', 'REPLAY=true', '-e', 'LATENCY=100');
  }

  if (usingBaseline) {
    const baselineDirectory = nconf.get('docker:baselinedir') || '"$(pwd)"';
    baseParameters.splice(1, 0, '-v', `${baselineDirectory}:/baseline`);
  }

  return baseParameters;
}

async function runDocker(
  job,
  parameters,
  workingDirectory,
  resultFileName,
  logger,
  dockerLogger
) {
  let exitCode = 0;
  let failedReason;
  try {
    const process = execa('docker', parameters);

    process.stdout.on('data', chunk => {
      dockerLogger.info(chunk.toString());
      job.log(chunk.toString());
    });

    process.stderr.on('data', chunk => {
      dockerLogger.info(chunk.toString());
      job.log(chunk.toString());
    });

    await process;
  } catch (error) {
    logger.error('Could not run Docker:' + error);
    exitCode = error.exitCode;
    failedReason = buildFailedReason(error);
  }

  try {
    const result = await readFile(join(workingDirectory, resultFileName));
    return { result: JSON.parse(result.toString()), exitCode, failedReason };
  } catch {
    return { result: {}, exitCode, failedReason };
  } finally {
    await cleanupWorkingDirectory(workingDirectory, logger);
  }
}

// Same shape as the non-docker runner: exit code (always present)
// plus the last non-empty line of stderr when available. The wrapped
// process is sitespeed.io running inside the container, so its stderr
// surfaces here; if docker itself fails (image pull, daemon issues)
// the same path captures docker's stderr instead.
function buildFailedReason(error) {
  const tail = (error.stderr || '')
    .split('\n')
    .map(line => line.trim())
    .findLast(Boolean);
  let reason = `Test runner exited with code ${error.exitCode}`;
  if (tail) reason += `: ${tail}`;
  if (reason.length > 500) reason = reason.slice(0, 497) + '...';
  return reason;
}

async function cleanupWorkingDirectory(directory, logger) {
  try {
    await rm(directory, { recursive: true });
  } catch (error) {
    logger.error('Failed to clean up working directory: %s', error);
  }
}
