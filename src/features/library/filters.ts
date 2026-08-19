/**
 * Composed library filters — the model and the matching, with no UI in it (B-010).
 *
 * # Why a list of criteria rather than a form's worth of fields
 *
 * The first mockup was a fixed form with one input per filterable field. Its fault is
 * structural rather than cosmetic: **a form's size is proportional to the fields the app
 * supports, not the fields you are using.** B-021 adds many more (material, endgame, time
 * control, opening name), and every one of them would make the panel bigger for someone
 * filtering on a single thing. A list of criteria is proportional to what is in use.
 *
 * The shape was chosen against a cross-category survey rather than taste (see
 * `docs/ui-survey.md`): macOS Finder's Smart Folders, Music's Smart Playlists and Lightroom's
 * Smart Collections — the three closest analogues, all "a large personal collection with many
 * attributes" — independently use criterion rows of attribute + operator + value, with
 * add/remove per row. Chips are how *applied* state is displayed, never how it is authored.
 *
 * # What this module deliberately does not do
 *
 * - **No accent stripping.** Matching folds case and nothing else. `Player.normalisedName` is
 *   already accent-stripped by the importer, and is included in the haystack for exactly that
 *   reason, but the stripping *rule* stays in one implementation. Duplicating it here is how
 *   two implementations diverge, and this project has already been bitten once by an
 *   accent-stripping technique that was standard and wrong for Cyrillic.
 * - **No SQL.** Filtering runs over the `GameSummary[]` already in memory, like the free-text
 *   search it joins. That is the honest MVP shape and it is what makes B-033's remaining
 *   half measurable. If 10k rows misses the <200ms target, the escalation is to push these
 *   criteria into the query in `src-tauri`, which is why a criterion is plain data.
 * - **No OR-grouping or nesting.** Music supports both; they belong to B-021's advanced
 *   search, not to the MVP. `matchMode` is the one concession, and only because a flat
 *   all/any is a single control rather than a query builder.
 */
import { GameResult, type GameSummary, type PgnDate } from "@/model/game";

export type TextFieldId =
  | "white"
  | "black"
  | "eitherPlayer"
  | "event"
  | "site"
  | "round"
  | "eco";
export type NumberFieldId = "whiteElo" | "blackElo" | "moves";
export type FilterFieldId = TextFieldId | NumberFieldId | "date" | "result";

export type TextOperator = "contains" | "notContains" | "is" | "startsWith";
export type NumberOperator = "over" | "under" | "is" | "between";
/**
 * Date operators. **"in year" is deliberately absent**: it is expressible as `between` two
 * January-to-December bounds, and shipping the smaller set first is the AGENTS.md rule.
 * `after` reads `from`, `before` reads `to`, `between` reads both — so the field names say
 * which bound each operator means.
 */
export type DateOperator = "before" | "after" | "between";
export type ResultOperator = "is" | "isNot";

/** Every operator id, so a label map over them can be exhaustive and literal-typed. */
export type OperatorId = TextOperator | NumberOperator | DateOperator | ResultOperator;

/**
 * The result a criterion is looking for. A separate vocabulary from [`GameResult`] because
 * the model uses `null` for "unknown or in progress" and this needs to tell an unset criterion
 * (`""`, inert) apart from one deliberately looking for unknown results.
 */
export type ResultChoice = "" | "white" | "black" | "draw" | "unknown";

/**
 * One criterion. **Numeric and date values are held as strings**, which is not laziness: they
 * are bound to text and date inputs, and `""` is what distinguishes "not filled in yet" from
 * zero. Parsing happens at match time, so a half-typed criterion is inert rather than wrong.
 */
export type Criterion =
  | {
      readonly id: string;
      readonly kind: "text";
      readonly field: TextFieldId;
      readonly operator: TextOperator;
      readonly value: string;
    }
  | {
      readonly id: string;
      readonly kind: "number";
      readonly field: NumberFieldId;
      readonly operator: NumberOperator;
      readonly value: string;
      readonly value2: string;
    }
  | {
      readonly id: string;
      readonly kind: "date";
      readonly field: "date";
      readonly operator: DateOperator;
      readonly from: string;
      readonly to: string;
    }
  | {
      readonly id: string;
      readonly kind: "result";
      readonly field: "result";
      readonly operator: ResultOperator;
      readonly value: ResultChoice;
    };

export type MatchMode = "all" | "any";

/** A field as the picker needs it: what it is called is the catalogue's business, not ours. */
export interface FilterField {
  readonly id: FilterFieldId;
  readonly kind: Criterion["kind"];
}

/**
 * Every filterable field, in the order the picker lists them. Grouped players-then-game, which
 * is the order the table's own columns imply.
 */
