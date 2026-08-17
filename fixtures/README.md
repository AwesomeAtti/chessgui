# Fixtures

A single corpus of PGN files, read by **both** the Rust importer and the TypeScript reader.

## Why this directory exists at the repository root

It is deliberately not under `src/` or `src-tauri/`, because neither language owns it. ADR-0008
rule 3 has `shakmaty` (Rust, at import) and `chessops` (TypeScript, in the open game) walking the
same mainline, and handover risk 4 / B-064 is that the two quietly disagree. A corpus duplicated
per language cannot detect that — the copies drift, and each side keeps passing its own tests.
One corpus, two readers, the same expectations file is what makes disagreement visible.

The path contract is therefore load-bearing and is itself tested from both sides:

- TypeScript reads `../../../fixtures/pgn` from `src/features/game/`.
- Rust reads `../fixtures/pgn` relative to `CARGO_MANIFEST_DIR` (`src-tauri/`).

If either path breaks, the corresponding test fails loudly rather than the corpus silently going
unread.

## `pgn/expected.json`

One entry per fixture, in ADR-0008's vocabulary:

| Field | Kind | Meaning |
|---|---|---|
| `file` | — | Filename within `fixtures/pgn/` |
| `rule` | — | The ADR-0008 rule this fixture exercises |
| `disposition` | **spec** | `clean` · `imported` · `quarantined` (rule 1) |
| `warnings` | **spec** | Warning codes, in any order. Empty for `clean` |
| `plies` | **observed** | How many plies the frontend reader derives |
| `truncatedAtPly` | **observed** | Ply at which derivation stopped, or `null` if it ran to the end of what it could see (rule 3) |
| `note` | — | Why this case is in the corpus at all |

**The two kinds of field are not equally trustworthy, and conflating them would make this corpus
look verified when it is not.**

- **Observed** fields were measured from the current reader and are asserted by
  `mainline.test.ts` today. They came from running the reader over each fixture and recording what
  happened — not from predicting it, which matters because three of the eighteen behaved differently
  from what the ADR would have led you to write.
- **Specification** fields are what ADR-0008 requires of the importer. **Nothing asserts them yet**,
  because there is no importer; B-007 does. Warning codes are provisional until then.

`plies` is recorded separately from `truncatedAtPly` because the worst failures are the ones that
lose moves while reporting success: `unterminated-comment.pgn` drops four plies and the result token
with `truncatedAtPly` of `null`.

`truncatedAtPly` is the field that makes this corpus shared rather than merely parallel: ADR-0008
rule 3 requires the importer to record the ply of the first illegal move, and `mainline.ts`
already truncates at exactly that point. Both sides asserting the same number against the same
file is the cheapest possible form of B-064.

## Status

**Eighteen fixtures, covering ADR-0008 rules 1, 2, 3, 3b, 4, 5 and 6** (B-099 done). Rule 7 is the
import report — UI, tested at B-097, with nothing to assert against a file. A test asserts that this
exact set of rules is covered, so deleting a fixture without noticing is not possible.

`clean-standard.pgn` is the **negative control**: a corpus made only of malformed input would be
passed by a harness that reports a warning for everything. That habit is now five for five here
(`check:i18n`, B-048's plain-browser baseline, `survey-pgn.mjs`, B-106's two, and this).

### Three things this corpus measured that the ADR gets wrong or understates

Written down here because they are the reason to build a corpus *against a policy* rather than
against a finished importer — an importer would have been written to the ADR's assumptions and
these would have looked like correct behaviour.

1. **Localised SAN is not rejected, it is silently reinterpreted** (rule 4). `Sf3` does not fail:
   the PGN *tokenizer* drops the unrecognised piece letter and yields `f3`, a legal pawn move. A
   German game becomes a different, legal game that nobody played, with no warning, and only a
   later `Lb5` truncates it. Rule 4 argued that legality cannot arbitrate between notation
   languages; the truth is worse, because the damage happens before legality is consulted and
   `node.san` no longer holds the file's own text.
2. **chessops honours the `Variant` tag** (rule 3b). Rule 3b assumes a variant game walked under
   standard rules yields a useless "illegal move at ply 2". It does not — `startingPosition()`
   reads the tag and returns the right variant position, so the mainline derives *correctly*
   across Antichess, Crazyhouse, Atomic, Three-check, King of the Hill, Horde and Racing Kings.
   Rule 3b as written would have the importer derive nothing for a game the frontend can play
   through in full: a B-064 divergence by specification rather than by bug. Raised as **B-113**.
3. **An unsupported variant is indistinguishable from a broken position.** An unknown `Variant`
   value makes `startingPosition()` return `ERR_VARIANT`, which the reader surfaces as
   `truncatedAtPly: 0` — the same observable it uses for an unparseable FEN. And
   `[Variant "Fischerandom"]` silently maps to *standard chess*, so a Chess960 game with no FEN
   derives a plausible, wrong mainline with no error at all.

**Warning codes are provisional.** `illegal_move` follows the shape of ADR-0008's own
`variant_unsupported`, but the vocabulary is properly settled at B-007 and displayed at B-097.
Renaming a code here is a find-and-replace across two files; it is recorded as provisional so
nobody mistakes it for a decided interface.

## Rules for adding fixtures

- **Invented names only.** No real players, ever — same rule as `src/mock/games.ts`, and for the
  same reason: real names are the habit that eventually puts one in a commit.
- **Verify the fixture before believing the failure.** Session 3 lost time to a fixture that
  appeared to expose a walker bug and was itself wrong — an illegal position, hand-written. A
  fixture asserting `clean` that is not actually legal will accuse working code. **Writing this
  corpus produced three more of them**: a castling test that moved the rook first, an endgame FEN
  claiming castling rights it could not have, and an Antichess game whose moves were not legal
  Antichess either — the last one being the worst, because it "passed" by truncating at ply 2 and
  therefore appeared to demonstrate exactly the rule-3b misdiagnosis the ADR predicted. **A fixture
  that fails for the wrong reason is more dangerous than one that fails for none**, and the cure was
  ten seconds of checking each position against chessops directly before asserting anything.
- Every fixture gets an `expected.json` entry and a `note`. A file nobody can explain is a file
  nobody dares change.
