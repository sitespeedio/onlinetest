import { testRunnersConnected } from './metrics.js';

const testRunners = {};

function mergeByHostname(target, source) {
  if (target[source.hostname]) {
    target[source.hostname].setup = [
      ...target[source.hostname].setup,
      ...source.setup
    ];
  } else {
    target[source.hostname] = { ...source };
  }
}

function removeByHostname(hostnameToRemove) {
  delete testRunners[hostnameToRemove];
}

function updateTestRunnerMetrics() {
  testRunnersConnected.reset();
  for (const runner of Object.values(testRunners)) {
    testRunnersConnected.set({ location: runner.name }, 1);
  }
}

export function addTestRunner(config) {
  mergeByHostname(testRunners, config);
  updateTestRunnerMetrics();
}

export function removeTestRunner(config) {
  removeByHostname(config.hostname);
  updateTestRunnerMetrics();
}

export function getTestRunners() {
  return Object.values(testRunners);
}

export function getTestRunnersConfiguration(name) {
  return Object.values(testRunners).find(
    testRunner => testRunner.name === name
  );
}
