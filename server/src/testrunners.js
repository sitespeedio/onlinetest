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

export function addTestRunner(config) {
  mergeByHostname(testRunners, config);
}

export function removeTestRunner(config) {
  removeByHostname(config.hostname);
}

export function getTestRunners() {
  return Object.values(testRunners);
}

export function getTestRunnersConfiguration(name) {
  return Object.values(testRunners).find(
    testRunner => testRunner.name === name
  );
}
