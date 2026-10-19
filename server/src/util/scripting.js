import { nconf } from '../config.js';

// disableScripting: true turns off all scripting tests. 'gui' (the default)
// turns them off in the web GUI only, so they need the API key. false turns
// them on everywhere. Other values turn them off.
export function isScriptingAllowed(fromAPI) {
  // Not nconf.any(): it skips false, so false in .env could not override
  // the gui default in server.yaml.
  const setting =
    nconf.get('disablescripting') ?? nconf.get('disableScripting') ?? 'gui';
  return setting === 'gui' ? fromAPI : !setting;
}
