[![Test the API](https://github.com/sitespeedio/onlinetest/actions/workflows/api.yml/badge.svg)](https://github.com/sitespeedio/onlinetest/actions/workflows/api.yml)
[![Test the GUI](https://github.com/sitespeedio/onlinetest/actions/workflows/gui.yml/badge.svg)](https://github.com/sitespeedio/onlinetest/actions/workflows/gui.yml)
[![Using Docker](https://github.com/sitespeedio/onlinetest/actions/workflows/docker.yml/badge.svg)](https://github.com/sitespeedio/onlinetest/actions/workflows/docker.yml)
[![Lint](https://github.com/sitespeedio/onlinetest/actions/workflows/lint.yml/badge.svg)](https://github.com/sitespeedio/onlinetest/actions/workflows/lint.yml)


[Website](https://www.sitespeed.io/) | [Documentation](https://www.sitespeed.io/documentation/onlinetest/) | [Changelog server](https://github.com/sitespeedio/onlinetest/blob/main/server/CHANGELOG.md) | [Changelog testrunner](https://github.com/sitespeedio/onlinetest/blob/main/testrunner/CHANGELOG.md) | [Mastodon](https://fosstodon.org/@sitespeedio)

# Onlinetest - deploy your own version of sitespeed.io online.

This project helps you set up your own online version of sitespeed.io. You get:

* **A server with GUI and API**:
   - Add tests using a HTML frontend
   - Add tests using the the command line (using sitespeed.io) through the API

* **Test Runners**:
   - Run your tests on different platforms: desktop, emulated mobile and Android.

* **Search Functionality**:
   - Easily find the results of your tests.


## Quick setup on your local machine

Follow these steps to quickly set up and run the online version of sitespeed.io on your local machine. Make sure you have [Docker](https://www.docker.com), [docker-compose](https://docs.docker.com/compose/), [sitespeed.io](https://www.sitespeed.io/documentation/sitespeed.io/installation/) and [NodeJS](https://nodejs.org/) installed on your machine.

1. **Clone the repository:**

    ```bash
    git clone https://github.com/sitespeedio/onlinetest.git
    ```

2. **Navigate to the project directory:**

    ```bash
    cd onlinetest
    ```

3. **Start the Docker containers (Redis/PostgreSQL/Minio):**

    ```bash
    docker compose up
    ```

4. **Open a new terminal tab or window and navigate to the server directory:**

    ```bash
    cd server
    ```

5. **Start the server:**

    ```bash
    node app.js
    ```

6. **Open another new terminal tab or window and navigate to the testrunner directory:**

    ```bash
    cd ../testrunner
    ```

7. **Start the testrunner:**

    ```bash
    node app.js
    ```

Now you can open your web browser and navigate to [http://127.0.0.1:3000](http://127.0.0.1:3000) to run your first test.


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