export const FILTER_FIELDS: readonly FilterField[] = [
  { id: "white", kind: "text" },
  { id: "black", kind: "text" },
  { id: "eitherPlayer", kind: "text" },
  { id: "whiteElo", kind: "number" },
  { id: "blackElo", kind: "number" },
  { id: "event", kind: "text" },
  { id: "site", kind: "text" },
  { id: "round", kind: "text" },
  { id: "date", kind: "date" },
  { id: "result", kind: "result" },
  { id: "eco", kind: "text" },
  { id: "moves", kind: "number" },
];

export const TEXT_OPERATORS: readonly TextOperator[] = [
  "contains",
  "notContains",
  "is",
  "startsWith",
];
export const NUMBER_OPERATORS: readonly NumberOperator[] = [
  "over",
  "under",
  "is",
  "between",
];
export const DATE_OPERATORS: readonly DateOperator[] = ["between", "before", "after"];
export const RESULT_OPERATORS: readonly ResultOperator[] = ["is", "isNot"];

export function fieldKind(field: FilterFieldId): Criterion["kind"] {
  const found = FILTER_FIELDS.find((entry) => entry.id === field);
  // Unreachable for a FilterFieldId; the fallback keeps this total rather than throwing at
  // a call site that only ever passes a valid id.
  return found?.kind ?? "text";
}

/** Operators valid for a field, for the operator dropdown. */
export function operatorsFor(field: FilterFieldId): readonly OperatorId[] {
  switch (fieldKind(field)) {
    case "text":
      return TEXT_OPERATORS;
    case "number":
      return NUMBER_OPERATORS;
    case "date":
      return DATE_OPERATORS;
    case "result":
      return RESULT_OPERATORS;
  }
}

let nextCriterionId = 0;
/**
 * A fresh criterion for a field, at that field's default operator.
 *
 * Also what runs when the user *changes* a row's field: a criterion cannot keep its operator
 * or value across a kind change (`contains` means nothing to a number), so the row is rebuilt
 * rather than patched. `eco` defaults to `startsWith` because ECO codes are a hierarchy —
 * `C5` is a family, and asking for the family is the common case.
 */
export function newCriterion(field: FilterFieldId): Criterion {
  const id = "c" + String(nextCriterionId++);
  switch (fieldKind(field)) {
    case "text":
      return {
        id,
        kind: "text",
        field: field as TextFieldId,
        operator: field === "eco" ? "startsWith" : "contains",
        value: "",
      };
    case "number":
      return {
        id,
        kind: "number",
        field: field as NumberFieldId,
        operator: "over",
        value: "",
        value2: "",
      };
    case "date":
      return { id, kind: "date", field: "date", operator: "between", from: "", to: "" };
    case "result":
      return { id, kind: "result", field: "result", operator: "is", value: "" };
  }
}

/**
 * A criterion with nothing filled in yet, which must not filter anything.
 *
 * This is what stops the table blanking while a criterion is being typed, and it is why
 * "Add criterion" can add an empty row without consequence — the same reason Finder lets you
 * add a criterion before choosing what it says.
 */
export function isInert(criterion: Criterion): boolean {
  switch (criterion.kind) {
    case "text":
      return criterion.value.trim() === "";
    case "number":
      return criterion.operator === "between"
        ? toNumber(criterion.value) === null || toNumber(criterion.value2) === null
        : toNumber(criterion.value) === null;
    case "date":
      if (criterion.operator === "after") return criterion.from === "";
      if (criterion.operator === "before") return criterion.to === "";
      return criterion.from === "" || criterion.to === "";
    case "result":
      return criterion.value === "";
  }
}

export function activeCriteria(criteria: readonly Criterion[]): readonly Criterion[] {
  return criteria.filter((criterion) => !isInert(criterion));
}

