import NodeCache from 'node-cache';
const idToSetup = new NodeCache({ stdTTL: 60 * 60, checkperiod: 120 });

export function getConfigByTestId(id) {
  return idToSetup.get(id);
}

export function setConfigById(id, url, scriptingName, config, queueName) {
  idToSetup.set(id, { url, scriptingName, config, queueName });
}
