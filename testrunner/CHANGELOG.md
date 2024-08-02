# Testrunner changelog (we do [semantic versioning](https://semver.org))

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