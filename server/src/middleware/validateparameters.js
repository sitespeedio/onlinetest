import { getText } from '../util/text.js';
import { isScriptingAllowed } from '../util/scripting.js';
import { nconf } from '../config.js';

// The GUI sets the iterations in a field, but a user can also add them in
// the command line field.
function getGuiIterations(body) {
  const fromExtras = [
    ...String(body.extras || '').matchAll(
      /(?:^|\s)(?:-n|--browsertime\.iterations)(?:=|\s+)(\d+)/g
    )
  ].map(match => Number(match[1]));
  return Math.max(Number(body.iterations) || 0, ...fromExtras);
}

export const validateParameters = (request, response, next) => {
  let url = request.body.url;

  if (!url && request.body._) {
    url = request.body._[0];
  }

  // Check minmum parameters
  // The minimun is these three
  // Lets add more verification later ...
  const api = request.body.api || {};
  const scripting = request.body.scripting || api.scripting;
  const location = request.body.location || api.location;
  const testType = request.body.testType || api.testType;

  if (scripting && !isScriptingAllowed(request.baseUrl === '/api')) {
    request.inputValidationError = getText('error.scriptingdisabled');
    return next();
  }
  const maxIterations = nconf.any('maxiterations', 'maxIterations');
  if (
    request.baseUrl !== '/api' &&
    maxIterations &&
    getGuiIterations(request.body) > maxIterations
  ) {
    request.inputValidationError = getText(
      'error.validation.toomanyiterations',
      maxIterations
    );
    return next();
  }
  if (!url && !scripting) {
    request.inputValidationError = getText(
      'error.validation.missingurlorscripting'
    );
    return next();
  }
  if (!location) {
    request.inputValidationError = getText('error.validation.missinglocation');
    return next();
  }
  if (!testType) {
    request.inputValidationError = getText('error.validation.missingtesttype');
    return next();
  }
  next();
};
