/**
 * The decisions behind the info panel, kept out of the component so they can be tested.
 *
 * The panel curates: it promotes the fields that answer "what was this game?" and puts the
 * complete tag set behind a disclosure. That was an owner decision taken from mockups, and it
 * has a cost stated plainly — **curation is knowledge we own and maintain**, where the
 * importer deliberately owns none (ADR-0009). The cost is bounded because this is display: a
 * wrong derivation here costs a glance, while a wrong derivation at import costs a row.
 *
 * Two limits hold that cost down, and both are worth keeping:
 *
 * 1. **Nothing here is source-specific.** Every rule below comes from the PGN specification,
 *    not from chess.com. A Scid export or a hand-typed game goes through the same code and
 *    simply has fewer fields.
 * 2. **Anything not understood is shown verbatim rather than guessed at.** An unparseable
 *    `TimeControl` prints as it appeared. The file is still the authority.
 */

/** How a `TimeControl` tag should be rendered. */
export type TimeControl =
  | { readonly kind: "absent" }
  /** Sudden death, a whole number of minutes. */
  | { readonly kind: "minutes"; readonly minutes: number }
  /** Sudden death, not a whole number of minutes. */
  | { readonly kind: "seconds"; readonly seconds: number }
  /** Base plus per-move increment, the commonest online format. */
  | {
      readonly kind: "increment";
      readonly base: TimeControl & { kind: "minutes" | "seconds" };
      readonly increment: number;
    }
  /** Anything else — moves-per-session, sandclock, or a format we have not met. */
  | { readonly kind: "raw"; readonly text: string };

/**
 * Values that mean "there is nothing here", per the PGN specification.
 *
 * `?` is the spec's unknown and `-` its not-applicable — chess.com writes `Round "-"` on every
 * live game, which the first version of this panel printed literally and which read as a bug.
 * **This is spec knowledge rather than chess.com knowledge**, which is what keeps it honest:
 * any producer writing `-` means the same thing by it.
 *
 * A genuine value of `"?"` is therefore unshowable. That is a real loss and an accepted one —
 * the verbatim PGN keeps it, and no player is called `?`.
 */
export function isAbsentTagValue(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  const trimmed = value.trim();
  return trimmed === "" || trimmed === "-" || trimmed === "?";
}

/** `value` when it says something, `null` when it is one of the spec's placeholders. */
export function presentTag(value: string | null | undefined): string | null {
  return isAbsentTagValue(value) ? null : (value as string).trim();
}

function seconds(total: number): TimeControl & { kind: "minutes" | "seconds" } {
  // Whole minutes read as minutes; 90 seconds is 90 seconds, not "1.5 min".
  return total > 0 && total % 60 === 0
    ? { kind: "minutes", minutes: total / 60 }
    : { kind: "seconds", seconds: total };
}

/**
 * Parse a PGN `TimeControl` tag.
 *
 * The spec allows several forms and this understands two of them — sudden death (`600`) and
 * base-plus-increment (`600+5`) — because those are the two that actually appear. The others
 * (`40/9000` moves-per-session, `*180` sandclock, and anything compound) fall through to
 * `raw`, which prints the tag as written. **Falling through is the feature**: a time control we
 * cannot read is shown rather than hidden or guessed.
 */
export function parseTimeControl(raw: string | null | undefined): TimeControl {
  const text = presentTag(raw);
  if (text === null) return { kind: "absent" };

  const suddenDeath = /^(\d+)$/.exec(text);
  if (suddenDeath?.[1] !== undefined) return seconds(Number(suddenDeath[1]));

  const withIncrement = /^(\d+)\+(\d+)$/.exec(text);
  if (withIncrement?.[1] !== undefined && withIncrement[2] !== undefined) {
    return {
      kind: "increment",
      base: seconds(Number(withIncrement[1])),
      increment: Number(withIncrement[2]),
    };
  }

  return { kind: "raw", text };
}

/**
 * Full moves from a ply count, for display.
 *
 * **This is a count of movetext tokens, not of legal moves, and the two genuinely differ.**
 * Measured at B-007 milestone 1: an illegal move mid-game gives 9 tokens at import while the
 * board stops at 6, and a non-English file gives 3 here and 4 on the board (B-115). So this
 * number can disagree with the move list beside it. Accepted — making them agree means a
 * legality walk over every import, which is the validation ADR-0009 declines.
 */
export function moveCount(plyCount: number | null): number | null {
  if (plyCount === null || plyCount <= 0) return null;
  return Math.ceil(plyCount / 2);
}

/** Tag keys shown in the curated groups above the disclosure. */
export const PROMOTED_TAGS: readonly string[] = [
  "White",
  "Black",
  "WhiteElo",
  "BlackElo",
  "Result",
  "Termination",
  "Event",
  "Site",
  "Date",
  "Round",
  "TimeControl",
  "PlyCount",
  "ECO",
  "ECOUrl",
];

/**
 * The full tag set for the disclosure, in a stable order.
 *
 * **Every tag, including the promoted ones.** "All tags" that quietly omits half of them is a
 * worse lie than no disclosure at all, and B-060's whole point is that nothing a file said is
 * discarded. Sorted rather than left in file order because the file's order is not meaningful
 * and a stable list is easier to scan for the one tag you came looking for.
 */
export function allTags(
  tags: Readonly<Record<string, string>>,
): readonly (readonly [string, string])[] {
  return Object.entries(tags).sort(([a], [b]) => a.localeCompare(b));
}
