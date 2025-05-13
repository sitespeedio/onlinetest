import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function getBaseFilePath(theFile) {
  const currentFileUrl = import.meta.url;
  const currentFilePath = fileURLToPath(currentFileUrl);
  const currentDirectory = path.dirname(currentFilePath);
  return path.resolve(currentDirectory, '../../', theFile);
}
