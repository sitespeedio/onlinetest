import { writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { execa } from 'execa';
import log from 'intel';
import nconf from 'nconf';

import { queueHandler } from '../queue/queuehandler.js';

const { join } = path;

const parseDockerExtraParameters = parameters => {
  if (!parameters) {
    return [];
  }
  return parameters.split(' ').map(parameter => parameter.trim());
};

export default async function runJob(job) {
  const logger = log.getLogger(`sitespeedio.dockertestrunner.${job.id}`);
  const dockerLogger = log.getLogger(
    `sitespeedio.dockertestrunner.process.${job.id}`
  );
  let workingDirectory;
  try {
    logger.info('Start with job');
    const baseWorkingDirectory = os.tmpdir();
    const dockerContainer = nconf.get('docker:container');

    const dockerExtraParameters = parseDockerExtraParameters(
      nconf.get('docker:extraparameters')
    );

    workingDirectory = join(baseWorkingDirectory, job.queue.name, job.id);
    const insideDockerDirectory = join(
      '/sitespeed.io/',
      job.queue.name,
      job.id
    );
    await mkdir(workingDirectory, { recursive: true });
    const configFileName = `${job.queue.name}-${job.id}-config.json`;
    const resultFileName = `${job.queue.name}-${job.id}-result.json`;

    // Modify config for use with default settings
    if (nconf.get('sitespeedioConfigFile') !== undefined) {
      job.data.config.extends =
        './config/' + nconf.get('sitespeedioConfigFile');
    }

    await writeFile(
      join(workingDirectory, configFileName),
      JSON.stringify(job.data.config)
    );

    const parameters = setupDockerParameters(
      job,
      dockerContainer,
      dockerExtraParameters,
      baseWorkingDirectory,
      insideDockerDirectory,
      configFileName,
      resultFileName
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
    if (job.data.extras) {
      const extras = job.data.extras.split(' ');
      parameters.push(...extras);
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
    logger.info('Finished with job with exit code: ' + testResult.exitCode);
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
    }
    return {
      resultUrl: testResult.result.resultUrl,
      pageSummaryUrl:
        testResult.exitCode === 0
          ? testResult.result.pageSummaryUrl
          : testResult.result.resultUrl,
      status: testResult.exitCode === 0 ? 'completed' : 'failed'
    };
  } catch (error) {
    logger.error('Failed to execute job: %s', error.message, job.data.url);
    job.log('Job failed:' + error.message);
    if (workingDirectory) {
      await cleanupWorkingDirectory(workingDirectory, logger);
    }
    throw error;
  }
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

function setupDockerParameters(
  job,
  dockerContainer,
  dockerExtraParameters,
  baseWorkingDirectory,
  insideDockerDirectory,
  configFileName,
  resultFileName
) {
  const baseParameters = [
    'run',
    '--rm',
    '--volume',
    `${baseWorkingDirectory}:/sitespeed.io`,
    ...dockerExtraParameters,
    dockerContainer,
    '--config',
    join(insideDockerDirectory, configFileName),
    '--storeResult',
    join(insideDockerDirectory, resultFileName)
  ];

  if (job.data.config.webpagereplay) {
    baseParameters.splice(1, 0, '--cap-add=NET_ADMIN');
    baseParameters.splice(2, 0, '-e', 'REPLAY=true', '-e', 'LATENCY=100');
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
  }

  try {
    const result = await readFile(join(workingDirectory, resultFileName));
    await cleanupWorkingDirectory(workingDirectory, logger);
    return { result: JSON.parse(result.toString()), exitCode };
  } catch {
    return { result: {}, exitCode };
  }
}

async function cleanupWorkingDirectory(directory, logger) {
  try {
    await rm(directory, { recursive: true });
  } catch (error) {
    logger.error('Failed to clean up working directory: %s', error);
  }
}
