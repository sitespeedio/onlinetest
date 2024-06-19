
# sitespeed.io server changelog (we do [semantic versioning](https://semver.org))

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