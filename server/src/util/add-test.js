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
import log from 'intel';

import { saveTest } from '../database/index.js';
import {
  getExistingQueue,
  setIdAndQueue,
  getDeviceQueue
} from '../queuehandler.js';
import { setConfigById } from '../configs.js';
import { getLocalFilePath } from './fileutil.js';

const logger = log.getLogger('sitespeedio.server');

async function getDefaultSitespeedConfiguration() {
  if (nconf.get('defaultSitespeedioConfigFile')) {
    const result = await readFile(
      path.resolve(nconf.get('defaultSitespeedioConfigFile'))
    );
    return JSON.parse(result.toString());
  }
  const result = await readFile(
    path.resolve(getLocalFilePath('../config/sitespeed.json'))
  );
  return JSON.parse(result.toString());
}

const uniqueNamesConfig = {
  dictionaries: [starWars, animals, names]
};

function getQueueName(location, deviceId) {
  return getDeviceQueue(deviceId, location);
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
    android: !!testType === 'android'
  };

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

    await testRunnerQueue.add(
      {
        url: url.toLowerCase(),
        config,
        extras,
        scripting,
        scriptingName,
        label
      },
      {
        jobId,
        removeOnComplete: 3600,
        removeOnFail: 3600,
        priority
      }
    );

    setConfigById(jobId, url, scriptingName, config, queueName);
    setIdAndQueue(jobId, testRunnerQueue);
    return jobId;
  } else {
    throw new Error('Non existing queue');
  }
}

export async function addTestFromAPI(
  config,
  location,
  url,
  scripting,
  scriptingName,
  label,
  testType,
  priority
) {
  const deviceId =
    get(config, 'browsertime.firefox.android.deviceSerial') ||
    get(config, 'browsertime.chrome.android.deviceSerial');

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
    removeOnComplete: 3600,
    removeOnFail: 3600,
    priority: priority || 10
  };

  await testRunnerQueue.add(
    {
      url: url.toLowerCase(),
      config,
      scripting,
      scriptingName,
      label
    },
    jobConfig
  );

  setConfigById(jobId, url, scriptingName, config, queue);
  setIdAndQueue(jobId, testRunnerQueue);
  return jobId;
}
