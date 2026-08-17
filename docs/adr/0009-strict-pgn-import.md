# ADR-0009: PGN import is strict — the libraries decide, and we add no validation

- **Status:** accepted
- **Date:** 2026-08-17
- **Deciders:** Owner (session 5)
- **Supersedes:** **ADR-0008 rules 1, 2, 3, 4, 5 and 7.** Rule 6 was already removed by ADR-0008's
  own session-5 addendum. Rule 3b survives in amended form and is restated here.
- **Backlog link:** B-114. Governs B-007; simplifies B-011, B-097, B-098, B-100

## Context

ADR-0008 decided a permissive, tiered import: every game gets one of three derived dispositions —
`clean`, `imported`-with-warnings, or `quarantined`-but-retained — with repair rules for malformed
notation, mixed encodings, and localised piece letters. It was argued carefully and it was accepted.

**The owner rejected it as disproportionate, and the evidence supports that.** Two facts, both
available before this ADR:

1. **The measured corpus is spotless.** B-101's survey of the owner's chess.com export — the only
   real data anyone has looked at — reported *zero* anomalies: 100% UTF-8, Seven Tag Roster complete
   on every game, every date complete, no `Variant` tag, no unbalanced braces, no
   headers-without-moves, no non-English piece letters. The malformed tail that rules 4 and 5 exist
   for **has still never been measured** (B-101's loose-file half is un-run).
2. **ADR-0008's permissiveness bought less than it claimed.** Its central safety argument was that
   "repair cannot corrupt and rejection cannot lose", because verbatim PGN is stored in the row. But
   the stronger fact sits outside the database entirely: **the PGN file remains on the user's disk.**
   Refusing to import an unparseable game loses nothing that was not already retained by the
   filesystem. So permissiveness was free in *safety* and expensive in *complexity*, and only the
   first half got weighed.

There is also a plainer objection. When a parser refuses a game, **saying so is the accurate answer**,
and it is more useful than repairing the game into something the user did not play. What this ADR
deliberately does *not* claim is that we can detect every non-conforming file — see §"Accepted
risks". The claim is narrower and defensible: we report what the libraries report, and we do not
build a second opinion.

## Options considered

1. **Keep ADR-0008.** Tiered, permissive, repairing. Rejected: five rules of machinery for an
   unmeasured tail, and it makes B-007 the largest feature in the MVP.
2. **Reject the whole file if any game in it fails.** Simplest to implement, and wrong for the one
   case that genuinely matters: a 3,000-game export with four damaged games is not a damaged export.
3. **Strict per game, with the libraries as the only validator.** A game the parser accepts imports;
   a game it refuses is reported as an error with its location and is not imported. We add no checks
   of our own. **Chosen.**

## Decision

**Four rules. That is the whole policy.**

**1. The unit of import is one game, and a game either imports or is reported.**
No third state, no repair, no warnings tier. A game the libraries accept becomes a row. A game they
refuse produces an **error** carrying the game's position in the file, the library's own error kind as
a stable code, and the offending token or offset where one exists. The file is never the unit of failure — this is the one
part of ADR-0008 kept unchanged, because it costs nothing and a partly-damaged export is the normal
case.

**2. Nothing is repaired, and nothing needs to be retained to make that safe.**
The verbatim PGN of *imported* games is still stored, because ADR-0005 makes it the source of truth
and everything else derived. But a rejected game is not stored at all: **the file it came from is
still on disk, which is the retention that matters.** The user is told which game in which file
failed and why, and can fix or re-export it.

**3. The parser is the validator. We do not add one.**
An error is **whatever `pgn-reader` and `shakmaty` refuse** — a token they cannot parse or play, a
start position they cannot build. Nothing more. **If the library accepts a game, we import it**, and
we do not inspect the file afterwards to second-guess that decision.

This is narrower than the first draft of this ADR, which listed conditions — missing required tags,
duplicate tags, a `Result` disagreeing with the termination marker — that **the libraries accept and
we would therefore have had to check ourselves.** That is a validator by another name, and writing one
is how a simple importer becomes a complicated one. Neither `chessops` nor `pgn-reader` offers a
strictness switch, so the choice is between accepting their behaviour and reimplementing PGN
validation. We accept their behaviour, and §"Accepted risks" below records what that costs.

**There are no exceptions, and an earlier draft of this ADR had one.** That draft added a single rule
of its own — a game with zero moves is not a game — to keep random bytes named `.pgn` out of the
library, on the grounds that it was a sanity check rather than a spec judgement. The owner's
correction was that this is still our validation wearing a smaller hat, and the correction is right:
a zero-moves guard is a rule we would then own, defend, and eventually find an exception to. So a
non-PGN file may produce one empty junk row. It is visible, it is removable, and it is in the risk
table below.

**One deliberate tolerance, because it is compliance rather than permissiveness:** the PGN
specification names ISO 8859-1, while every modern exporter emits UTF-8 and declares nothing. Try
UTF-8, fall back to Latin-1, record which was used. Two lines, and rejecting a Latin-1 file would be
rejecting a *conforming* one.

**4. Variants are selected, not refused** (carried over from ADR-0008's amended rule 3b).
Read the `Variant` tag and walk the game under the rules it names; `shakmaty` and `chessops` both
implement the same eight. A legal Antichess game imports. A variant name neither library
recognises is an error, because both refuse it.
**`[Variant "Fischerandom"]` with no `FEN` header imports as standard chess and derives a wrong
mainline** — an earlier draft of this rule called it an error, which would have required us to keep our
own list of variant names to check against. It is in the risk table instead.

## Accepted risks

**These are cases where the parser silently returns a game that is not quite the game in the file.**
Every one is measured (B-099), none is detectable without writing the validator this ADR declines to
write, and **all of them are accepted deliberately rather than overlooked.** Recorded here so that a
future session finding one of them in the wild recognises it as a known cost rather than a new bug.

| What happens | Measured behaviour | Why it is accepted |
|---|---|---|
| **An unrecognised piece letter is rewritten, not refused** | `chessops`'s tokenizer turns `Sf3` (German knight) into `f3`, a legal pawn move. A German file therefore imports its first few plies as *different legal moves* before failing on a later token | Detecting it needs a notation-language scan over raw movetext — ADR-0008 rule 4, now rejected (B-098). In practice such a file still fails somewhere, so it errors; a file that happened to reinterpret cleanly throughout would import wrongly and silently. Sources are chess.com and lichess, which emit English SAN |
| **Duplicate tags resolve first-one-wins** | A game with `[Result "1-0"]` and a later `[Result "0-1"]` imports, keeping the first | Catching it means counting tags ourselves. `pgn-reader` may resolve differently, which would be a real B-064 divergence — **document it, do not police it** |
| **The termination marker overwrites a contradicting `Result` tag** | Tag says `1-0`, movetext ends `0-1`, `chessops` reports `0-1` | Same reason. The derived `result` column may disagree with the file's own tag, and ADR-0005 makes that a re-import to fix rather than data loss |
| **Missing roster tags are filled with defaults** | Five absent tags come back as `Event: "?"`, `Result: "*"`; the header map always holds seven entries | A missing tag is indistinguishable from a literal `"?"` without reading the bytes. The row imports with `?` values, which is honest enough |
| **An unterminated comment silently swallows the rest of the game** | An unclosed `{` consumes four plies and the termination marker, and the parse reports complete success | **The most uncomfortable one**, because moves are lost with no signal at all. Accepted on the same grounds: the file is on disk, and detecting it means our own brace matching |
| **The whole table is cheap to be wrong about, and that is the point** | — | Nothing here can lose a game: the PGN file is untouched, so every one of these is a re-import away from being fixed once it is understood |
| **`[Variant "Fischerandom"]` flattens to standard chess** | Maps to `chess` and the standard starting position, so a Chess960 game with no `FEN` derives a plausible wrong mainline and reports nothing | Real Chess960 exports carry `SetUp`/`FEN`. Checking the variant name against a list we maintain is a rulebook |
| **Bytes that are not PGN import as one empty row** | A PNG signature plus random bytes yields *one game with seven default headers and no moves* rather than a refusal | The guard would be one line — and it would be a rule of ours, which is the thing this ADR declines. An empty row is visible and removable |
| **A game with no movetext imports** | Accepted by the library, so accepted by us | Also not obviously wrong: a scheduled-but-unplayed game legitimately looks like this |

**The through-line:** every mitigation would be a check we write and maintain, and every failure it
would catch is recoverable by re-importing — **we do not delete the PGN files, so the database is
disposable.** That is a fact about how the app works, not a property anyone has to defend: drop the
database, import again. **A wrong row is a re-import; a validation layer is forever.**

**Only four of the eighteen corpus fixtures are errors**, which is the honest measure of how much this
policy actually rejects: an illegal move, two localised-notation files that fail at a later token, and
an unrecognised variant name. Everything else the libraries accept, so we do.

If any of these turns out to matter in practice, the fix is **one targeted check with a fixture and a
recorded reason** — not a general validation layer, and not a rule added quietly because it seemed
obviously right at the time.

## Rationale

The decisive argument is not that clean sources dominate — that was the frequency claim ADR-0008 was
rightly challenged over, and it is still only half-measured. **It is that the cost of strictness is
bounded and visible while the cost of permissiveness is unbounded and invisible.**

A rejected game costs the user one error message about a file they still have. A silently repaired
game costs them a game in their database that is not the game they played, and they will never know.
B-099 measured exactly that: `Sf3` is not rejected by `chessops`, it is rewritten to `f3`, so a
German game becomes a different legal game with no warning. Under ADR-0008 that file imported with a
heuristic warning attached, produced by a language scan we would have written and maintained.

**Under this ADR it errors — but not because we detected the substitution.** It errors because a later
token, `Lb5`, is one the library will not play. The first two altered plies pass unnoticed, and a
localised file that happened to reinterpret cleanly all the way through would import as a wrong game
in silence. That is in the risk table above, accepted knowingly. The honest claim is not that
strictness catches this class of error; it is that **strictness stops us pretending we can, and costs
nothing to maintain.**

Simplicity is the second argument and it compounds:

- **`src/model/game.ts` never gains disposition or warning columns**, which ADR-0008 required and
  which — usefully — were never actually added, so there is nothing to unwind.
- **B-011's migration gets smaller** for the same reason.
- **B-064's shared assertion becomes boolean.** ADR-0008 had `shakmaty` and `chessops` agreeing on
  *the ply at which a mainline truncates*; they now only have to agree on *whether a game is valid*.
  A far smaller surface for two rule implementations to diverge on.
- **B-098 (notation-language detection) is no longer needed at all** and can be rejected rather than
  deferred. B-097's import report shrinks from "make rare warnings re-findable without training the
  user to dismiss them" to "list the errors".

## Consequences

- **Positive:** B-007 is materially smaller. The failure mode is loud rather than quiet. Two states
  instead of three. Three backlog items simplify and one disappears.
- **Negative / tradeoffs:**
  - **Games in the irreplaceable tail — club games, arbiter exports, hand-typed files — will be
    refused rather than half-understood.** This is the real cost, and it is accepted on the grounds
    that the file survives on disk and the error names the game. If the loose-file survey (B-101)
    turns up a large tail of near-miss files, revisit this ADR rather than adding repair rules
    underneath it.
  - **An error message is only as good as its location.** "Invalid movetext" without a game index and
    a token is a worse experience than a silent repair. The diagnostic quality is now load-bearing,
    where ADR-0008 could hide behind a disposition.
  - **Strictness is easy to reverse.** Adding permissiveness later means re-importing the files, which
    is cheap because the files are still there. No migration, no recovery exercise.
- **Follow-ups:** B-007's spec is rewritten against this ADR. `fixtures/pgn/expected.json` moves to
  this vocabulary — the corpus keeps every fixture, since a corpus of things that must be *rejected*
  is exactly as useful as one of things to be repaired, and its measured `plies`/`truncatedAtPly`
  observations describe the frontend reader and are unaffected. **B-098 to be rejected. B-097 and
  B-100 shrink. B-101's loose-file half is now the thing that could reopen this**, which makes it
  more interesting than it was, not less.
- **Kept deliberately from ADR-0008:** the per-game unit (rule 1's best idea), verbatim PGN as the
  source of truth for imported games, and variant selection. ADR-0008 stays in the repository as the
  record of how the question was worked through — it was superseded by argument and evidence, which
  is the process working rather than failing.
