/**
 * Tests for the PGN mainline walker.
 *
 * These cases are not new. They were run by hand at B-093 in session 3, passed, and were then
 * thrown away — which meant the walker was verified exactly once, at a moment nobody can
 * re-enter. Committing them is the whole point: ADR-0008 rule 3 makes this reader's truncation
 * behaviour part of the import contract, so it needs to keep being true rather than to have been
 * true.
 *
 * The second half reads `fixtures/pgn/`, the corpus shared with the Rust importer. See
 * `fixtures/README.md` for why that directory sits at the repository root.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { INITIAL_FEN } from "@/model/game";

import { clampPly, readMainline } from "./mainline";

describe("readMainline", () => {
  test("walks a standard mainline and reports no truncation", () => {
    const m = readMainline("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1/2-1/2");

    expect(m.san).toEqual(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"]);
    expect(m.truncatedAt).toBeNull();
    // One FEN per ply plus the starting position — the invariant the board and move list both
    // rely on when they index by ply.
    expect(m.fens).toHaveLength(m.san.length + 1);
    expect(m.fens[0]).toBe(INITIAL_FEN);
  });

  test("honours a FEN/SetUp header instead of assuming the opening position", () => {
    // A rook-and-king endgame. Studies and endgame collections routinely start mid-game, and
    // ADR-0005 keeps these tags, so ignoring them would silently play the moves in the wrong
    // position — which looks like a parser bug and is not one.
    const pgn = [
      '[SetUp "1"]',
      '[FEN "8/8/8/8/8/5k2/8/4K2R w - - 0 1"]',
      "",
      "1. Rh3+ Kf4 2. Rh8 *",
    ].join("\n");

    const m = readMainline(pgn);

    expect(m.fens[0]).not.toBe(INITIAL_FEN);
    expect(m.fens[0]).toContain("8/8/8/8/8/5k2/8/4K2R");
    expect(m.san).toEqual(["Rh3+", "Kf4", "Rh8"]);
    expect(m.truncatedAt).toBeNull();
  });

  test("plays castling, including from a position that carries castling rights", () => {
    // Castling is the move most likely to be mishandled quietly, and it is also the one that
    // depends on state the FEN carries rather than on the move text.
    const pgn = ['[SetUp "1"]', '[FEN "k7/8/8/8/8/8/8/4K2R w K - 0 1"]', "", "1. O-O Kb7 2. Rf7+ *"].join(
      "\n",
    );

    const m = readMainline(pgn);

    expect(m.truncatedAt).toBeNull();
    expect(m.san).toEqual(["O-O", "Kb7", "Rf7+"]);
    // King and rook both moved, in one move: e1→g1 and h1→f1.
    expect(m.fens[1]).toContain("5RK1");
    // And the right is spent — field 3 of the FEN is the castling field.
    expect(m.fens[1]?.split(" ")[2]).toBe("-");
  });

  test("reads a game with no result token", () => {
    // Unfinished and ongoing games are ordinary, not malformed. `*` must not be mistaken for a
    // move, and its absence must not be mistaken for a parse failure.
    const m = readMainline("1. d4 d5 2. c4 e6");

    expect(m.san).toEqual(["d4", "d5", "c4", "e6"]);
    expect(m.truncatedAt).toBeNull();
  });

  test("truncates at an illegal move rather than throwing", () => {
    // ADR-0008 rule 3: the derived mainline stops at the first illegal move and the game is
    // still usable. `Qg7` is well-formed SAN and unreachable for the queen on d1.
    const m = readMainline("1. e4 e5 2. Nf3 Nc6 3. Bb5 Bc5 4. Qg7 Qe7 1-0");

    expect(m.truncatedAt).toBe(6);
    expect(m.san).toEqual(["e4", "e5", "Nf3", "Nc6", "Bb5", "Bc5"]);
    // The moves after the illegal one are dropped, not skipped past.
    expect(m.san).not.toContain("Qe7");
    expect(m.fens).toHaveLength(7);
  });

  test("truncates at ply 0 when the starting position itself is unusable", () => {
    const m = readMainline('[SetUp "1"]\n[FEN "not a position"]\n\n1. e4 *');

    expect(m.truncatedAt).toBe(0);
    expect(m.san).toEqual([]);
  });

  test("returns an empty mainline for input containing no game", () => {
    const m = readMainline("");

    expect(m.san).toEqual([]);
    expect(m.fens).toEqual([INITIAL_FEN]);
    expect(m.truncatedAt).toBeNull();
  });
});

describe("clampPly", () => {
  const m = readMainline("1. e4 e5 2. Nf3 *");

  test("clamps to the ends and passes valid plies through", () => {
    expect(clampPly(m, -5)).toBe(0);
    expect(clampPly(m, 0)).toBe(0);
    expect(clampPly(m, 2)).toBe(2);
    expect(clampPly(m, 3)).toBe(3);
    expect(clampPly(m, 99)).toBe(3);
  });
});

/**
 * The shared corpus (B-099), governed by **ADR-0009 — the libraries are the validator**.
 *
 * **Everything asserted here is measured.** `plies` and `truncatedAtPly` are what this reader does,
 * observed rather than predicted. The manifest deliberately carries **no import expectations** at
 * all: under ADR-0009 the MVP importer adds no validation, so an import error is exactly a game
 * `pgn-reader` refuses — and nobody has measured which those are. B-007 milestone 1 measures it.
 * Two rounds of expectations written from theory were wrong before that was accepted.
 *
 * **This corpus is therefore the display side's contract, and that is not a demotion.** Legality is
 * checked here rather than at import, because this is where it is free: one game, when the user opens
 * it, instead of three thousand at import time.
 *
 * `plies` is asserted separately from `truncatedAtPly` because the worst cases are the ones that lose
 * moves while reporting success — see the `unterminated-comment` fixture, which drops four plies and
 * a termination marker with `truncatedAt` null.
 */
