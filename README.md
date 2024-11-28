[![Test the API](https://github.com/sitespeedio/onlinetest/actions/workflows/api.yml/badge.svg)](https://github.com/sitespeedio/onlinetest/actions/workflows/api.yml)
[![Test the GUI](https://github.com/sitespeedio/onlinetest/actions/workflows/gui.yml/badge.svg)](https://github.com/sitespeedio/onlinetest/actions/workflows/gui.yml)
[![Using Docker](https://github.com/sitespeedio/onlinetest/actions/workflows/docker.yml/badge.svg)](https://github.com/sitespeedio/onlinetest/actions/workflows/docker.yml)
[![Lint](https://github.com/sitespeedio/onlinetest/actions/workflows/lint.yml/badge.svg)](https://github.com/sitespeedio/onlinetest/actions/workflows/lint.yml)


[Website](https://www.sitespeed.io/) | [Documentation](https://www.sitespeed.io/documentation/onlinetest/) | [Changelog server](https://github.com/sitespeedio/onlinetest/blob/main/server/CHANGELOG.md) | [Changelog testrunner](https://github.com/sitespeedio/onlinetest/blob/main/testrunner/CHANGELOG.md) | [Mastodon](https://fosstodon.org/@sitespeedio)

# Onlinetest - deploy your own version of sitespeed.io online.

Setup your own online version of sitespeed.io. You get:

* **A server with GUI and API**:
   - Add tests using a HTML frontend
   - Add tests using the the command line (using sitespeed.io) through the API

* **Test Runners**:
   - Run your tests on different platforms: desktop, emulated mobile and Android.

* **Search Functionality**:
   - Easily find the results of your tests.


## Quick setup on your local machine

Follow these steps to quickly set up and run the online version of sitespeed.io on your local Linux or Mac OS machine. Make sure you have [Docker](https://www.docker.com) and [docker compose](https://docs.docker.com/compose/) installed.

1. **Clone the repository:**

    ```bash
    git clone https://github.com/sitespeedio/onlinetest.git
    ```

2. **Navigate to the project directory:**

    ```bash
    cd onlinetest
    ```

3. **Start the Docker containers (Redis/PostgreSQL/Minio/sitespeed.io server and testrunner):**

    ```bash
    docker compose -f docker-compose.yml -f docker-compose.app.yml up
    ```

Now you can open your web browser and navigate to [http://127.0.0.1:3000](http://127.0.0.1:3000) to run your first test.


### Configuration
You can configure everything that you are used to configure with sitespeed.io + more. Use the **.env** file to configure your setup.

### Change which pages/URLs you can test
There's a regular expression that validates the domain of the URL that you want to test. You can use this to make sure a public instance only can tests pages on your web sites.

```VALID_TEST_DOMAINS=".*"```

### Update sitespeed.io version
By default latest major release of sitespeed.io is configured, it looks like this in the **.env** file:
`SITESPEED_IO_CONTAINER="sitespeedio/sitespeed.io:35"`

When 36 is released you just switch to:
`SITESPEED_IO_CONTAINER="sitespeedio/sitespeed.io:36"`

To get latest version of 35 you need to periodically pull down the version:
```docker pull sitespeedio/sitespeed.io:35```

If you want to run a specific version, you can pin the version to a specific version:
`SITESPEED_IO_CONTAINER="sitespeedio/sitespeed.io:35.0.0"`

#### Access the result
Running on your own machine the result is served from localhost. If you deploy on a server you want to change that:

```RESULT_BASE_URL="http://127.0.0.1:9000/sitespeedio"```

By default the result is served by MinIO on port 9000.


#### Update server and testrunner
SITESPEED_IO_SERVER_VERSION=latest
SITESPEED_IO_TESTRUNNER_VERSION=latest



## What's in the box?

To get it up and running (the [docker-compose file](https://github.com/sitespeedio/onlinetest/blob/main/docker-compose.yml)), you need:

* **A Message broker**: - A Redis-like data storage/message broker. The default setup uses [keydb](https://docs.keydb.dev) and has also been tested with [Valkey](https://github.com/valkey-io/valkey).

* **A Database**: - [PostgreSQL](https://www.postgresql.org) - the open source database.

* **A Test Result Storage**: - Somewhere to store test results. The default setup uses [minio](https://min.io), an open source implementation of S3 but you can use all the result storages that work with sitespeed.io: S3, Google Cloud Storage or your own storage where you can scp the result.

Additionally, there's a server and one or multiple test runners that run the sitespeed.io tests.

## Setup for production
Onlinetest is super flexible and highly configurable. I'm working on the documentation and you will find the full documentation at [https://www.sitespeed.io/documentation/onlinetest](https://www.sitespeed.io/documentation/onlinetest) when it's ready.

## Support
Running servers and testing costs money and you can help support sitespeed.io at [Open Collective](https://opencollective.com/sitespeedio).

## License
[AGPL-3.0 license](LICENSE).