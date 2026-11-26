import { nconf } from '../config.js';

// allowCommandLine: true shows the Command line tab, where a GUI user can add
// sitespeed.io options to a test. The default is false, because the options
// can make the testrunner open URLs that do not match validTestDomains.
export function isCommandLineAllowed() {
  // Not nconf.any(): it skips false, so false in .env could not override
  // true in server.yaml.
  return (
    (nconf.get('allowcommandline') ?? nconf.get('allowCommandLine')) === true
  );
}
