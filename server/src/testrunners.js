import merge from 'lodash.merge';

const testRunners = [];
const testRunnersById = [];

export function addTestRunner(config) {
  const index = testRunners.findIndex(
    testRunner => testRunner.name == config.name
  );
  testRunnersById.push(config);
  if (index === -1) {
    testRunners.push(config);
  } else {
    // Maybe we have multiple testrunners for the same location etc
    merge(testRunners[index], config);
  }
}

export function removeTestRunner(config) {
  // Runners need to have uniqie ids.
  // First remove the runner
  testRunnersById.splice(
    testRunnersById.findIndex(
      testRunner => testRunner.hostname === config.hostname
    ),
    1
  );

  // Update the merged version
  const index = testRunners.findIndex(
    testRunner => testRunner.name == config.name
  );
  let updatedSetup = {};
  for (let testRunner of testRunnersById) {
    if ((testRunner.name = config.name)) {
      merge(updatedSetup, testRunner);
    }
  }

  if (Object.keys(updatedSetup) > 0) {
    testRunners[index] = updatedSetup;
  } else {
    testRunners.splice(index, 1);
  }
}
export function getTestRunners() {
  return testRunners;
}

export function getTestRunnersConfiguration(name) {
  const index = testRunners.findIndex(testRunner => testRunner.name === name);
  return testRunners[index];
}
