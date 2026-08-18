import { describe, expect, it } from "vitest";

import {
  allTags,
  isAbsentTagValue,
  moveCount,
  parseTimeControl,
  presentTag,
} from "./infoFields";

describe("isAbsentTagValue", () => {
  it("treats the PGN specification's placeholders as nothing", () => {
    // chess.com writes Round "-" on every live game; the first version of the panel printed
    // it literally and it read as a bug.
    expect(isAbsentTagValue("-")).toBe(true);
    expect(isAbsentTagValue("?")).toBe(true);
    expect(isAbsentTagValue("")).toBe(true);
    expect(isAbsentTagValue("   ")).toBe(true);
    expect(isAbsentTagValue(null)).toBe(true);
    expect(isAbsentTagValue(undefined)).toBe(true);
  });

  it("does not swallow a value that merely contains a placeholder character", () => {
    // "?" alone is unknown; "Round 3?" is somebody's actual round.
    expect(isAbsentTagValue("Round 3?")).toBe(false);
    expect(isAbsentTagValue("1-0")).toBe(false);
    expect(isAbsentTagValue("Semi-final")).toBe(false);
    expect(isAbsentTagValue("0")).toBe(false);
  });

  it("trims, so a padded value is still a value", () => {
    expect(presentTag("  Live Chess  ")).toBe("Live Chess");
    expect(presentTag(" - ")).toBeNull();
  });
});

describe("parseTimeControl", () => {
  it("reads whole minutes as minutes, which is how players say them", () => {
    expect(parseTimeControl("600")).toEqual({ kind: "minutes", minutes: 10 });
    expect(parseTimeControl("180")).toEqual({ kind: "minutes", minutes: 3 });
  });

  it("does not force a fraction of a minute into minutes", () => {
    // 90 seconds is 90 seconds. "1.5 min" is the kind of tidying that reads as wrong.
    expect(parseTimeControl("90")).toEqual({ kind: "seconds", seconds: 90 });
    expect(parseTimeControl("30")).toEqual({ kind: "seconds", seconds: 30 });
  });

  it("reads base plus increment, the commonest online format", () => {
    expect(parseTimeControl("600+5")).toEqual({
      kind: "increment",
      base: { kind: "minutes", minutes: 10 },
      increment: 5,
    });
    expect(parseTimeControl("45+45")).toEqual({
      kind: "increment",
      base: { kind: "seconds", seconds: 45 },
      increment: 45,
    });
  });

  it("shows a format it cannot read rather than hiding or guessing it", () => {
    // Moves-per-session and sandclock are both in the PGN spec and neither is understood
    // here. Printing them verbatim keeps the file authoritative, which is the whole rule.
    expect(parseTimeControl("40/9000")).toEqual({ kind: "raw", text: "40/9000" });
    expect(parseTimeControl("*180")).toEqual({ kind: "raw", text: "*180" });
    expect(parseTimeControl("40/9000:300")).toEqual({ kind: "raw", text: "40/9000:300" });
  });

  it("treats the spec's placeholders as no time control at all", () => {
    expect(parseTimeControl("-")).toEqual({ kind: "absent" });
    expect(parseTimeControl("?")).toEqual({ kind: "absent" });
    expect(parseTimeControl(null)).toEqual({ kind: "absent" });
  });
});

describe("moveCount", () => {
  it("counts full moves, rounding a half move up to the move it belongs to", () => {
    expect(moveCount(7)).toBe(4);
    expect(moveCount(8)).toBe(4);
    expect(moveCount(1)).toBe(1);
  });

  it("has nothing to show for a game with no movetext", () => {
    expect(moveCount(0)).toBeNull();
    expect(moveCount(null)).toBeNull();
  });
});

describe("allTags", () => {
  it("returns every tag, including the ones shown in the groups above", () => {
    // "All tags" that omits the promoted ones is a worse lie than no disclosure (B-060).
    const tags = { Result: "1-0", Event: "Live Chess", Link: "https://example.invalid/1" };
    expect(allTags(tags)).toHaveLength(3);
  });

  it("sorts, so the tag you came looking for is where you expect", () => {
    expect(allTags({ Zulu: "z", Alpha: "a", Mike: "m" }).map(([key]) => key)).toEqual([
      "Alpha",
      "Mike",
      "Zulu",
    ]);
  });

  it("has nothing to show for a game with no tags", () => {
    // Reachable: bytes that are only PGN by extension import as one empty junk row.
    expect(allTags({})).toEqual([]);
  });
});
