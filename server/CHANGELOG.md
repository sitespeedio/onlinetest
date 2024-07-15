
# sitespeed.io server changelog (we do [semantic versioning](https://semver.org))

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