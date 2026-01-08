# The sitespeed.io server

The sitespeed.io server is the server in the server/testrunner setup. You can have one server per setup.

The server will add tests in a KeyDB (Redis like) queue. When you start the runner, it needs to be able to connect to the queue and a Postgresql instance.


## Start

You can start the server that will run with default configuration:

```
node ./app.js
```

If you need to override a couple of configurations you can do that with the command line parameters:

```
node ./app.js --redis.host MY_HOST
```

By defalut the test regex is set to match Wikipedia domains and you probably want to change that. For example if you when testing just want to be able to test whatever domain you can add test:

```
node ./app.js --validTestDomains ".*"
```


You can also provide your own configuration file (recommended). The configuration file can be YAML or JSON:

```
node ./app.js --config /path/to/config.yaml
```

Take a copy of the [default configuration](https://github.com/sitespeedio/onlinetest/blob/main/server/config/server.yaml) and adapt it to your setup.