function fold(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

/**
 * Every string a text criterion may match against for a field.
 *
 * Player fields carry both the verbatim name and the importer's `normalisedName`, so a search
 * typed without accents can still hit a name written with them — without this module owning
 * the stripping rule (see the file doc comment).
 */
function haystack(game: GameSummary, field: TextFieldId): readonly string[] {
  switch (field) {
    case "white":
      return [game.white.name, game.white.normalisedName];
    case "black":
      return [game.black.name, game.black.normalisedName];
    case "eitherPlayer":
      return [
        game.white.name,
        game.white.normalisedName,
        game.black.name,
        game.black.normalisedName,
      ];
    case "event":
      return [game.event ?? ""];
    case "site":
      return [game.site ?? ""];
    case "round":
      return [game.round ?? ""];
    case "eco":
      return [game.eco ?? ""];
  }
}

/** The number a numeric field reads. `null` means the game does not carry it. */
function numberOf(game: GameSummary, field: NumberFieldId): number | null {
  switch (field) {
    case "whiteElo":
      return game.whiteElo;
    case "blackElo":
      return game.blackElo;
    case "moves":
      // The user counts moves; storage counts plies. A trailing half move belongs to the move
      // it started, same rule as the info panel's `moveCount`.
      return game.plyCount === null || game.plyCount === 0
        ? null
        : Math.ceil(game.plyCount / 2);
  }
}

function resultOf(choice: ResultChoice): GameResult | null {
  switch (choice) {
    case "white":
      return GameResult.WhiteWin;
    case "black":
      return GameResult.BlackWin;
    case "draw":
      return GameResult.Draw;
    default:
      return null;
  }
}

function dayKey(year: number, month: number, day: number): number {
  return year * 10000 + month * 100 + day;
}

/**
 * A PGN date as the **interval** it actually denotes, or null when even the year is unknown.
 *
 * This is the whole of why date matching is not a point comparison. Real files are full of
 * `2024.??.??`, which is not a date — it is every day in 2024. Treating it as a point (and
 * every tool that pretends `??` is `01` does treat it as one) silently drops games from
 * "between March and June 2024" that genuinely might belong there. A criterion matches when
 * the game's interval **overlaps** the criterion's, so a partially-known date is included
 * wherever it could legitimately fall and excluded where it could not.
 *
 * A game with no year at all matches no date criterion: unknown is not a value to compare.
 */
export function dateInterval(date: PgnDate): { lo: number; hi: number } | null {
  if (date.parsed !== null) {
    const [y, m, d] = date.parsed.split("-").map(Number);
    if (y !== undefined && m !== undefined && d !== undefined) {
      const key = dayKey(y, m, d);
      return { lo: key, hi: key };
    }
  }
  if (date.year === null) return null;
  if (date.month === null) {
    return { lo: dayKey(date.year, 1, 1), hi: dayKey(date.year, 12, 31) };
  }
  return { lo: dayKey(date.year, date.month, 1), hi: dayKey(date.year, date.month, 31) };
}

/** An ISO `YYYY-MM-DD` bound from a date input, as a comparable key. */
function boundKey(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (match === null) return null;
  return dayKey(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function matchesCriterion(game: GameSummary, criterion: Criterion): boolean {
  if (isInert(criterion)) return true;

  switch (criterion.kind) {
    case "text": {
      const needle = fold(criterion.value);
      const values = haystack(game, criterion.field).map(fold);
      switch (criterion.operator) {
        case "contains":
          return values.some((value) => value.includes(needle));
        case "notContains":
          return !values.some((value) => value.includes(needle));
        case "is":
          return values.some((value) => value === needle);
        case "startsWith":
          return values.some((value) => value.startsWith(needle));
      }
      break;
    }
    case "number": {
      const actual = numberOf(game, criterion.field);
      // A game that does not carry the number matches no numeric criterion. "Unknown Elo" is
      // not "Elo 0", and letting it compare as zero would put unrated games at the top of
      // every "under 2000" search.
      if (actual === null) return false;
      const value = toNumber(criterion.value);
      if (value === null) return true;
      switch (criterion.operator) {
        case "over":
          return actual > value;
        case "under":
          return actual < value;
        case "is":
          return actual === value;
        case "between": {
          const upper = toNumber(criterion.value2);
          if (upper === null) return true;
          const lo = Math.min(value, upper);
          const hi = Math.max(value, upper);
          return actual >= lo && actual <= hi;
        }
      }
      break;
    }
    case "date": {
      const interval = dateInterval(game.date);
      if (interval === null) return false;
      switch (criterion.operator) {
        case "after": {
          const from = boundKey(criterion.from);
          return from === null || interval.hi > from;
        }
        case "before": {
          const to = boundKey(criterion.to);
          return to === null || interval.lo < to;
        }
        case "between": {
          const from = boundKey(criterion.from);
          const to = boundKey(criterion.to);
          if (from === null || to === null) return true;
          const lo = Math.min(from, to);
          const hi = Math.max(from, to);
          return interval.lo <= hi && interval.hi >= lo;
        }
      }
      break;
    }
    case "result": {
      const wanted = resultOf(criterion.value);
      const matches = game.result === wanted;
      return criterion.operator === "is" ? matches : !matches;
    }
  }
  return true;
}

/**
 * Apply criteria to a list of games.
 *
 * **Returns the input array itself when nothing is active**, rather than an equal copy. The
 * library table memoises on this array, and handing back a fresh one every render would make
 * every keystroke elsewhere in the view re-sort and re-render 3,412 rows for no reason.
 */
export function applyFilters(
  games: readonly GameSummary[],
  criteria: readonly Criterion[],
  matchMode: MatchMode,
): readonly GameSummary[] {
  const active = activeCriteria(criteria);
  if (active.length === 0) return games;
  return games.filter((game) =>
    matchMode === "all"
      ? active.every((criterion) => matchesCriterion(game, criterion))
      : active.some((criterion) => matchesCriterion(game, criterion)),
  );
}
