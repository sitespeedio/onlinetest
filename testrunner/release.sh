#!/bin/bash
set -e
# You need np for this to work
# npm install --global np

npm config set tag-version-prefix=testrunner-v
np $* --no-tests
npm config set tag-version-prefix=v

# bin/browsertime.js --help > ../sitespeed.io/docs/documentation/browsertime/configuration/config.md

node app.js --version | tr -d '\n' > ../../sitespeed.io/docs/_includes/version/testrunner.txt