import { nconf } from '../config.js';
import y18n from 'y18n';
import { getBaseFilePath } from './fileutil.js';
const locale = nconf.get('localization:locale');
const directory =
  nconf.get('localization:directory') || getBaseFilePath('./locales');

const myy18n = y18n({ updateFiles: false, locale, directory });

export function getText(key, ...arguments_) {
  return myy18n.__(key, ...arguments_);
}
