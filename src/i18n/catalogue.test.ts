/**
 * That every key the import report can ask for actually resolves (B-072).
 *
 * **A typecheck cannot answer this.** `i18next.d.ts` proves the key exists in the catalogue
 * object; it says nothing about whether i18next *finds* it at runtime — and the plural forms
 * are stored as `ok_one` / `ok_other` while the code asks for `ok`, which is a resolution rule
 * rather than a type. A missing plural renders the raw key to a user, which is exactly the
 * failure the typed-key work exists to prevent, arriving through the one door types do not
 * cover.
 *
 * **Every key below is written as a literal at the call site, on purpose.** The first draft
 * passed keys through a `string` helper parameter, which compiled the whole file out of the
 * typed-key guarantee it exists to protect — `tsc` refused it, which is the guardrail working
 * on the test that tests the guardrail. The helper now takes the rendered string instead.
 *
 * A bare i18next instance rather than the app's own: this asserts the catalogue, not the
 * bootstrap, and it keeps the test out of React and the DOM.
 */
import i18next from "i18next";
import { beforeAll, describe, expect, it } from "vitest";

import { IMPORT_REASON_KEYS } from "@/features/library/importReport";
import { en } from "./locales/en";

const t = i18next.t.bind(i18next);

beforeAll(async () => {
  await i18next.init({
    lng: "en",
    fallbackLng: "en",
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});

/** Resolved, interpolated, and not silently echoing the key back at the user. */
function resolved(key: string, value: string): string {
  expect(value, `${key} did not resolve`).not.toBe(key);
  expect(value, `${key} resolved to nothing`).not.toBe("");
  expect(value, `${key} left a placeholder unfilled`).not.toMatch(/\{\{/);
  return value;
}

describe("the import catalogue", () => {
  it("resolves both plural forms of a clean import", () => {
    expect(resolved("import.summary.ok", t("import.summary.ok", { count: 1 }))).toBe(
      "1 game imported.",
    );
    expect(resolved("import.summary.ok", t("import.summary.ok", { count: 12 }))).toBe(
      "12 games imported.",
    );
  });

  it("resolves both plural forms of a stopped import", () => {
    expect(
      resolved("import.summary.stopped", t("import.summary.stopped", { count: 1 })),
    ).toContain("stopped");
    expect(
      resolved("import.summary.stopped", t("import.summary.stopped", { count: 12 })),
    ).toContain("12 games");
  });

  it("resolves the non-plural summaries", () => {
    resolved("import.summary.none", t("import.summary.none"));
    resolved("import.summary.empty", t("import.summary.empty"));
  });

  it("resolves every reason a game can be refused", () => {
    for (const key of Object.values(IMPORT_REASON_KEYS)) resolved(key, t(key));
  });

  it("fills in the failing game's identity", () => {
    const named = resolved(
      "import.failedGameNamed",
      t("import.failedGameNamed", {
        number: 13,
        white: "Aliyev, Kamran",
        black: "Novak, Petra",
        date: "2024.05.01",
      }),
    );
    expect(named).toContain("13");
    expect(named).toContain("Aliyev, Kamran");
    resolved("import.failedGame", t("import.failedGame", { number: 13 }));
  });

  it("fills in the byte offset, which is the only thing that locates the problem", () => {
    expect(
      resolved("import.stoppedAt", t("import.stoppedAt", { offset: 1204 })),
    ).toContain("1204");
  });

  it("resolves the dialog's own furniture", () => {
    resolved("import.title", t("import.title"));
    resolved("import.pasteLabel", t("import.pasteLabel"));
    resolved("import.pastePlaceholder", t("import.pastePlaceholder"));
    resolved("import.confirm", t("import.confirm"));
    resolved("import.cancel", t("import.cancel"));
    resolved("import.back", t("import.back"));
    resolved("import.done", t("import.done"));
    resolved("import.dismiss", t("import.dismiss"));
    resolved("library.addGames", t("library.addGames"));
    resolved("library.empty", t("library.empty"));
    resolved("library.emptyHint", t("library.emptyHint"));
  });

  it("does not escape an apostrophe in a player's name", () => {
    // Double-escaping mangles "O'Kelly", which is why the bootstrap turns escaping off.
    // Asserted here because that setting lives in a file with no tests of its own.
    expect(
      resolved(
        "import.failedGameNamed",
        t("import.failedGameNamed", {
          number: 1,
          white: "O'Kelly, Alberic",
          black: "Núñez, Inés",
          date: "2024.05.01",
        }),
      ),
    ).toContain("O'Kelly, Alberic");
  });

  it("resolves the info panel's group headings and labels", () => {
    resolved("info.players", t("info.players"));
    resolved("info.game", t("info.game"));
    resolved("info.opening", t("info.opening"));
    resolved("info.result", t("info.result"));
    resolved("info.ended", t("info.ended"));
    resolved("info.moves", t("info.moves"));
    resolved("info.timeControlLabel", t("info.timeControlLabel"));
    resolved("info.openingUrl", t("info.openingUrl"));
  });

  it("resolves both plural forms of the tag disclosure", () => {
    expect(resolved("info.allTags", t("info.allTags", { count: 1 }))).toContain("1");
    expect(resolved("info.allTags", t("info.allTags", { count: 21 }))).toContain("21");
  });

  it("formats a time control, including the interpolated increment form", () => {
    expect(
      resolved("info.timeControl.minutes", t("info.timeControl.minutes", { count: 10 })),
    ).toBe("10 min");
    expect(
      resolved("info.timeControl.seconds", t("info.timeControl.seconds", { count: 90 })),
    ).toBe("90 sec");
    // The nested case: an already-translated base interpolated into the increment form, which
    // is what stops the component concatenating two strings itself.
    expect(
      resolved(
        "info.timeControl.increment",
        t("info.timeControl.increment", {
          base: t("info.timeControl.minutes", { count: 10 }),
          increment: 5,
        }),
      ),
    ).toBe("10 min + 5 sec");
  });
});
