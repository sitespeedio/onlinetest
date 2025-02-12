import get from 'lodash.get';
import path from 'node:path';
import merge from 'lodash.merge';
import nconf from 'nconf';
import { readFile } from 'node:fs/promises';

import {
  uniqueNamesGenerator,
  starWars,
  animals,
  names
} from 'unique-names-generator';
import { getLogger } from '@sitespeed.io/log';

import { saveTest, getTest } from '../database/index.js';
import {
  getExistingQueue,
  setIdAndQueue,
  getDeviceQueue
} from '../queuehandler.js';
import { setConfigById } from '../configs.js';

import { updateStatus } from '../database/index.js';

const logger = getLogger('sitespeedio.server');

async function getDefaultSitespeedConfiguration() {
  if (nconf.get('defaultSitespeedioConfigFile')) {
    const result = await readFile(
      path.resolve(nconf.get('defaultSitespeedioConfigFile'))
    );
    logger.info('Using configiguration from defaultSitespeedioConfigFile');
    return JSON.parse(result.toString());
  } else return nconf.get('sitespeed.io') || {};
}

const uniqueNamesConfig = {
  dictionaries: [starWars, animals, names]
};

function getQueueName(location, deviceId) {
  return getDeviceQueue(deviceId, location);
}

export async function reRunTest(request) {
  let { id, label, url } = request.body;

  /*
  if (url) {
    url = url.startsWith('http') ? url : undefined;
  }
    */
  const oldTest = await getTest(id);

  const deviceId =
    get(oldTest, 'configuration.browsertime.chrome.android.deviceSerial') ||
    get(oldTest, 'configuration.browsertime.firefox.android.deviceSerial');

  const queueName = getQueueName(oldTest.location, deviceId);

  const removeOnComplete = nconf.get('queue:removeOnComplete') || 200;
  const removeOnFail = nconf.get('queue:removeOnFail') || 400;
  const attempts = nconf.get('queue:attempts') || 1;

  if (queueName) {
    const testRunnerQueue = getExistingQueue(queueName);
    try {
      const jobId = await saveTest(
        oldTest.browser_name,
        url || oldTest.url,
        oldTest.location,
        oldTest.test_type,
        oldTest.scripting_name,
        oldTest.scripting,
        label || oldTest.label,
        oldTest.slug,
        // oldTest.configuration.browsertime,
        oldTest.configuration,
        oldTest.cli_params
      );

      logger.info(`Adding test with id ${jobId} in queue ${queueName} (rerun)`);

      console.log({
        url: url || oldTest.url,
        config: oldTest.configuration,
        extras: oldTest.cli_params,
        scripting: oldTest.scripting,
        scriptingName: oldTest.scripting_name,
        label: label || oldTest.label
      });

      await testRunnerQueue.add(
        {
          url: url || oldTest.url,
          config: oldTest.configuration,
          extras: oldTest.cli_params,
          scripting: oldTest.scripting,
          scriptingName: oldTest.scripting_name,
          label: label || oldTest.label
        },
        {
          jobId,
          removeOnComplete,
          removeOnFail,
          priority: 10,
          attempts
        }
      );

      setConfigById(
        jobId,
        url || oldTest.url,
        oldTest.scripting_name,
        oldTest.configuration,
        queueName
      );
      setIdAndQueue(jobId, testRunnerQueue);
      return jobId;
    } catch (error) {
      throw new Error('Could not connect to queue' + error);
    }
  } else {
    throw new Error('Non existing queue ' + queueName);
  }
}

