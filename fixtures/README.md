# Fixtures

A single corpus of PGN files, read by both the TypeScript reader and the Rust test suite.

## Why this directory sits at the repository root

Neither language owns it. It is read from two places, and both paths are asserted so that a moved
directory fails loudly instead of quietly going unread:

- TypeScript: `../../../fixtures/pgn` from `src/features/game/`.
- Rust: `../fixtures/pgn` relative to `CARGO_MANIFEST_DIR` (`src-tauri/`).

## `pgn/expected.json`

| Field | Side | Meaning |
|---|---|---|
| `file` | — | Filename within `fixtures/pgn/` |
| `rule` | — | The ADR-0009 rule this fixture illustrates |
| `importOutcome` | Rust | **Measured:** `imports` or `refused`. One of eighteen is refused |
| `importErrorCode` | Rust | **Measured:** the stable code for a refusal, or `null` |
| `importTags` | Rust | **Measured:** tag pairs `pgn-reader` handed back, repeats included |
| `importedTags` | Rust | **Measured:** tags the importer keeps after first-one-wins. Differs from `importTags` on exactly one fixture, and that difference *is* the duplicate-tag decision |
| `importTokens` | Rust | **Measured:** movetext tokens the parser handed back, which becomes `plyCount` |
| `plies` | TypeScript | **Measured:** how many plies the frontend reader derives |
| `truncatedAtPly` | TypeScript | **Measured:** where derivation stopped, or `null` if it read to the end of what it could see |
| `note` | — | What this fixture demonstrates — the most valuable column |

**Every field is measured.** Two earlier versions carried *predicted* importer behaviour —
`disposition`/`warnings`, then `outcome`/`errorCode` — describing what the importer *should* do. Both
were written from theory and both were wrong as the policy moved, so the columns were removed and left
empty until something could fill them. **B-007 milestone 1 filled the import columns**
(`src-tauri/tests/pgn_reader_probe.rs`) and **milestone 2 turned them into assertions**
(`src-tauri/tests/import_corpus.rs`). The rule that came out of it: *if a field cannot be filled from a
measurement, leave it out until it can.* An empty column is honest; a guessed one gets asserted against
and then defended.

**Two suites read this file and they assert different columns**, which is the point of one shared
corpus: the Rust suite owns the `import*` fields because `pgn-reader` produces them, and the
TypeScript suite owns `plies`/`truncatedAtPly` because `chessops` does. Where the two disagree about
the same file, that is recorded rather than reconciled — see ADR-0009's accepted-risks table.

`plies` is recorded separately from `truncatedAtPly` because the worst failures are the ones that lose
moves while reporting success: `unterminated-comment.pgn` drops four plies and the termination marker
with `truncatedAtPly` of `null`.

## What governs this corpus

**ADR-0009: the libraries are the validator and we add nothing.** `pgn-reader` checks syntax;
legality is only checked if someone plays the moves, and in the MVP that happens on the display
side — `mainline.ts` with `chessops`, for the one game the user opens, rather than for three thousand
at import time.

**So this is primarily the display side's contract.** The notes describe what the reader does, and
several record an **accepted risk**: a file that does not conform to the PGN specification but that
the libraries tolerate anyway. Those are listed in ADR-0009 rather than defended against here.

## Status

**Eighteen fixtures, covering ADR-0009 rules 1, 3 and 4** (B-099 done). Rule 2 — nothing is repaired —
is a constraint on the implementation rather than an observable property of a file, so it has no
fixture. A test asserts that exact rule set is covered, and it earned its place immediately: **it
failed loudly when ADR-0009 replaced ADR-0008's seven rules with four**, which is the staleness it
exists to catch.

`clean-standard.pgn` is the **negative control** — a corpus made only of malformed input would be
passed by a reader that fails on everything.

### What this corpus measured, and how it changed the policy twice

The reason to write fixtures against a *policy* rather than against a finished importer: an importer
would have been written to the ADR's assumptions, and every one of these would have looked like
correct behaviour.

1. **Localised SAN is not rejected, it is silently reinterpreted.** `Sf3` does not fail — the
   tokenizer drops the unrecognised piece letter and yields `f3`, a legal pawn move, so a German game
   becomes a different legal game that nobody played, until a later `Lb5` fails. ADR-0008 answered
   this with a heuristic file-wide language scan; ADR-0009 accepts it as a known risk and **B-098 was
   rejected outright**. Whether `pgn-reader` rewrites tokens the same way is the open question
   milestone 1 answers.
2. **chessops honours the `Variant` tag**, so ADR-0008 rule 3b's premise was false. The premise was
   true of *Rust* and false of *TypeScript* — shakmaty makes the caller choose a variant, chessops
   reads the tag — so the two libraries this project pairs have opposite defaults for the same tag.
3. **An unsupported variant is indistinguishable from a broken position** on the reader side: an
   unknown `Variant` gives `ERR_VARIANT`, surfaced as `truncatedAtPly: 0`, exactly like an unparseable
   FEN. And `[Variant "Fischerandom"]` silently maps to standard chess, deriving a plausible wrong
   mainline with no error at all.
4. **Four smaller ones, each on its fixture:** an unterminated comment swallows four plies while
   reporting success; an unterminated tag quote turns one damaged game into *two*, so a game's index
   within a file is not a stable identifier; missing roster tags come back filled in as `?`/`*`; and
   duplicate tags resolve first-one-wins, with nothing guaranteeing `pgn-reader` agrees.

**The corpus outlived two governing decisions** — ADR-0008's rule 3b, then the whole policy — because
a file that must be rejected is exactly as useful a fixture as a file to be repaired. That is the
argument for writing fixtures while the policy is still cheap to change.

## Rules for adding fixtures

- **Invented names only.** No real players, ever — same rule as `src/mock/games.ts`, and for the same
  reason: real names are the habit that eventually puts one in a commit.
- **Verify the fixture before believing the failure.** Session 3 lost time to a fixture that appeared
  to expose a walker bug and was itself wrong. **Writing this corpus produced three more**: a castling
  test that moved the rook first, an endgame FEN claiming castling rights it could not have, and an
  Antichess game whose moves were not legal Antichess either — the last being the worst, because it
  truncated at ply 2 and therefore appeared to *confirm* the rule-3b misdiagnosis the ADR predicted.
  **A fixture that fails for the wrong reason is more dangerous than one that fails for none**, since
  it corroborates whatever you already believed. Ten seconds per position against chessops is the
  cure.
- Every fixture needs an `expected.json` entry with a `note`, and the Rust suite asserts the note is
  non-empty. A file nobody can explain is a file nobody dares change.
