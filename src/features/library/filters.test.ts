import { describe, expect, it } from "vitest";

import { GameResult, type GameSummary } from "@/model/game";

import {
  applyFilters,
  dateInterval,
  isInert,
  matchesCriterion,
  newCriterion,
  operatorsFor,
  type Criterion,
} from "./filters";

let nextId = 1;

function game(overrides: Partial<GameSummary> = {}): GameSummary {
  const id = nextId++;
  return {
    id,
    white: { id, name: "Carlsen, Magnus", normalisedName: "carlsen, magnus" },
    black: { id: id + 1000, name: "Nepomniachtchi, Ian", normalisedName: "nepomniachtchi, ian" },
    event: "Tata Steel Masters",
    site: "Wijk aan Zee",
    date: { raw: "2024.01.20", parsed: "2024-01-20", year: 2024, month: 1 },
    round: "7",
    result: GameResult.WhiteWin,
    eco: "C50",
    ecoUrl: null,
    whiteElo: 2830,
    blackElo: 2792,
    plyCount: 81,
    ...overrides,
  };
}

/** A criterion built the way the UI builds one, then filled in. */
function text(
  field: Parameters<typeof newCriterion>[0],
  operator: string,
  value: string,
): Criterion {
  const base = newCriterion(field);
  return { ...base, operator, value } as Criterion;
}

describe("isInert", () => {
  it("treats a criterion with nothing typed in it as filtering nothing", () => {
    // This is what stops the table blanking mid-keystroke, and what makes "Add criterion"
    // safe to press before you have decided what the criterion says.
    expect(isInert(newCriterion("white"))).toBe(true);
    expect(isInert(newCriterion("whiteElo"))).toBe(true);
    expect(isInert(newCriterion("date"))).toBe(true);
    expect(isInert(newCriterion("result"))).toBe(true);
  });

  it("treats whitespace as nothing typed", () => {
    expect(isInert(text("white", "contains", "   "))).toBe(true);
  });

  it("needs both bounds before a between filters", () => {
    const half = { ...newCriterion("whiteElo"), operator: "between", value: "2700" };
    expect(isInert(half as Criterion)).toBe(true);
    const whole = { ...half, value2: "2800" };
    expect(isInert(whole as Criterion)).toBe(false);
  });
});

describe("text criteria", () => {
  it("folds case, so how you typed it does not decide whether it matches", () => {
    expect(matchesCriterion(game(), text("white", "contains", "CARLSEN"))).toBe(true);
    expect(matchesCriterion(game(), text("white", "contains", "carlsen"))).toBe(true);
  });

  it("searches the normalised name too, without owning the normalising rule", () => {
    // The importer already produced `normalisedName`; this only reads it. Re-implementing
    // accent stripping here is how two implementations drift apart — and this project has
    // already shipped one accent-stripping technique that was wrong for Cyrillic.
    const g = game({
      white: { id: 1, name: "Réti, Richard", normalisedName: "reti, richard" },
    });
    expect(matchesCriterion(g, text("white", "contains", "reti"))).toBe(true);
  });

  it("matches either player when asked for either", () => {
    const eitherWhite = text("eitherPlayer", "contains", "Carlsen");
    const eitherBlack = text("eitherPlayer", "contains", "Nepo");
    expect(matchesCriterion(game(), eitherWhite)).toBe(true);
    expect(matchesCriterion(game(), eitherBlack)).toBe(true);
  });

  it("distinguishes is from contains", () => {
    expect(matchesCriterion(game(), text("white", "is", "Carlsen"))).toBe(false);
    expect(matchesCriterion(game(), text("white", "is", "Carlsen, Magnus"))).toBe(true);
  });

  it("defaults ECO to startsWith, because an ECO code is a family", () => {
    // "C5" is a group of openings, and asking for the group is the common case.
    expect(newCriterion("eco").operator).toBe("startsWith");
    expect(matchesCriterion(game(), text("eco", "startsWith", "C5"))).toBe(true);
    expect(matchesCriterion(game(), text("eco", "startsWith", "B"))).toBe(false);
  });

  it("negates with notContains, including for a game missing the field entirely", () => {
    expect(matchesCriterion(game(), text("event", "notContains", "World Cup"))).toBe(true);
    expect(matchesCriterion(game(), text("event", "notContains", "Tata"))).toBe(false);
    expect(matchesCriterion(game({ event: null }), text("event", "notContains", "Tata"))).toBe(
      true,
    );
  });
});

describe("number criteria", () => {
  it("compares over, under, is and between", () => {
    const over = { ...newCriterion("whiteElo"), operator: "over", value: "2800" } as Criterion;
    const under = { ...newCriterion("whiteElo"), operator: "under", value: "2800" } as Criterion;
    expect(matchesCriterion(game(), over)).toBe(true);
    expect(matchesCriterion(game(), under)).toBe(false);

    const between = {
      ...newCriterion("blackElo"),
      operator: "between",
      value: "2700",
      value2: "2800",
    } as Criterion;
    expect(matchesCriterion(game(), between)).toBe(true);
  });

  it("accepts a between whose bounds were entered backwards", () => {
    // Nobody means "no games" by typing the larger number first.
    const backwards = {
      ...newCriterion("blackElo"),
      operator: "between",
      value: "2800",
      value2: "2700",
    } as Criterion;
    expect(matchesCriterion(game(), backwards)).toBe(true);
  });

  it("never matches a game that does not carry the number", () => {
    // An unrated game is not a game rated zero. Comparing it as zero would put every unrated
    // game at the top of an "Elo under 2000" search, which is the wrong answer confidently.
    const under = { ...newCriterion("whiteElo"), operator: "under", value: "2000" } as Criterion;
    expect(matchesCriterion(game({ whiteElo: null }), under)).toBe(false);
  });

  it("counts moves the way a player counts them, not in plies", () => {
    const under = { ...newCriterion("moves"), operator: "under", value: "41" } as Criterion;
    // 81 plies is move 41, not move 81.
    expect(matchesCriterion(game({ plyCount: 81 }), under)).toBe(false);
    expect(matchesCriterion(game({ plyCount: 79 }), under)).toBe(true);
  });
});

