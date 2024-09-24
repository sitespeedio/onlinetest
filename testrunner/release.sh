#!/bin/bash
set -e
# Super simple release script for browsertime
# Lets use it it for now and make it better over time :)
# You need np for this to work
# npm install --global np

npm config set tag-version-prefix=testrunner-v
np $* --no-yarn --yolo
npm config set tag-version-prefix=v

# bin/browsertime.js --help > ../sitespeed.io/docs/documentation/browsertime/configuration/config.md

node app.js --version | tr -d '\n' > ../../sitespeed.io/docs/_includes/version/testrunner.txt