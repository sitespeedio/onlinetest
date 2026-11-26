import { nconf } from '../config.js';
import { getQueueSize } from '../queuehandler.js';

// maxQueueSize limits how many tests can wait in a queue when the web GUI
// adds a test. The API is not limited, because it needs the API key.
export async function isQueueFullForGui(queueName) {
  // Not nconf.any(): it skips 0, so 0 in .env could not turn the limit off.
  const maxQueueSize =
    nconf.get('maxqueuesize') ?? nconf.get('maxQueueSize') ?? 0;
  return maxQueueSize > 0 && (await getQueueSize(queueName)) >= maxQueueSize;
}
