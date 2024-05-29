# The sitespeed.io server

The sitespeed.io server is the server in the server/testrunner setup. You can have one server per setup.

The server will add tests in a Redis (like) queue. When you start the runner, it needs to be able to connect to the queue and a Postgresql instance.


## Start

You can start the server that will run with default configuration:

```
node ./app.js
```

If you need to override a couple of configurations you can do that with the command line parameters:

```
node ./app.js --redis.host MY_HOST
```

You can also provide your own configuration file (recommended). The configuration file can be YAML or JSON:

```
node ./app.js --config /path/to/config.yaml
```
