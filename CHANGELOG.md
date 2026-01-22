# Onlinetest changelog

This changelog combines the server and testrunner changes. The changelog do [semantic versioning](https://semver.org).

## 2.0.0 - 2026-01-22

With the 2.0.0 release we combine the changelog for the server/testrunner and simplifying the releases. They will now be released with the same release number. If you want to find the old CHANGELOG entries, scroll down in this file.

The 2.0.0 release has some breaking changes. The goal with the release is to make the setup more solid. There's been no database changes or setup changes for the server however the docker compose files has been cleaned up and the way of starting the services has changed.

The README.md file is updated new documentation. There's a couple of new things:
* The docker compose file has been splitted into three:
  * The dependencies (Redis, Minio and PostGreSQL)
  * The server
  * The testrunner
* We use Redis by default (instead of KeyDB)
* You should use a .env file for your setup

### Upgrading from 1.X release to 2.0
// Coming soon

### Changed
* Rename defaulLocale configuration to locale [#178](https://github.com/sitespeedio/onlinetest/pull/178). If you used `localization:defaultLocale` that is now `localization:locale`.
* Updated minio to latest release. There are some changes on startup so check the PR and update your docker compose accordingly [#163](https://github.com/sitespeedio/onlinetest/pull/163).
* Switched to default use Redis instead of KeyDB since Redis is Open Source again [#169](https://github.com/sitespeedio/onlinetest/pull/169).
* Reworked the docker compose files [#200](https://github.com/sitespeedio/onlinetest/pull/200) [#202](https://github.com/sitespeedio/onlinetest/pull/202) [#203](https://github.com/sitespeedio/onlinetest/pull/203)
* Always use .env if it exists for both the server and the testrunner (and the compose files) [#190](https://github.com/sitespeedio/onlinetest/pull/190).

### Fixed
* Make sure the configuratiomn (nconf) is never accessed before configuration files is read [#177](https://github.com/sitespeedio/onlinetest/pull/177).
* Bump Postgres to latest version [#172](https://github.com/sitespeedio/onlinetest/pull/172)
* Fix correct path to scripting file [#167](https://github.com/sitespeedio/onlinetest/pull/167).
* Update to sitespeed.io 39 [#171](https://github.com/sitespeedio/onlinetest/pull/171).
* Use Trixie as base image [#185](https://github.com/sitespeedio/onlinetest/pull/185).
* Simplify how we do releases [#206](https://github.com/sitespeedio/onlinetest/pull/206)
* The webserver port was hardcoded, fixed in [#204](https://github.com/sitespeedio/onlinetest/pull/204).
* Renamed the default yaml files for server and testrunner [#199](https://github.com/sitespeedio/onlinetest/pull/199)

### Added
* Docker containers now uses NodeJS 24 [#173](https://github.com/sitespeedio/onlinetest/pull/173).
* German translations, thank you [Tobi](https://github.com/WBT112) for PR [#174](https://github.com/sitespeedio/onlinetest/pull/174).
* Translations: Arabic, Bengali, Spanish, French, Hindi, Portuguese, Russian, Urdu, Simplified Chinese thank you [Tobi](https://github.com/WBT112) for PR [#181](https://github.com/sitespeedio/onlinetest/pull/181).
* Basic Auth for admin now uses .env file and will warn in the logs if no auth is setup [#205](https://github.com/sitespeedio/onlinetest/pull/205).

## Old server changelog

## 1.7.1 - 2025-10-23
### Fixed
* Fix for the search qyuery parameter [#162](https://github.com/sitespeedio/onlinetest/pull/162).

## 1.7.0 - 2025-10-22
### Added
* Updated dependencies (too many PRs).
* Update to NodeJS 22 [#155](https://github.com/sitespeedio/onlinetest/pull/155)

## 1.6.5 - 2025-03-11
### Fixed
* And another fix for script names [#146](https://github.com/sitespeedio/onlinetest/pull/146).

## 1.6.4 - 2025-03-10
### Fixed
* Another fix for showing the script name [#145](https://github.com/sitespeedio/onlinetest/pull/145).

## 1.6.3 - 2025-03-10
### Fixed
* Show only the script name and not the full path [#144](https://github.com/sitespeedio/onlinetest/pull/144).

## 1.6.3 - 2025-02-13
### Fixed
* There was a bug that when you tried to change the URL after you edited a test with a script, you couldn't change the URL [#142](https://github.com/sitespeedio/onlinetest/pull/142).

## 1.6.2 - 2025-02-12
### Fixed
* Another label fix.

## 1.6.1 - 2025-02-12
### Fixed
* Guard against empty labels when changing labels [#141](https://github.com/sitespeedio/onlinetest/pull/141).

## 1.6.0 - 2025-02-12
### Added
* Add functionality to: edit/add alias to a finished test, rerun a test with the exact same configuration and change the URL of a test and rerun with the same configuration [#137](https://github.com/sitespeedio/onlinetest/pull/137).
* You can now configure which favicons that is used [#140](https://github.com/sitespeedio/onlinetest/pull/140).

### Fixed
* Update to latest sitespeed.io/log [#138](https://github.com/sitespeedio/onlinetest/pull/138).

## 1.5.0 - 2025-02-07
### Added
* Changed default text size to medium from large [#135](https://github.com/sitespeedio/onlinetest/pull/135) and [#136](https://github.com/sitespeedio/onlinetest/pull/136).

## 1.4.0 - 2025-02-04
### Added
* Make sure completed tests are linked to the result [#132](https://github.com/sitespeedio/onlinetest/pull/132).
* When hover the result link, show when the test was added, when it run and the connectivity [#133](https://github.com/sitespeedio/onlinetest/pull/133).

## 1.3.0 - 2025-01-30
### Added
* Add link to active test in search [#129](https://github.com/sitespeedio/onlinetest/pull/129).

## 1.2.0 - 2025-01-30
### Added
* You can now search by status. `status:completed`.  [#128](https://github.com/sitespeedio/onlinetest/pull/128).
* Add colors to failure/completes in search results [#127](https://github.com/sitespeedio/onlinetest/pull/127).

### Fixed
* Make sure failing tests with a result is accessible [#126](https://github.com/sitespeedio/onlinetest/pull/126).

## 1.1.3 - 2025-01-27
### Fixed
* Fix: failed rerun tests could get stuck in waiting state [#123](https://github.com/sitespeedio/onlinetest/pull/123).

## 1.1.2 - 2025-01-27
### Fixed
* Fix: rerun for Android picked the wrong queue [#122](https://github.com/sitespeedio/onlinetest/pull/122).

## 1.1.1 - 2025-01-26
### Fixed
* Fix click on location for search [#121](https://github.com/sitespeedio/onlinetest/pull/121).

## 1.1.0 - 2025-01-25
### Added
* You can now re-run a test using the re-run button in the search result. Also hover over the result buttons to see what you can do [#120](https://github.com/sitespeedio/onlinetest/pull/120)

### Fixed
* Use the latest version of the log package [#118](https://github.com/sitespeedio/onlinetest/pull/118).
* Better error logging [#119](https://github.com/sitespeedio/onlinetest/pull/119).
* Fix broken compare button [#120](https://github.com/sitespeedio/onlinetest/pull/120)
* Replace intel log with sitespeed.io log [#117](https://github.com/sitespeedio/onlinetest/pull/117)
* Update following dependencies: compression 1.7.5, execa 9.5.2, Pg 8.13.1, bull  4.16.5 and  helmet 8.0.0.

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

## 0.4.5 - 2024-09-24
### Fixed
* Express 5.0.0 [#86](https://github.com/sitespeedio/onlinetest/pull/86).
* Update body parser [#88](https://github.com/sitespeedio/onlinetest/pull/88).
* Bull 4.16.3 [#87](https://github.com/sitespeedio/onlinetest/pull/87)

## 0.4.2 - 2024-09-09
### Fixed
* Device id was broken in the front end [#80](https://github.com/sitespeedio/onlinetest/pull/80) and [#81](https://github.com/sitespeedio/onlinetest/pull/81).
* The internal configuration was broken in the way that removing/adding testrunners failed removing correct configurations [#84](https://github.com/sitespeedio/onlinetest/pull/84). This fix also needs [#83](https://github.com/sitespeedio/onlinetest/pull/83) in the testrunners.

## 0.4.1 - 2024-08-23
### Fixed
* Fix bug so you can choose emulated mobile in GUI [#76](https://github.com/sitespeedio/onlinetest/pull/76).

## 0.4.0 - 2024-08-02
### Added
* Merged slug/label column in search result [#68](https://github.com/sitespeedio/onlinetest/pull/68)
* Make it possible to choose container that runs the test, using the API [#69](https://github.com/sitespeedio/onlinetest/pull/69/)

## 0.3.2 - 2024-07-15
### Fixed
* Upgrade to Bull 4.15.1 [#57](https://github.com/sitespeedio/onlinetest/pull/57).
* Default to max 50 finished jobs in the queue [#58](https://github.com/sitespeedio/onlinetest/pull/58).
* Update dev dependencies like ESLint 9 [#62](https://github.com/sitespeedio/onlinetest/pull/62).
* Update DayJS 1.11.11 [#63](https://github.com/sitespeedio/onlinetest/pull/63)
* Make sure all uncaught errors are caught [#64](https://github.com/sitespeedio/onlinetest/pull/64)
* Add a keydb configuration file [#56](https://github.com/sitespeedio/onlinetest/pull/56)

## 0.3.1 - 2024-06-29
### Fixed
* If the queue system is down when you add a new test, make sure the status of the test in the database is failed [#50](https://github.com/sitespeedio/onlinetest/pull/50).
* If the queue is not up when you access the start page, make sure that at least after X seconds you get a error page [#53](https://github.com/sitespeedio/onlinetest/pull/53).


## 0.3.0 - 2024-06-28
### Added
* search: Make label configurable in search result [#46](https://github.com/sitespeedio/onlinetest/pull/46).
* search: Make run date readable [#45](https://github.com/sitespeedio/onlinetest/pull/45).
* Show version number in footer and API [#44](https://github.com/sitespeedio/onlinetest/pull/44).

## 0.2.1 - 2024-06-27
### Fixed
* Search: Fix for searching for test type [#42](https://github.com/sitespeedio/onlinetest/pull/42).

## 0.2.0 - 2024-06-27
### Added
* Search: Add a clear search field button and make location and test type linkable in search result [#39](https://github.com/sitespeedio/onlinetest/pull/39).
* Search: Show 100 search result as default and make it configurable [#38](https://github.com/sitespeedio/onlinetest/pull/38).
* Search: Add last hour search button [#40](https://github.com/sitespeedio/onlinetest/pull/40)
* Search: Make it confirable to see the slug column in search result [#41](https://github.com/sitespeedio/onlinetest/pull/41)

## 0.1.0 - 2024-06-26
### Added
* Make removeOnComplete and removeOnFail in the queue configurable. If  you run a large installation with many many tests, you may want to increase the number of tests that will continue to live in the queue after the test has completed (removeOnComplete) [#36](https://github.com/sitespeedio/onlinetest/pull/36).
* Make attempts (number of tries if a test fail) configurable. By default there is one try [#37](https://github.com/sitespeedio/onlinetest/pull/37).

## 0.0.8 - 2024-06-26
### Fixed
* Update to PG 8.12.0 [#34](https://github.com/sitespeedio/onlinetest/pull/34).
* Update to Bull 4.14.0 [#32](https://github.com/sitespeedio/onlinetest/pull/32)
* Only keep 200 of latest completed job in the queue (make this configurable in the future) [#33](https://github.com/sitespeedio/onlinetest/pull/33).

## 0.0.7 - 2024-06-20
### Fixed
* Only link to the search result when we actually have a result [#26](https://github.com/sitespeedio/onlinetest/pull/26).

## 0.0.6
### Fixed
* Fix: Make sure that when passing on scripts using the API, only script and not the script name is validated [#25](https://github.com/sitespeedio/onlinetest/pull/25).

## 0.0.5
### Fixed
* Doing a search there's a lot of data passed around. With [#24](https://github.com/sitespeedio/onlinetest/pull/24) we only pass on data that is showed on the result page.

## 0.0.4
### Fixed
* Make sure URLs are kept as is in the database and when sent to the testrunner [#22](https://github.com/sitespeedio/onlinetest/pull/22). This makes sense so your test can keep running as before when you move your tesing to server/testrunner.

## 0.0.3 -  2024-06-04
### Fixed
* Updated to Pug 3.0.3 [#12](https://github.com/sitespeedio/onlinetest/pull/12).

## 0.0.2 -  2024-06-02
### Fixed
* Catch if the configured regular expression is broken [#7](https://github.com/sitespeedio/onlinetest/pull/7).
* Make sure API submited tests also uses the default sitespeed.io configuration configured on the server [#9](https://github.com/sitespeedio/onlinetest/pull/9).

## 0.0.1 - 2024-05-29

Welcome to the first release of the sitespeed.io server!

### Added
* Basic functionality.

## Old testrunner changelog

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