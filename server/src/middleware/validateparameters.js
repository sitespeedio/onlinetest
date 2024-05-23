import { getText } from '../util/text.js';

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
