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
    count: "{{shown}} of {{total}}",
    empty: "No games yet.",
    emptyHint: "Importing PGN files arrives in a later milestone.",
    noMatches: "No games match this search.",
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
    event: "Event",
    site: "Site",
    date: "Date",
    round: "Round",
    eco: "ECO",
    otherTags: "Other tags",
    // Used where a PGN tag is absent rather than empty.
    absent: "—",
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
