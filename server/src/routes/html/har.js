import { Router } from 'express';
export const har = Router();

har.post('/', async function (request, response) {
  const hars = request.body.har;
  if (Array.isArray(hars) && hars.length > 1) {
    return response.redirect(
      '/compare/index.html?har1=/api/har/' +
        hars[0] +
        '&har2=/api/har/' +
        hars[1]
    );
  } else if (Array.isArray(hars)) {
    return response.redirect('/compare/index.html');
  } else {
    // compare=1 compares the runs in the HAR, else compare only fills
    // in the URL field.
    return response.redirect(
      '/compare/index.html?compare=1&har1=/api/har/' + hars
    );
  }
});
