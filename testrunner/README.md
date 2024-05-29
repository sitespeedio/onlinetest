# The sitespeed.io test runner

The sitespeed.io worker is the worker that runs the sitespeed.io tests in a server/testrunner setup. You can have one runner per host machine and multiple workers per location, working on the same queue of tests.

The test runner will get the tests from a Redis (like) queue. When you start the runner, it needs to be able to connect to the queue.

## Installation
The testrunner needs either sitespeed.io installed globally with it's [dependencies](https://www.sitespeed.io/documentation/sitespeed.io/installation/) or Docker installed.

## Start the test runner

Start the runner with default configuration:

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

## Documentation
I'm working on the documentation and you will find the full documentation at [https://www.sitespeed.io/documentation/onlinetest](https://www.sitespeed.io/documentation/onlinetest) when it's ready.