interface ExpectedFixture {
  readonly file: string;
  readonly rule: string;
  /** Observed: how many plies this reader derives. */
  readonly plies: number;
  /** Observed: where derivation stopped, or `null` if it ran to the end of what it could see. */
  readonly truncatedAtPly: number | null;
  readonly note: string;
}

const CORPUS = new URL("../../../fixtures/pgn/", import.meta.url);

const expected: readonly ExpectedFixture[] = (
  JSON.parse(readFileSync(fileURLToPath(new URL("expected.json", CORPUS)), "utf8")) as {
    fixtures: ExpectedFixture[];
  }
).fixtures;

describe("shared fixture corpus", () => {
  test("the corpus is reachable and non-empty", () => {
    // Guards the one failure mode that would otherwise look like success: a moved directory
    // leaves zero fixtures, every loop below runs zero times, and the suite passes green.
    expect(expected.length).toBeGreaterThan(0);
  });

  test("every .pgn file on disk is listed in expected.json", () => {
    // Both directions matter, and the dangerous one is a fixture added to the directory and never
    // added to the manifest: it is then read by nothing, asserted by nothing, and looks like part
    // of the corpus. A manifest entry for a deleted file already fails loudly when read.
    const onDisk = readdirSync(fileURLToPath(CORPUS))
      .filter((f) => f.endsWith(".pgn"))
      .sort();

    expect(onDisk).toEqual(expected.map((f) => f.file).sort());
  });

  test("every ADR-0009 rule with a testable consequence has at least one fixture", () => {
    // Rules 1, 3 and 4. Rule 2 — nothing is repaired and rejected games are not stored — is a
    // constraint on the implementation rather than an observable property of a file, so it has no
    // fixture and should not have one. This assertion is what stops the corpus going stale when the
    // policy changes: it failed loudly when ADR-0009 replaced ADR-0008's seven rules with four.
    const covered = new Set(expected.map((f) => f.rule));

    expect([...covered].sort()).toEqual(["1", "3", "4"]);
  });

  test.for(expected)("$file (ADR-0008 rule $rule)", (fixture) => {
    const pgn = readFileSync(fileURLToPath(new URL(fixture.file, CORPUS)), "utf8");

    // ADR-0008's first premise is that nothing is ever the unit of failure, so the reader must
    // not throw on any input — including bytes that are only PGN by extension.
    const m = readMainline(pgn);

    expect(m.truncatedAt).toBe(fixture.truncatedAtPly);
    // Asserted independently: a game can be silently shortened while reporting no truncation.
    expect(m.san).toHaveLength(fixture.plies);
    expect(m.fens).toHaveLength(fixture.plies + 1);

  });
});

/**
 * The two findings from B-099 that are worth pinning as behaviour rather than only as prose,
 * because both are cases where the reader succeeds and is wrong. If either of these tests starts
 * failing, chessops has changed something load-bearing and ADR-0008 rule 4 or 3b needs re-reading.
 */
describe("measured surprises worth locking down", () => {
  test("German SAN is silently reinterpreted as a different legal game", () => {
    const pgn = readFileSync(fileURLToPath(new URL("german-san.pgn", CORPUS)), "utf8");
    const m = readMainline(pgn);

    // `Sf3` (Springer, i.e. knight) is not rejected: the tokenizer drops the unknown piece letter
    // and yields a legal pawn move to the same square. The game becomes one nobody played.
    expect(m.san).toEqual(["e4", "e5", "f3", "c6"]);
    expect(m.san).not.toContain("Sf3");
    // And the corruption is upstream of legality — a pawn really is on f3.
    expect(m.fens[3]).toContain("5P2");
  });

  test("a Variant tag is honoured, so variant games derive correctly rather than failing", () => {
    const pgn = readFileSync(fileURLToPath(new URL("variant-crazyhouse.pgn", CORPUS)), "utf8");
    const m = readMainline(pgn);

    // This is what rewrote ADR-0008 rule 3b (B-113). The original rule expected "illegal move at
    // ply 2" here; chessops reads the tag, returns a Crazyhouse position, and plays the drop. The
    // pocket is visible in the FEN. shakmaty can do the same via VariantPosition behind its
    // `variant` cargo feature — it just has to be asked, which is the whole asymmetry.
    expect(m.truncatedAt).toBeNull();
    expect(m.san).toContain("P@e4");
    expect(m.fens[0]).toContain("[]");
  });

  test("an unrecognised variant name is indistinguishable from an unusable position", () => {
    const unknown = readFileSync(fileURLToPath(new URL("variant-unknown-name.pgn", CORPUS)), "utf8");
    const badFen = readMainline('[SetUp "1"]\n[FEN "not a position"]\n\n1. e4 *');

    // Both surface as truncatedAt 0, which is why the amended rule 3b keeps a distinct warning
    // for the variant case: "we cannot walk this variant" and "these bytes are not a position"
    // want different words in front of a user, and the reader cannot tell them apart.
    expect(readMainline(unknown).truncatedAt).toBe(0);
    expect(badFen.truncatedAt).toBe(0);
  });
});
