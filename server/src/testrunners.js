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

function removeByHostname(target, hostnameToRemove) {
  delete target[hostnameToRemove];
}

export function addTestRunner(config) {
  mergeByHostname(testRunners, config);
}

export function removeTestRunner(config) {
  removeByHostname(testRunners, config.hostname);
}

export function getTestRunners() {
  return Object.values(testRunners);
}

export function getTestRunnersConfiguration(name) {
  return Object.values(testRunners).find(
    testRunner => testRunner.name === name
  );
}
