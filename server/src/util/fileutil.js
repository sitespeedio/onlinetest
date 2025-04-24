import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function getBaseFilePath(theFile) {
  const currentFileUrl = import.meta.url;
  const currentFilePath = fileURLToPath(currentFileUrl);
  const currentDirectory = dirname(currentFilePath);
  return path.resolve(currentDirectory, '../../', theFile);
}