describe("dateInterval", () => {
  it("reads a complete date as a single day", () => {
    expect(dateInterval({ raw: "2024.01.20", parsed: "2024-01-20", year: 2024, month: 1 })).toEqual(
      { lo: 20240120, hi: 20240120 },
    );
  });

  it("reads a year-only date as the whole year, because that is what it means", () => {
    // Real files are full of `2024.??.??`. That is not a date, it is every day in 2024, and
    // every tool that quietly reads `??` as `01` gets later comparisons wrong.
    expect(dateInterval({ raw: "2024.??.??", parsed: null, year: 2024, month: null })).toEqual({
      lo: 20240101,
      hi: 20241231,
    });
  });

  it("has nothing to compare when even the year is unknown", () => {
    expect(dateInterval({ raw: "????.??.??", parsed: null, year: null, month: null })).toBeNull();
  });
});

describe("date criteria", () => {
  const between = (from: string, to: string) =>
    ({ ...newCriterion("date"), operator: "between", from, to }) as Criterion;

  it("includes a game whose partially-known date could fall in range", () => {
    const yearOnly = game({
      date: { raw: "2024.??.??", parsed: null, year: 2024, month: null },
    });
    expect(matchesCriterion(yearOnly, between("2024-03-01", "2024-06-30"))).toBe(true);
  });

  it("excludes a game whose date could not fall in range", () => {
    const yearOnly = game({
      date: { raw: "2019.??.??", parsed: null, year: 2019, month: null },
    });
    expect(matchesCriterion(yearOnly, between("2024-03-01", "2024-06-30"))).toBe(false);
  });

  it("never matches a game with no date at all", () => {
    const undated = game({ date: { raw: "????.??.??", parsed: null, year: null, month: null } });
    expect(matchesCriterion(undated, between("2000-01-01", "2030-01-01"))).toBe(false);
  });

  it("reads after from the lower bound and before from the upper one", () => {
    const after = { ...newCriterion("date"), operator: "after", from: "2023-06-15" } as Criterion;
    const before = { ...newCriterion("date"), operator: "before", to: "2023-06-15" } as Criterion;
    expect(matchesCriterion(game(), after)).toBe(true);
    expect(matchesCriterion(game(), before)).toBe(false);
  });
});

describe("result criteria", () => {
  const wants = (value: string, operator = "is") =>
    ({ ...newCriterion("result"), operator, value }) as Criterion;

  it("matches each outcome", () => {
    expect(matchesCriterion(game(), wants("white"))).toBe(true);
    expect(matchesCriterion(game(), wants("black"))).toBe(false);
    expect(matchesCriterion(game({ result: GameResult.Draw }), wants("draw"))).toBe(true);
  });

  it("can ask for an unknown result without that meaning an unset criterion", () => {
    // The model uses null for "unknown or in progress", so the criterion needs its own
    // vocabulary — otherwise "looking for unknown results" and "not filled in" are the same
    // value and one of them has to lose.
    const unknown = game({ result: null });
    expect(matchesCriterion(unknown, wants("unknown"))).toBe(true);
    expect(matchesCriterion(game(), wants("unknown"))).toBe(false);
    expect(isInert(wants("unknown"))).toBe(false);
  });

  it("negates with isNot", () => {
    expect(matchesCriterion(game(), wants("white", "isNot"))).toBe(false);
    expect(matchesCriterion(game(), wants("black", "isNot"))).toBe(true);
  });
});

describe("operatorsFor", () => {
  it("offers operators that suit the field's type", () => {
    expect(operatorsFor("white")).toContain("contains");
    expect(operatorsFor("whiteElo")).toContain("over");
    expect(operatorsFor("date")).toContain("between");
    expect(operatorsFor("result")).toEqual(["is", "isNot"]);
  });
});

describe("applyFilters", () => {
  const carlsenWin = game();
  const drawnGame = game({
    white: { id: 9, name: "So, Wesley", normalisedName: "so, wesley" },
    result: GameResult.Draw,
    whiteElo: 2757,
  });
  const games = [carlsenWin, drawnGame];

  it("returns the very same array when no criterion is active", () => {
    // Referential identity, not just equality: the table memoises on this array, so handing
    // back a fresh copy every render would re-sort and re-render every row for nothing.
    expect(applyFilters(games, [], "all")).toBe(games);
    expect(applyFilters(games, [newCriterion("white")], "all")).toBe(games);
  });

  it("ANDs criteria under match-all", () => {
    const filtered = applyFilters(
      games,
      [text("white", "contains", "Carlsen"), { ...newCriterion("result"), value: "white" } as Criterion],
      "all",
    );
    expect(filtered).toEqual([carlsenWin]);
  });

  it("ORs criteria under match-any", () => {
    const filtered = applyFilters(
      games,
      [text("white", "contains", "So,"), { ...newCriterion("result"), value: "white" } as Criterion],
      "any",
    );
    expect(filtered).toHaveLength(2);
  });

  it("ignores inert criteria rather than letting them exclude everything", () => {
    const filtered = applyFilters(
      games,
      [text("white", "contains", "Carlsen"), newCriterion("event")],
      "all",
    );
    expect(filtered).toEqual([carlsenWin]);
  });
});
