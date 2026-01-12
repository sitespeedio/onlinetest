#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "${ROOT_DIR}/server" ] || [ ! -d "${ROOT_DIR}/testrunner" ]; then
  echo "Run this script from the repository root."
  exit 1
fi

if [ -z "$1" ]; then
  echo "Usage: ./release.sh <version>"
  exit 1
fi

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-.+)?$ ]]; then
  echo "Version must be semver (e.g. 1.2.3)"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is not clean."
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Releases must be cut from main (current: $CURRENT_BRANCH)."
  exit 1
fi

npm whoami >/dev/null

VERSION="$1"

echo "Releasing server version $VERSION"
cd "${ROOT_DIR}/server"
npm version "$VERSION" --no-git-tag-version
npm publish

echo "Releasing testrunner version $VERSION"
cd "${ROOT_DIR}/testrunner"
npm version "$VERSION" --no-git-tag-version
npm publish

cd "${ROOT_DIR}"
git add server/package.json testrunner/package.json
git commit -m "Release v$VERSION"
git push

VERSION_TAG="v${VERSION}"

git tag -a "$VERSION_TAG" -m "Release $VERSION_TAG"
git push --follow-tags