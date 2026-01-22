[![Test the API](https://github.com/sitespeedio/onlinetest/actions/workflows/api.yml/badge.svg)](https://github.com/sitespeedio/onlinetest/actions/workflows/api.yml)
[![Test the GUI (NodeJS)](https://github.com/sitespeedio/onlinetest/actions/workflows/nodejs-gui.yml/badge.svg)](https://github.com/sitespeedio/onlinetest/actions/workflows/nodejs-gui.yml)
[![Test the GUI (Docker)](https://github.com/sitespeedio/onlinetest/actions/workflows/docker-gui.yml/badge.svg)](https://github.com/sitespeedio/onlinetest/actions/workflows/docker-gui.yml)
[![Using Docker](https://github.com/sitespeedio/onlinetest/actions/workflows/docker.yml/badge.svg)](https://github.com/sitespeedio/onlinetest/actions/workflows/docker.yml)
[![Lint](https://github.com/sitespeedio/onlinetest/actions/workflows/lint.yml/badge.svg)](https://github.com/sitespeedio/onlinetest/actions/workflows/lint.yml)

[Website](https://www.sitespeed.io/) | [Documentation](https://www.sitespeed.io/documentation/onlinetest/) | [Changelog server](https://github.com/sitespeedio/onlinetest/blob/main/server/CHANGELOG.md) | [Changelog testrunner](https://github.com/sitespeedio/onlinetest/blob/main/testrunner/CHANGELOG.md) | [Bluesky](https://bsky.app/profile/sitespeed.io) | [Mastodon](https://fosstodon.org/@sitespeedio)

# Onlinetest - deploy your own version of sitespeed.io online.

Setup your own online version of sitespeed.io. You get:

* **A server with GUI and API**:
   - Add tests using a HTML frontend (you can style the frontend using your own CSS)
   ![Start screen](https://raw.githubusercontent.com/sitespeedio/onlinetest/refs/heads/main/img/startscreen.png)
   - Add tests using [the command line](https://www.sitespeed.io/documentation/onlinetest/#using-the-api) (using `sitespeed.io --api.hostname my.host.com --api.location default https://www.sitespeed.io`)

* **Test Runners**:
   - Run your tests on different platforms: desktop, emulated mobile and Android.

* **Search Functionality**:
   - Easily find the results of your tests.
      ![Search screen](https://raw.githubusercontent.com/sitespeedio/onlinetest/refs/heads/main/img/search.png)


## Quick setup on your local machine (using Docker)

Follow these steps to quickly set up and run the online version of sitespeed.io on your local Linux or Mac OS machine. Make sure you have [Docker](https://www.docker.com) and [docker compose](https://docs.docker.com/compose/) installed. The default Docker compose setup use the same Docker network and have only the ports open that is needed.

1. **Clone the repository:**

    ```bash
    git clone https://github.com/sitespeedio/onlinetest.git
    ```

2. **Navigate to the project directory:**

    ```bash
    cd onlinetest
    ```
3. **Copy the example environment file:**
    ```bash
    cp .env.example .env
    ```

4. **Start the Docker containers (Redis/PostgreSQL/Minio/sitespeed.io server and testrunner) on the same server:**

    ```bash
    docker compose -f docker-compose.dependencies.yml -f docker-compose.server.yml -f docker-compose.testrunner.yml up
    ```

Now you can open your web browser and navigate to [http://127.0.0.1:3000](http://127.0.0.1:3000) to run your first test.

If you are on Linux you need to run `sudo modprobe ifb numifbs=1` to be able to set different connectivites inside of Docker. On Mac you can only run native connectivity when you run inside of Docker.

To deploy on a server you should [check the production setup](https://github.com/sitespeedio/onlinetest?tab=readme-ov-file#setup-for-production).

### Configuration

The **[.env.example](https://github.com/sitespeedio/onlinetest/blob/main/.env.example)** has the configuration that you usually needs to change/configure between different environment. If you use the .env file, it will automatically be picked up.

You can configure everything that you are used to configure with sitespeed.io + more. The server and the testrunner takes `--config /path/to/file`.

### Change which pages/URLs you can test
There's a regular expression that validates the domain of the URL that you want to test. You can use this to make sure a public instance only can tests pages on your web sites.

```VALID_TEST_DOMAINS=".*"```

### Update sitespeed.io version
By default latest major release of sitespeed.io is configured, it looks like this in the **.env** file:
`SITESPEED_IO_CONTAINER="sitespeedio/sitespeed.io:39"`

When 40 is released you just switch to:
`SITESPEED_IO_CONTAINER="sitespeedio/sitespeed.io:40"`

To get latest version of 35 you need to periodically pull down the version:
```docker pull sitespeedio/sitespeed.io:35```

If you want to run a specific version, you can pin the version to a specific version:
`SITESPEED_IO_CONTAINER="sitespeedio/sitespeed.io:39.0.0"`

#### Access the result
Running on your own machine the result is served from localhost. If you deploy on a server you want to change that:

```RESULT_BASE_URL="http://127.0.0.1:9000/sitespeedio"```

By default the result is served by [MinIO](https://min.io) on port 9000. If you serve the result on the URL `https://sitespeed.domain.com` you change your result base to: ```RESULT_BASE_URL="https://sitespeed.domain.com/sitespeedio"```

#### Update server and testrunner
You can configure which version of the server and the testrunner you want to use. You can either use latest stable version or specify a specific tag. In the *.env* file you configure which Docker tag to use.

```
SITESPEED_IO_SERVER_VERSION=1
SITESPEED_IO_TESTRUNNER_VERSION=1
```

## Using NodeJS
If you do not want to use Docker for the server and the testrunner you can use NodeJS libraries directly. Install the testrunner and the server:

```bash
npm install @sitespeed.io/server -g
npm install @sitespeed.io/testrunner -g
```

You then need the depencencies (PostgreSQL/KeyDB etc) and the easiet way to get them running is to use the docker compose file:

```bash
git clone https://github.com/sitespeedio/onlinetest.git
cd onlinetest
docker compose -f docker-compose.dependencies.yml -f standalone/docker-compose.dependencies.standalone.yml  -f  -d
```

Then start the testrunner and the server:

```bash
sitespeed.io-testrunner
sitespeed.io-server
```

In the real world you want to also supply your own configuration files. Default [server configuration](https://github.com/sitespeedio/onlinetest/blob/main/server/config/server.yaml) and [testrunner configuration](https://github.com/sitespeedio/onlinetest/blob/main/testrunner/config/server.yaml):

```bash
sitespeed.io-testrunner --config path/to/testrunnerfile
sitespeed.io-server --config path/to/file
```

## What's in the box?

To get it up and running (the [docker-compose file](https://github.com/sitespeedio/onlinetest/blob/main/docker-compose.yml)), you need:

* **A Message broker**: - A Redis-like data storage/message broker. The default setup uses [keydb](https://docs.keydb.dev) and has also been tested with [Valkey](https://github.com/valkey-io/valkey).

* **A Database**: - [PostgreSQL](https://www.postgresql.org) - the open source database.

* **A Test Result Storage**: - Somewhere to store test results. The default setup uses [minio](https://min.io), an open source implementation of S3 but you can use all the result storages that work with sitespeed.io: S3, Google Cloud Storage or your own storage where you can scp the result.

Additionally, there's a server and one or multiple test runners that run the sitespeed.io tests.

## Setup for production
This is a minimal production oriented flow that starts from a tagged release. It assumes you will run the server, dependencies and one or more testrunners in Docker (but you can also use the NodeJS services directly if you prefer!).

We use a couple of standalone compose files that will override some settings in the default compose like open ports and changing some dependencies.

1. **Clone the repository and checkout a tag:**

    ```bash
    git clone https://github.com/sitespeedio/onlinetest.git
    cd onlinetest
    git fetch --tags
    git checkout <tag>
    ```

2. **Configure environment variables:**

    Copy `.env.example` to `.env` and adjust values for your environment (database credentials, S3/MinIO, public URLs, and version pins). At minimum:
    - Replace all `CHANGE_ME_*` passwords (`REDIS_PASSWORD`, `POSTGRESQL_PASSWORD`, `MINIO_PASSWORD`) with your own passwords.
    - Change `RESULT_BASE_URL` `SITESPEED.IO_HTML_HOMEURL` and `SITESPEED_IO_S3_ENDPOINT`. They need to point to that domain (or IP) that you will use.
    - Verify `SITESPEED_IO_SERVER_VERSION`, and `SITESPEED_IO_TESTRUNNER_VERSION`.

3. **Deploy the core services (server + dependencies):**

    On your primary host, start the dependencies and the server:

    ```bash
    docker compose -f docker-compose.dependencies.yml -f standalone/docker-compose.dependencies.standalone.yml  docker-compose.server.yml -f standalone/docker-compose.server.standalone.yml up -f  -d
    ```

4. **Deploy the testrunner(s):**

    Run one or more testrunners on separate machines for isolation and scale. On each testrunner host you need to give Docker the right to change connectivity by running `sudo modprobe ifb numifbs=1` and then start the testrunner:

    ```bash
    docker compose -f docker-compose.testrunner.yml -f standalone/docker-compose.testrunner.standalone.yml up -d
    ```

    If you want to keep everything on a single server, you can also run all services together and then make sure

    ```bash
    docker compose -f docker-compose.dependencies.yml -f docker-compose.server.yml -f docker-compose.testrunner.yml up -d
    ```

5. **Setup a firewall**
    If you deploy on multiple servers you need to setup a firewall so only the servers has access to Redis, Minio and Postgres Do that with *iptables* since UFW (Uncomplicated Firewall) do not work with Docker.

6. **Verify connectivity:**

    Confirm the server can reach the testrunner(s) and that results are written to your configured storage. Use the UI or API to submit a test and ensure it completes end to end.


## Support
Running servers and testing costs money and you can help support sitespeed.io at [Open Collective](https://opencollective.com/sitespeedio).

## License
[AGPL-3.0 license](LICENSE).
