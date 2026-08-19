/**
 * English message catalogue — the only locale that ships in the MVP (B-072, B-075).
 *
 * The point of this file is not English. It is that **no user-facing string exists anywhere
 * else**, so adding a second locale is a translation job rather than a refactor.
 * `npm run check:i18n` fails the build if a literal escapes into a component.
 *
 * Conventions:
 * - Plurals use i18next's `_one` / `_other` suffixes, backed by `Intl.PluralRules`. Never
 *   hand-roll `count === 1 ? … : …` at a call site; some languages have six plural forms.
 * - Never concatenate fragments into a sentence. Word order differs by language.
 * - **Any number a user reads is interpolated as `{{value, number}}`**, which routes it through
 *   `Intl.NumberFormat` for the active locale. Bare `{{value}}` renders `1214` and `2180442` —
 *   correct in no locale, and a space or a full stop in several. Added at milestone 4 after
 *   *looking at* a rendered import report: the byte offset of a real 7 MiB export is seven
 *   digits, and every count in this file was going out ungrouped. i18next has had the formatter
 *   all along; nothing was using it.
 * - Layout must tolerate roughly 35% expansion without clipping.
 */
export const en = {
  app: {
    // Product name — a proper noun, deliberately not translated.
    name: "chessgui",
    tagline: "Your chess library, on your own machine",
  },

  tabs: {
    library: "Library",
    close: "Close tab",
  },

  panel: {
    moves: "Moves",
    info: "Info",
  },

  nav: {
    first: "First move",
    previous: "Previous move",
    next: "Next move",
    last: "Last move",
  },

  library: {
    searchPlaceholder: "Player, event, or ECO",
    count: "{{shown, number}} of {{total, number}}",
    empty: "No games yet.",
    emptyHint: "Paste a PGN, or use Add games.",
    addGames: "Add games…",
    noMatches: "No games match this search.",
    // {{column}} arrives already translated (a column header, e.g. "Date") — this interpolates
    // a resolved phrase rather than assembling one, same precedent as `import.summary.okFiles`.
    sortToggle: "Sort by {{column}}",
    columns: {
      white: "White",
      black: "Black",
      elo: "Elo",
      event: "Event",
      date: "Date",
      result: "Result",
      eco: "ECO",
    },
  },

  /**
   * The Add games dialog (B-007 milestone 3).
   *
   * Two of these strings exist because of a measurement rather than a design. `summary.stopped`
   * and `stoppedAt` say that an import ended early and that everything after a byte offset was
   * never read — `pgn-reader`'s errors are irrecoverable, so that is the shape of every failure.
   * Do not soften them into "some games could not be imported", which implies holes in an
   * otherwise complete import and is false.
   */
  import: {
    title: "Add games",
    pasteLabel: "Paste PGN",
    pastePlaceholder: "Paste one or more games in PGN format",
    confirm: "Import",
    cancel: "Cancel",
    // The result step. `back` returns to the paste box with the text intact; `done` dismisses.
    back: "Back",
    done: "Done",
    // Offered when exactly one game arrived and nothing else needs saying (milestone 4).
    openGame: "Open game",
    // The strip above the table, which holds the outcome after the dialog has gone.
    dismiss: "Dismiss this message",

    // The source tabs. Absent while there is only one source — a strip of one is furniture.
    tabs: {
      paste: "Paste",
      files: "Files",
    },

    // The Files tab (milestone 4).
    files: {
      label: "PGN files",
      choose: "Choose files…",
      dropHint: "Drop PGN files here",
      // The list of chosen files, before importing.
      remove: "Remove this file",
      confirm_one: "Import {{count, number}} file",
      confirm_other: "Import {{count, number}} files",
      // Only reachable if a path ends in `..`, which no picker or drop produces. It exists so
      // an empty name renders as something rather than as a gap in the list.
      unnamed: "Unnamed file",
      // Shown per file, and only when the fallback fired. ADR-0009 rule 5 becomes reachable at
      // this milestone — pasted text has already been decoded — and a silent fallback is how a
      // mis-decoded name gets into a library and stays there.
      latin1: "Read as Latin-1 rather than UTF-8. Check the names on these games.",
    },

    /**
     * Counts, kept apart so a sentence can interpolate an already-pluralised phrase.
     *
     * Two numbers in one sentence is a real i18n problem — i18next resolves one `count` — and
     * the alternative of assembling the sentence at the call site is what the catalogue rule
     * forbids. This follows the precedent set by `info.timeControl.increment`: the plural is
     * resolved before it arrives, and the translator still controls the word order of the
     * sentence it lands in.
     */
    count: {
      games_one: "{{count, number}} game",
      games_other: "{{count, number}} games",
      files_one: "{{count, number}} file",
      files_other: "{{count, number}} files",
    },

    summary: {
      ok_one: "{{count, number}} game imported.",
      ok_other: "{{count, number}} games imported.",
      stopped_one: "{{count, number}} game imported, then the import stopped.",
      stopped_other: "{{count, number}} games imported, then the import stopped.",
      none: "Nothing was imported.",
      empty: "No games found in that text.",
      // The multi-file forms. `games`, `files` and `failed` arrive already pluralised.
      okFiles: "{{games}} imported from {{files}}.",
      stoppedFiles: "{{games}} imported from {{files}}. {{failed}} did not finish.",
      noneFiles: "Nothing was imported from {{files}}.",
    },
    failedGame: "Game {{number, number}} could not be read.",
    failedGameNamed: "Game {{number, number}} — {{white}} vs {{black}}, {{date}}.",
    stoppedAt:
      "Nothing after byte {{offset, number}} could be read. Fix that game and import again.",
    reason: {
      unterminatedComment: "A comment starting with { is never closed.",
      unterminatedTag: "A tag line is never closed.",
      // Reached only if pgn-reader grows an error we have not seen (B-063). Vague on purpose:
      // the alternative is saying nothing about a game that did not import.
      parseFailed: "The parser could not read this game.",
      // The file never reached the parser: missing, a directory, or no permission. One
      // sentence for all three, because the user's next action is the same in every case.
      fileUnreadable: "This file could not be opened.",
    },
  },

  board: {
    positionLabel: "Board position",
    invalidFen: "This position could not be read.",
  },

  moves: {
    empty: "No moves recorded.",
    // Shown when a game's notation stops parsing partway through — real PGN does this.
    truncated: "Notation could not be read past move {{ply}}.",
  },

  info: {
    // Group headings.
    players: "Players",
    game: "Game",
    opening: "Opening",

    event: "Event",
    site: "Site",
    date: "Date",
    round: "Round",
    eco: "ECO",
    result: "Result",
    // How the game finished, from the `Termination` tag. The *value* is prose written by
    // whoever produced the file and is shown verbatim — chess.com writes English sentences
    // like "X won by resignation", and parsing somebody else's sentence to localise it is not
    // a trade worth making (B-072). Only this label is ours.
    ended: "Ended",
    moves: "Moves",
    timeControlLabel: "Time control",
    // The opening reference URL, shown as text. Not decoded into a name — that is B-105, where
    // the slug loses apostrophes — and not a link until external links go through src/shell/
    // (B-117).
    openingUrl: "Reference",
    allTags_one: "All tags ({{count}})",
    allTags_other: "All tags ({{count}})",
    // Used where a PGN tag is absent rather than empty.
    absent: "—",

    /**
     * Time control, formatted from the `TimeControl` tag's seconds.
     *
     * `increment` interpolates an already-translated `base` rather than concatenating two
     * strings at the call site: a translator can move the parts, and the plural form of the
     * base is resolved before it arrives.
     */
    timeControl: {
      minutes_one: "{{count}} min",
      minutes_other: "{{count}} min",
      seconds_one: "{{count}} sec",
      seconds_other: "{{count}} sec",
      increment: "{{base}} + {{increment}} sec",
    },
  },

  /**
   * Result and piece glyphs.
   *
   * In the catalogue rather than in code because they are locale-sensitive despite looking
   * universal: dash and draw conventions vary, and localised SAN (B-073) means piece letters
   * differ by language. Storage stays canonical English; only display comes through here.
   */
  notation: {
    whiteWin: "1–0",
    blackWin: "0–1",
    draw: "½–½",
    unknownResult: "*",
  },

  date: {
    unknown: "Unknown",
  },

  about: {
    version: "Version {{version}}",
    license: "Licence: {{license}}",
    shellUnavailable: "Running in a browser — the desktop shell is not attached.",
  },

  /**
   * Error messages, keyed by the codes in `src-tauri/src/lib.rs` and `src/shell/ipc.ts`.
   *
   * Currently unreferenced: nothing surfaces an error to the user yet. Kept because the
   * mapping is the contract — the backend returns codes only on the basis that the frontend
   * owns the wording. Every new code on the Rust side gets its entry here in the same change.
   */
  error: {
    "ipc.unavailable": "The desktop shell is not available.",
    "ipc.unknown": "Something went wrong.",
  },
} as const;

export type Messages = typeof en;