export async function addTest(request) {
  let {
    url,
    location,
    browser,
    testType,
    scripting,
    scriptingName,
    label,
    priority = 10,
    extras,
    deviceId,
    iterations,
    axe,
    sustainable,
    crux,
    cruxKey,
    lighthouse: useLighthouse
  } = request.body;

  const defaultConfig = await getDefaultSitespeedConfiguration();

  // The number of objects to keep in the queue before removal
  const removeOnComplete = nconf.get('queue:removeOnComplete') || 200;
  const removeOnFail = nconf.get('queue:removeOnFail') || 400;
  const attempts = nconf.get('queue:attempts') || 1;
  const userConfig = {
    browsertime: {
      browser,
      connectivity: { profile: request.body.connectivity, engine: 'throttle' },
      iterations
    },
    multi: !!scripting,
    axe: axe ? { enable: true } : undefined,
    sustainable: sustainable ? { enable: true } : undefined,
    crux: crux ? { key: cruxKey || undefined, enable: true } : undefined,
    lighthouse: useLighthouse ? { enable: true } : undefined,
    android: testType === 'android'
  };

  if (testType === 'emulatedMobile') {
    userConfig.mobile = true;
  }

  let config = {};
  merge(config, defaultConfig, userConfig);

  if (deviceId) {
    if (browser === 'chrome') {
      config.browsertime.chrome = {
        android: {
          deviceSerial: deviceId
        }
      };
    } else if (browser === 'firefox') {
      config.browsertime.firefox = {
        android: {
          deviceSerial: deviceId
        }
      };
    }
  }

  if (scripting && !scriptingName) {
    scriptingName = uniqueNamesGenerator(uniqueNamesConfig);
  }

  if (scriptingName) {
    scriptingName = scriptingName.trim().replaceAll(' ', '_');
  }

  const slug = get(config, 'slug', '');

  const queueName = getQueueName(location, deviceId);

  if (queueName) {
    const testRunnerQueue = getExistingQueue(queueName);
    const jobId = await saveTest(
      browser,
      url,
      location,
      testType,
      scriptingName,
      scripting,
      label,
      slug,
      config,
      extras
    );

    logger.info(`Adding test with id ${jobId} in queue ${queueName}`);

    try {
      await testRunnerQueue.add(
        {
          url: url,
          config,
          extras,
          scripting,
          scriptingName,
          label
        },
        {
          jobId,
          removeOnComplete,
          removeOnFail,
          priority,
          attempts
        }
      );
    } catch (error) {
      logger.error(
        `Setting status to failed for ${jobId} because queue is down`,
        error
      );
      await updateStatus(jobId, 'failed');
      throw new Error('Could not connect to queue');
    }

    setConfigById(jobId, url, scriptingName, config, queueName);
    setIdAndQueue(jobId, testRunnerQueue);
    return jobId;
  } else {
    throw new Error('Non existing queue');
  }
}

export async function addTestFromAPI(
  userConfig,
  location,
  url,
  scripting,
  scriptingName,
  label,
  testType,
  priority,
  dockerContainer
) {
  // The number of objects to keep in the queue before removal
  const removeOnComplete = nconf.get('queue:removeOnComplete') || 200;
  const removeOnFail = nconf.get('queue:removeOnFail') || 400;
  const attempts = nconf.get('queue:attempts') || 1;

  const deviceId =
    get(userConfig, 'browsertime.firefox.android.deviceSerial') ||
    get(userConfig, 'browsertime.chrome.android.deviceSerial');

  const defaultConfig = await getDefaultSitespeedConfiguration();
  let config = {};
  merge(config, defaultConfig, userConfig);

  const slug = get(config, 'slug', '');
  let queue = getQueueName(location, deviceId);
  const browser = get(config, 'browsertime.browser', 'chrome');
  const testRunnerQueue = getExistingQueue(queue);
  const jobId = await saveTest(
    browser,
    url,
    location,
    testType,
    scriptingName,
    scripting,
    label,
    slug,
    config
  );

  logger.info(`Adding test with id ${jobId} in queue ${queue} using the API`);

  if (scripting && !scriptingName) {
    scriptingName = uniqueNamesGenerator(uniqueNamesConfig);
  }

  if (scriptingName) {
    scriptingName = scriptingName.trim().replaceAll(' ', '_');
  }

  const jobConfig = {
    jobId,
    removeOnComplete,
    removeOnFail,
    priority: priority || 10,
    attempts
  };

  try {
    await testRunnerQueue.add(
      {
        url,
        config,
        scripting,
        scriptingName,
        label,
        dockerContainer
      },
      jobConfig
    );
  } catch (error) {
    logger.error(
      `Setting status to failed for ${jobId} because queue is down`,
      error
    );
    await updateStatus(jobId, 'failed');
    throw new Error('Could not connect to queue');
  }

  setConfigById(jobId, url, scriptingName, config, queue);
  setIdAndQueue(jobId, testRunnerQueue);
  return jobId;
}
