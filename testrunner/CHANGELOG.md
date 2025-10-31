# Testrunner changelog (we do [semantic versioning](https://semver.org))

## 1.2.1 - 2025-10-31
### Fixed
* Tests running in the Docker container has the wrong path to the scripting file [#167](https://github.com/sitespeedio/onlinetest/pull/167).

## 1.2.0 - 2025-10-22
### Added
* Update to sitespeed.io 38 [#158](https://github.com/sitespeedio/onlinetest/pull/158)
* Update to NodeJS 22 [#155](https://github.com/sitespeedio/onlinetest/pull/155)
### Fixed
* Updated dependencies (too many PRs).

## 1.1.0 - 2025-02-12
### Added
* Updated to sitespeed.io 36 as default version [#134](https://github.com/sitespeedio/onlinetest/pull/134).

### Fixed
* Use latest version of sitespeed.io/logs [#138](https://github.com/sitespeedio/onlinetest/pull/138).
* Safer trap for WPR processes when running NodeJS Testrunner [#139](https://github.com/sitespeedio/onlinetest/pull/139).

## 1.0.7 - 2025-02-04
### Fixed
* Fix to make sure WPR always is killed whatever happens [#131](https://github.com/sitespeedio/onlinetest/pull/131).

## 1.0.6 - 2025-01-31
### Fixed
* Disable verbose logging from GUI [#130](https://github.com/sitespeedio/onlinetest/pull/130).

## 1.0.5 - 2025-01-30
### Fixed
* Make sure failing tests with a result is accessible [#126](https://github.com/sitespeedio/onlinetest/pull/126).

## 1.0.4 - 2025-01-25
### Fixed
* Replace Intel log with @sitespeed.io/log [#117](https://github.com/sitespeedio/onlinetest/pull/117).

## 1.0.3 - 2024-12-18
### Fixed
* Fix killing WebPageReplay correctly and correct path to WebPageReplay files [#108](https://github.com/sitespeedio/onlinetest/pull/108).

## 1.0.2 - 2024-12-18
### Fixed
* Fix broken path to the WebPageReplay script when running as npm package and fix so you also can run desktop test using WebPageReplay when you use npm [#107](https://github.com/sitespeedio/onlinetest/pull/107).

## 1.0.1 - 2024-12-06
### Fixed
* Fixed the release flow so the Docker containers get the correct tag.

## 1.0.0 - 2024-12-06
Hello and welcome to 1.0.0! In this release we aim to make it easier to run the full setup in Docker!

### Breaking change
With the release of 1.0.0 we makes it possible to configure sitespeed.io with the server/testrunner.yml file [#92](https://github.com/sitespeedio/onlinetest/pull/92).

That makes things so much easier when doing a default setup. However with this change we also retire the *config/sitespeed.json* configuration on the server. If you used that, you need to move that configuration to the yaml file for the server.

To start the server and a test runner locally on your machine you use docker compose:
```docker compose -f docker-compose.yml -f docker-compose.app.yml up```

If you only wants to start the dependencies:
```docker compose -f docker-compose.yml up```

When you run the dockerised version of the testrunner, the default setup use the last major version of sitespeed.io.

### Added
* A new Docker setup [#95](https://github.com/sitespeedio/onlinetest/pull/95)

## 0.5.6 - 2024-09-24
### Fixed
*  Bull 4.16.3 [#87](https://github.com/sitespeedio/onlinetest/pull/87)

## 0.5.3 - 2024-08-02
### Fixed
* Correctly set the hostname in the configuration file [#83](https://github.com/sitespeedio/onlinetest/pull/83).

## 0.5.2 - 2024-08-02
### Fixed
* Fix a bug setting the baseline for compare plugin [#71](https://github.com/sitespeedio/onlinetest/pull/71).

## 0.5.1 - 2024-08-02
### Fixed
* Correct version in package.json

## 0.5.0 - 2024-08-02
### Added
* When running compare plugin tests using Docker, set the baseline directory automatically [#70](https://github.com/sitespeedio/onlinetest/pull/70)
* * Make it possible to choose container that runs the test, using the API [#69](https://github.com/sitespeedio/onlinetest/pull/69/)

## 0.4.1 - 2024-07-30
### Fixed
* Log testrunner version on startup [#67](https://github.com/sitespeedio/onlinetest/pull/67).

## 0.4.0 - 2024-07-30
### Added
* Made it possible to map a baseline directory in Docker so you can run compare plugin tests [#66](https://github.com/sitespeedio/onlinetest/pull/66).

## 0.3.3 - 2024-07-30
### Fixed
* Fix for running WebPageReplay [#65](https://github.com/sitespeedio/onlinetest/pull/65).

## 0.3.2 -2024-07-15
### Fixed
* Upgrade to Bull 4.15.1 [#57](https://github.com/sitespeedio/onlinetest/pull/57).
* Default to max 50 finished jobs in the queue [#58](https://github.com/sitespeedio/onlinetest/pull/58).
* Upgrade dev dependencies: unicorn [#61](https://github.com/sitespeedio/onlinetest/pull/61), eslint [#60](https://github.com/sitespeedio/onlinetest/pull/60),
* Update joi and execa [#59](https://github.com/sitespeedio/onlinetest/pull/59).
* Make sure all uncaught errors are caught [#64](https://github.com/sitespeedio/onlinetest/pull/64)
### Added
* Version bump to sync tags.

## 0.2.1 - 2024-06-30
### Fixed
* Make sure we await adding things to the report queue [#55](https://github.com/sitespeedio/onlinetest/pull/55).
* Catch errors in all queue [#54](https://github.com/sitespeedio/onlinetest/pull/54).

## 0.2.0 - 2024-06-26
### Added
* Make removeOnComplete and removeOnFail in the queue configurable. If  you run a large installation with many many tests, you may want to increase the number of tests that will continue to live in the queue after the test has completed (removeOnComplete) [#35](https://github.com/sitespeedio/onlinetest/pull/35).

## 0.1.5 - 2024-06-26
### Fixed
* Update to Bull 4.14.0 [#32](https://github.com/sitespeedio/onlinetest/pull/32)
* Only keep 200 of latest completed job in the queue (make this configurable in the future) [#33](https://github.com/sitespeedio/onlinetest/pull/33).

## 0.1.4 - 2024-06-24
### Fixed
* Using common JS script files was broken, fixed in [#30](https://github.com/sitespeedio/onlinetest/pull/30).
* Log test id in start log.

## 0.1.3 - 2024-06-20
### Fixed
* Simplify Docker mapping inside the Docker testrunner [#27](https://github.com/sitespeedio/onlinetest/pull/27). This fixes running script files with the testrunner.
* A better cleanup in the work directory for Docker [#28](https://github.com/sitespeedio/onlinetest/pull/28).


## 0.1.2 - 2024-06-19
### Fixed
* Set --cap-add=NET_ADMIN as default for extraparameters (needed for throttling.
* Fix using an extra configuration file in Docker. Before it added an extra folder (that makes it really hard to use) [#23](https://github.com/sitespeedio/onlinetest/pull/23).

## 0.1.1 - 2024-06-18
### Fixed
* Make sure that API calls aren't passed on within the testrunner [#21](https://github.com/sitespeedio/onlinetest/pull/21).

## 0.1.0 - 2024-06-17
### Added
* Pass on extra parameters to the Docker container using `--docker.extraparameters` [#19](https://github.com/sitespeedio/onlinetest/pull/19). The parameters will be split by space and passed on to Docker between run and the name of the container.

## 0.0.1 - 2024-05-29

Welcome to the first release of the testrunner!

### Added
* Basic functionality.