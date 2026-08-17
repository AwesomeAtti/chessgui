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
| `rule` | — | The ADR-0009 rule this fixture exercises |
| `outcome` | **spec** | `imports` · `error` — there is no third state (rule 1) |
| `errorCode` | **spec** | Stable code, or `null` when the game imports |
| `plies` | **observed** | How many plies the frontend reader derives |
| `truncatedAtPly` | **observed** | Ply at which derivation stopped, or `null` if it ran to the end of what it could see |
| `note` | — | Why this case is in the corpus at all |

**Governed by ADR-0009 (strict import), which superseded ADR-0008's permissive tiers.** A game imports
unless a library refuses it, and then it produces exactly one error. **We add no validation of our
own**, which is why only **4 of the 18** fixtures are errors: an illegal move, two localised-notation
files that fail at a later token, and an unrecognised variant name. The other fourteen the libraries
accept — several despite not conforming to the PGN specification — and their notes say so, because
those are ADR-0009's *accepted risks* rather than gaps in the corpus.

**Why a rejected fixture still carries observed values.** The importer refusing a game does not mean
the frontend reader should throw on it: a game already in the library must stay viewable if a later
parser change would reject it. So `mainline.ts` keeps truncating, and `plies`/`truncatedAtPly`
describe *display* behaviour rather than import policy.

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

**Eighteen fixtures, covering ADR-0009 rules 1, 3 and 4** (B-099 done). Rule 2 — nothing is repaired,
and rejected games are not stored — is a constraint on the implementation rather than an observable
property of a file, so it has no fixture. A test asserts that exact rule set is covered, and it
earned its place immediately: **it failed loudly when ADR-0009 replaced ADR-0008's seven rules with
four**, which is precisely the staleness it exists to catch.

`clean-standard.pgn` is the **negative control**: a corpus made only of malformed input would be
passed by a harness that reports a warning for everything. That habit is now five for five here
(`check:i18n`, B-048's plain-browser baseline, `survey-pgn.mjs`, B-106's two, and this).

### What this corpus measured, and how it changed the policy twice

Written down here because it is the reason to build a corpus *against a policy* rather than against a
finished importer. An importer would have been written to the ADR's assumptions, and every one of
these would have looked like correct behaviour.

1. **Localised SAN is not rejected, it is silently reinterpreted.** `Sf3` does not fail: the PGN
   *tokenizer* drops the unrecognised piece letter and yields `f3`, a legal pawn move. A German game
   becomes a different, legal game that nobody played, with no warning, until a later `Lb5` fails.
   ADR-0008 handled this with a heuristic file-wide language scan. **ADR-0009 reports it as invalid
   movetext, which is what it is** — PGN mandates English SAN — and **B-098 was rejected outright**
   rather than deferred. This fixture is the single strongest argument for strictness over repair.
2. **chessops honours the `Variant` tag**, so ADR-0008 rule 3b's premise was false: it assumed a
   variant game walked under standard rules yields a useless "illegal move at ply 2". It does not.
   The premise turned out to be true of *Rust* and false of *TypeScript* — shakmaty makes the caller
   choose a variant, chessops reads the tag — so the two libraries this project deliberately pairs
   have opposite defaults for the same tag, which is the B-064 category exactly. Variants are now
   selected and walked (ADR-0009 rule 4).
3. **An unsupported variant is indistinguishable from a broken position.** An unknown `Variant` value
   makes `startingPosition()` return `ERR_VARIANT`, surfaced as `truncatedAtPly: 0` — the same
   observable as an unparseable FEN. And `[Variant "Fischerandom"]` silently maps to *standard
   chess*, so a Chess960 game with no FEN derives a plausible, wrong mainline with no error at all.
   Both need explicit error codes precisely because the parser will not object.
4. **Four smaller ones, each on its fixture:** an unterminated comment swallows four plies and the
   termination marker while reporting success; an unterminated tag quote turns one damaged game into
   *two*, so a game's index within a file is not a stable identifier for an error message; missing
   roster tags come back filled in as `?`/`*`, so conformance cannot be judged from the parser's
   header map; and duplicate tags resolve first-one-wins, with nothing guaranteeing pgn-reader
   agrees.

**The corpus changed the governing decision twice** — ADR-0008's rule 3b, then the whole policy — and
survived both, because a file that must be rejected is exactly as useful a fixture as a file to be
repaired. That is the argument for writing fixtures against a policy while the policy is still cheap
to change.

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
