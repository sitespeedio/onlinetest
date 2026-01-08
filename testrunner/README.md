# The sitespeed.io test runner

The sitespeed.io worker is the worker that runs the sitespeed.io tests in a server/testrunner setup. You can have one runner per host machine and multiple workers per location, working on the same queue of tests.

The test runner will get the tests from a KeyDB (Redis like) queue. When you start the runner, it needs to be able to connect to the queue.

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

Take a copy of the [default configuration](https://github.com/sitespeedio/onlinetest/blob/main/testrunner/config/testrunner.yaml) and adopt it to your own setup.


## How tests are run

You can choose to either run the tests using the sitespeed.io container or install sitespeed.io/dependencies and browsers yourself.

If you choose to use Docker, set `useDocker` to true in the configuration. Then all you need to do is to make sure to have Docker installed on the server.

You can configure which Docker container to use. Normally when you run sitespeed.io you should configure the exact sitespeed.io version like *sitespeedio/sitespeed.io:36.0.0* to know exact which version you are using. However if you want to deploy your testrunner and then let it auto update to a stable release, you can use *sitespeedio/sitespeed.io:36* as the tag and then make sure that you once per day update the container `docker pull sitespeedio/sitespeed.io:36`.

```yaml
docker:
  container: "sitespeedio/sitespeed.io:36"
```

If you do not use Docker you can follow [these instructions](https://www.sitespeed.io/documentation/sitespeed.io/installation/) to install sitespeed.io. If you plan to run Android tests, make sure to install FFMPEG and the Python dependencies needed to get visual metrics.

## Queues
Desktop and emulated mobile tests will work on tests that comes in the queue named `location.name` in your configuration. That means if you setup miltiple servers with the same location.name, they will work on the same queue, meaning take on the same amount of tests as you have runners at the same time.

For Android tests the default setting is one queue per device (device id). That means that you need to choose the exact device and run the test on that device. However there's also a configuration option where you can add the queue name in the configuration. The config is `queue`. That way you can setup multiple Android devices to work on the same queue.

Setting the same queue like this will make both phones take on tests on the same queue.
```yaml
- name: "Android"
   type: "android"
   browsers: ["chrome", "firefox"]
   model: "Moto G5"
   deviceId: "ZY322MMFZ1"
   useDocker: false
   connectivity: ["native"]
   queue: "motog5"

- name: "Android"
   type: "android"
   browsers: ["chrome", "firefox"]
   model: "Moto G5"
   deviceId: "XY322MMFZ1"
   useDocker: false
   connectivity: ["native"]
   queue: "motog5"
```

## Documentation
[Read the onlinetest documenation](https://www.sitespeed.io/documentation/onlinetest).
