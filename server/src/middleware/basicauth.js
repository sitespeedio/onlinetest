export class BasicAuth {
  constructor(login, password, accessMessage, failMessage, skipURL) {
    this.login = login;
    this.password = password;
    this.accessMessage = accessMessage;
    this.failMessage = failMessage;
    this.skipURL = skipURL;
  }

  authenticate(request, response, next) {
    if (this.skipURL && request.path.startsWith(this.skipURL)) {
      return next();
    }

    const b64auth = (request.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64')
      .toString()
      .split(':');

    if (login === this.login && password === this.password) {
      return next();
    }

    // Prompt for login if authentication fails
    response.set('WWW-Authenticate', `Basic realm="${this.accessMessage}"`);
    response.status(401).send(this.failMessage);
  }
}
