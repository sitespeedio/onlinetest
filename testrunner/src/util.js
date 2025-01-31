// eslint-disable-next-line unicorn/import-style
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function getBaseFilePath(theFile) {
  const currentFileUrl = import.meta.url;
  const currentFilePath = fileURLToPath(currentFileUrl);
  const currentDirectory = dirname(currentFilePath);
  return path.resolve(currentDirectory, '../', theFile);
}

export function removeFlags(arguments_) {
  if (!arguments_) {
    return [];
  }

  return arguments_.filter(
    flag => !['--verbose', '-v', '-vv', '-vvv'].includes(flag)
  );
}
