import nconf from 'nconf';
import y18n from 'y18n';
import { getLocalFilePath } from './fileutil.js';
const locale = nconf.get('localization:defaultLocale');
const directory =
  nconf.get('localization:directory') || getLocalFilePath('./locale');

const myy18n = y18n({ updateFiles: false, locale, directory });

export function getText(key, ...arguments_) {
  return myy18n.__(key, ...arguments_);
}
