import nconf from 'nconf';
import y18n from 'y18n';
import { getBaseFilePath } from './fileutil.js';

let myy18n;

function getLocale() {
  // Locale from runtime config (env via compose) with fallback to config defaults.
  // Note: We init lazily so env/config is loaded before y18n is created (initialized too early and is stuck on defaults).
  return (
    nconf.get('localization:defaultLocale') ||
    'en'
  );
}

function getLocalesDirectory() {
  // Directory from runtime config with fallback to config defaults. Lazy init for the same reason as above.
  return (
    nconf.get('localization:directory') ||
    getBaseFilePath('./locales')
  );
}

function getI18nInstance() {
  if (!myy18n) {
    const locale = getLocale();
    const directory = getLocalesDirectory();
    myy18n = y18n({ updateFiles: false, locale, directory });
  }
  return myy18n;
}

export function getText(key, ...arguments_) {
  return getI18nInstance().__(key, ...arguments_);
}
