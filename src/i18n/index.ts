/**
 * i18n bootstrap (B-072).
 *
 * English is the only locale bundled. Everything here exists so that the second one is a
 * translation job: ICU-style plurals via `Intl.PluralRules`, interpolation instead of
 * concatenation, and a typed key surface so a missing or misspelt key is a compile error
 * rather than a string like `library.headng` shipped to a user.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { en } from "./locales/en";

export const DEFAULT_LOCALE = "en";

export const resources = {
  en: { translation: en },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  defaultNS: "translation",
  interpolation: {
    // React already escapes. Double-escaping mangles names like "O'Kelly".
    escapeValue: false,
  },
  returnNull: false,
  // Surface missing keys loudly in development instead of rendering the key.
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: import.meta.env.DEV
    ? (_lngs: readonly string[], _ns: string, key: string) => {
        console.error(`[i18n] missing key: ${key}`);
      }
    : false,
});

export default i18n;
