/**
 * The game data model — the TypeScript expression of ADR-0005.
 *
 * M1 has no database. This is the shape the mock list conforms to and the shape import
 * (B-007) will later fill in, so that the schema at B-011 is one we chose rather than one
 * that accumulated. Read ADR-0005 before changing anything here.
 *
 * The governing rule throughout: **store the raw thing, derive the useful thing.** Every
 * field below is either verbatim from the PGN or explicitly marked as derived. Derived
 * values are never authoritative — if a derivation rule is wrong, the fix is a re-import
 * (B-078), not a migration.
 */

/** Stable row identity. Assigned at import, never reused, survives re-derivation (B-050). */
export type GameId = number;
export type PlayerId = number;

/**
 * A player (B-058).
 *
 * Storage keeps these in their own table, with `games` holding foreign keys. The UI sees
 * the joined view below.
 */
export interface Player {
  readonly id: PlayerId;
  /** Verbatim, as it appeared in the PGN tag. Authoritative. */
  readonly name: string;
  /**
   * Derived and deliberately lossy: case-folded, accent-stripped, canonicalised to
   * `Lastname, Firstname`. Used for matching and grouping only — never displayed.
   */
  readonly normalisedName: string;
}

/**
 * Result as an integer, never the string `"1-0"` (B-060). `null` means unknown or
 * still in progress — the PGN `*` result.
 */
export const GameResult = {
  BlackWin: -1,
  Draw: 0,
  WhiteWin: 1,
} as const;
export type GameResult = (typeof GameResult)[keyof typeof GameResult];

/**
 * A PGN date (B-059). Real files routinely carry `2024.??.??` or `????.??.??`.
 *
 * `raw` is authoritative. The rest are derived so that a partially-known date still
 * sorts and filters sensibly. Formatting is done at the edge with `Intl` — never by
 * hand (B-074).
 */
export interface PgnDate {
  /** Verbatim PGN date string, including any `?` placeholders. */
  readonly raw: string;
  /** ISO `YYYY-MM-DD`, only when the date is complete. Derived. */
  readonly parsed: string | null;
  /** Derived. Present whenever the year is known. */
  readonly year: number | null;
  /** Derived. Present whenever the month is known. */
  readonly month: number | null;
}

/**
 * A game as the UI sees it: players joined, hot fields promoted, full tag set retained.
 *
 * Note what is *not* here: no move list, no variations, no annotations. M1's board is
 * static (B-054) and the MVP is read-only (B-050). The game tree arrives with B-009.
 */
export interface Game {
  readonly id: GameId;

  // Hot fields — promoted to indexed columns in storage, strictly derived from `tags`.
  readonly white: Player;
  readonly black: Player;
  readonly event: string | null;
  readonly site: string | null;
  readonly date: PgnDate;
  readonly round: string | null;
  readonly result: GameResult | null;
  readonly eco: string | null;
  readonly whiteElo: number | null;
  readonly blackElo: number | null;
  readonly plyCount: number | null;

  /**
   * The complete tag set (B-060), including tags we do not promote and tags we have
   * never heard of. Nothing from a PGN file is silently discarded.
   */
  readonly tags: Readonly<Record<string, string>>;

  /**
   * The verbatim PGN text. **This is the source of truth.** Everything above is
   * derivable from it; it is derivable from nothing.
   */
  readonly pgn: string;
}

/** Standard chess starting position. */
export const INITIAL_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
