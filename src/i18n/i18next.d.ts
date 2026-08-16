/**
 * Makes translation keys type-checked.
 *
 * This is the compile-time half of B-072: `t("library.headng")` fails to build rather
 * than rendering the raw key to a user.
 */
import "i18next";

import type { Messages } from "./locales/en";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: Messages;
    };
  }
}
