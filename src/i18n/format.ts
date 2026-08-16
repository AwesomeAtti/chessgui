/**
 * Formatting at the edge (B-059, B-074).
 *
 * Two rules, both easy to violate accidentally:
 *
 * 1. **Never hand-roll a date string.** `Intl.DateTimeFormat` knows that the US writes
 *    06/08/2024 and most of Europe writes 08/06/2024; string concatenation does not.
 * 2. **Never sort names with `<`.** Byte order puts "Ökonen" after "Zeller" and splits
 *    accented variants of the same name. `Intl.Collator` handles it.
 *
 * Storage stays canonical (ADR-0005); everything locale-dependent happens here.
 */
import type { PgnDate } from "@/model/game";

/**
 * Format a possibly-partial PGN date.
 *
 * Returns `null` when nothing useful is known, so the caller can substitute a localised
 * "Unknown" from the catalogue rather than this module inventing English.
 */
export function formatPgnDate(date: PgnDate, locale: string): string | null {
  if (date.parsed !== null) {
    // Parse as UTC: a bare `new Date("2024-06-08")` is UTC midnight, which renders as
    // the previous day in negative-offset timezones. A classic off-by-one-day bug.
    const [y, m, d] = date.parsed.split("-").map(Number);
    if (y !== undefined && m !== undefined && d !== undefined) {
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(y, m - 1, d)));
    }
  }

  if (date.year !== null && date.month !== null) {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(date.year, date.month - 1, 1)));
  }

  if (date.year !== null) {
    return new Intl.NumberFormat(locale, { useGrouping: false }).format(
      date.year,
    );
  }

  return null;
}

/** Locale-aware name comparator. Use this for every player-name sort (B-074). */
export function playerNameComparator(locale: string): (a: string, b: string) => number {
  const collator = new Intl.Collator(locale, {
    sensitivity: "base",
    usage: "sort",
    numeric: true,
  });
  return (a, b) => collator.compare(a, b);
}
