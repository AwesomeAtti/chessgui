# ADR-0009: PGN import is strict — the libraries decide, and we add no validation

- **Status:** accepted — **with a session-6 addendum before the Rationale**, which narrows how rule 1
  should be read: an import error turns out to be terminal, so a file *is* the unit of failure for
  everything after the bad game. Measured, not argued.
- **Date:** 2026-08-17 (addendum 2026-08-18)
- **Deciders:** Owner (session 5); addendum owner-decided (session 6)
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
refuse produces an **error** carrying the game's position in the file, the library's own error kind
as a stable code, and the offending token or offset where one exists. The file is never the unit of
failure — the one part of ADR-0008 kept unchanged, because it costs nothing and a partly-damaged
export is the normal case.

**2. Nothing is repaired, and nothing needs to be retained to make that safe.**
The verbatim PGN of *imported* games is still stored, because ADR-0005 makes it the source of truth
and everything else derived. But a rejected game is not stored at all: **the file it came from is
still on disk, which is the retention that matters.** The user is told which game in which file
failed and why, and can fix or re-export it.

**3. The parser is the validator. We do not add one — and the MVP importer does not even check
legality.**
An error is **whatever `pgn-reader` refuses**, which is a judgement about syntax. Nothing more. If it
accepts a game, we import it, and we do not inspect the file afterwards to second-guess that.

**Legality is a separate question, and answering it is optional.** `pgn-reader` states plainly that it
does not validate moves: it hands back SAN tokens, and legality happens only if we ask `shakmaty` to
play them into a position. **Asking is us adding validation.** So the MVP importer never builds a
board — every ADR-0005 hot field comes from tags, `plyCount` is a token count, and `result` comes from
the tag or the termination marker. Nothing in the MVP needs a position.

**Legality is still checked, in the place where it is free.** `mainline.ts` walks a game with
`chessops` when the user opens it and truncates at the first illegal move — one game, on demand,
instead of three thousand at import. A game with a broken move therefore lands in the library and
visibly stops when opened, which is a better failure than being refused at the door.

Rust gets a board when it genuinely needs one: the position index (B-018/B-042) and engine analysis
(B-019), both post-MVP. `shakmaty` becomes a direct dependency then, with its `variant` feature.

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

**4. Variants are selected, not refused** (carried over from ADR-0008's amended rule 3b) — **and in
the MVP this is entirely the display side's job.** The importer builds no position, so it has nothing
to select: `chessops` reads the `Variant` tag itself and walks the game under the right rules, which
is why a legal Antichess game already displays correctly today. The rule matters for Rust when the
position index arrives. A legal Antichess game imports; a variant name the reader does not recognise
fails on the display side rather than at import.
**`[Variant "Fischerandom"]` with no `FEN` header imports as standard chess and derives a wrong
mainline** — an earlier draft of this rule called it an error, which would have required us to keep our
own list of variant names to check against. It is in the risk table instead.

## Stated assumption: PGN input is English SAN

**Decided (owner, session 5): assume every imported file uses English SAN, and do not attempt to
detect otherwise.** PGN mandates English SAN, chess.com and lichess emit it, and the alternative is
the language-detection machinery ADR-0008 rule 4 specified and B-098 rejected.

This is written as an **assumption** rather than buried in the risk table below, because it is the one
place where the policy knowingly accepts a *silently wrong game* rather than a missing one, and that
deserves to be stated where someone will find it:

> A file using German or French piece letters will import, will contain moves nobody played, and
> nothing will say so. `pgn-reader` drops the tokens it cannot parse; `chessops` rewrites them into
> different legal moves. The two produce different wrong games from the same bytes.

**Flagged for a later release as B-115** — better error handling, not detection. The distinction
matters and it is what makes B-115 cheap where B-098 was not: **we do not need to know what language a
file is in, only that the parser silently discarded part of it.** Comparing the parser's token count
against the movetext's own is a generic "something was dropped" signal that needs no language table,
no heuristics and no per-token guessing, and it catches every other silent-drop case as a bonus. It is
a check of ours, so it is not in the MVP — but when it arrives it should be that one, not a language
scan.

## Accepted risks — **measured, B-007 milestone 1**

These are the cases where a library silently returns a game that is not the game in the file. Every
row is now measured on **both** sides rather than reasoned about, and the measurement changed several
of them: an earlier version of this table was written from chessops' behaviour alone and was wrong
about what the importer can see.

**The headline result: `pgn-reader` refuses exactly one of the eighteen fixtures.** So the import
error set is not empty, as this ADR feared it might be, but it is very nearly so — and everything
else below is tolerated by both libraries without complaint.

| Case | `pgn-reader` (import) | `chessops` (display) | Why it is accepted |
|---|---|---|---|
| **Unrecognised piece letter** (`Sf3`) | **Drops the token.** `e4 e5 Sf3 Sc6 Lb5 a6` → `e4 e5 a6`, so black's `a6` becomes white's third move | **Rewrites the token.** `Sf3` → the legal pawn move `f3`, giving `e4 e5 f3 c6` before truncating | **Two different wrong games from one file, neither reported.** Covered by the stated assumption above and **flagged as B-115** for a later release. Not accepted quietly: it is the worst case in this table |
| **Illegal move** (`Qg7`) | Accepts all 9 tokens — no legality check | Refuses it, truncates at ply 6 | So the ply count and the playable game disagree. Making them agree means a legality walk over every import, which is the validation this ADR declines |
| **Unterminated comment** | **REFUSED** — `unterminated comment`, no game at all | Reads it as a complete success, silently losing four plies and the marker | The only refusal in the corpus. Note the asymmetry: the *stricter* library is the one doing the importing, which is the good way round |
| **Unterminated tag quote** | Recovers: **one** game, seven correct tags | Splits into **two** games, the first with none of the real tags | Same bytes, different game count. Consequence: a game's index in a file is not a stable identifier for an error message |
| **Missing roster tags** | Reports the 2 tags that exist | Fabricates 7 defaults (`?`, `*`) | **This one is retired rather than accepted:** the importer sees the truth for free, so nothing is hidden on the side that stores data |
| **Duplicate tags** | Hands back all 9 in file order | Collapses to 7, keeping the first | Not a validation question — **the importer must choose**, which is a decision. First-one-wins, to stay consistent with the display |
| **`Result` vs termination marker** | **Measured at milestone 2: reports both and reconciles neither.** `tag()` gives `1-0` and `outcome()` gives `0-1` for the same game | Marker overwrites the tag: reports `0-1` for a file tagged `1-0` | **The tag wins**, because ADR-0005 derives every hot field from tags; the marker is the fallback for a file with no `Result` tag at all. So the library table and a chessops-derived view disagree about this one game. Accepted: making them agree means one side second-guessing the other, and a wrong derived `result` is a re-import |
| **Unterminated tag *mid-file*** | **Not an error at all — it silently merges two games into one**, tags and moves together. It only becomes an error at end of input | n/a | Measured at milestone 2 and worse than a refusal, because nothing reports it. Catching it means us counting tags or re-splitting the file, which is a parser of our own |
| **Bytes that are not PGN** | One game, **zero tags, zero tokens** | One game with 7 fabricated headers | An empty row either way. Rejecting it means a rule of ours; the Rust row is at least visibly empty |
| **No movetext at all** | Imports as a row with no moves | Same | Also not obviously wrong: a scheduled-but-unplayed game looks exactly like this |
| **`[Variant "Fischerandom"]` without `FEN`** | Imports; builds no position, so has no opinion | Flattens to standard chess and derives a legal, wrong mainline | Catching it means maintaining our own list of variant names |
| **Unsupported variant name** | Imports happily | Refuses to build a position; indistinguishable from a bad FEN | An import success and a display failure, like the illegal-move row |

**The through-line:** every mitigation is a check we would write and maintain, and every failure it
would catch is recoverable — **we do not delete the PGN files, so the database is disposable.** Drop
it, import again. A wrong row is a re-import; a validation layer is forever.

**What genuinely surprised the measurement**, recorded because the pattern recurs: the two libraries
disagree far more widely than "do they agree on legality". They disagree about how many games a file
contains, how many tags it has, whether it parses at all, and — in the localised-notation case — about
which wrong game to produce. None of that is a bug in either. They are answering different questions
for different callers, and the corpus is what makes the differences visible instead of theoretical.

If any of these turns out to matter in practice, the fix is **one targeted check with a fixture and a
recorded reason** — not a general validation layer, and not a rule added quietly because it seemed
obviously right at the time.

## Addendum, session 6 — **an import error is terminal, and rule 1 has to be read more narrowly**

Rule 1 says "one game imports or one game errors; **a file is never the unit of failure**". B-007
milestone 2 measured what that means in practice, and the second half is only half true.

**`pgn-reader`'s entire error vocabulary is two messages** — `unterminated tag` and
`unterminated comment`, both `io::ErrorKind::InvalidData`. That is not inferred from behaviour; it is
read from the crate's own source (`reader.rs`), which is a closed set we can rely on until the crate
changes (B-063). Everything else is an IO error from the underlying reader, which an in-memory string
cannot produce.

**Both are irrecoverable, and the crate says so.** Measured on a `clean · unterminated-comment · clean`
input: the unclosed `{` swallows the third game into the comment, the error's byte span runs to the end
of the input, and `has_more()` returns false. So **there is at most one error per input, and every game
after it is lost.**

That falsifies B-007's acceptance criterion "a file of 3,000 games containing 4 the parser refuses
imports 2,996 rows and reports 4 errors". It is not reachable, and the spec has been corrected rather
than the code bent to meet it.

**We do not resynchronise, and the reasoning is the same shape as the rest of this ADR.** Scanning
forward for the next `[Event ` after a failure would recover the remaining games, and every recovered
game would still be parsed in full by `pgn-reader` — so it would not weaken rule 3. What it would add
is a piece of our own logic deciding where a game begins, permanently, for an event **nobody has
counted**. B-101's un-run half is that count. Meanwhile the importer fails loudly: the error carries a
stable code, the byte offset past which nothing could be read, and the failing game's `White`, `Black`
and `Date` — measured to survive, because the tag section is parsed before the movetext fails. The user
still has the file, which is this ADR's whole safety argument.

**The asymmetry that decided it:** adding recovery later is fifteen lines and a fixture; removing it
once shipped is not. The behaviour is pinned by a test, so whoever changes their mind has to say so.

**Read rule 1 as: a file is never the unit of failure *for the games the parser reached*.** That is
weaker than it first sounded, and it is what the library actually offers.

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
- **B-064 largely evaporates for the MVP.** "Two chess rule implementations must agree" is a risk only
  because both walk moves. In the MVP only `chessops` does — the importer never builds a board — so
  there is nothing to diverge. The risk returns with the position index (B-018/B-042), and returns
  smaller, because by then the shared corpus already exists to test it against.
- **B-098 (notation-language detection) is no longer needed at all** and can be rejected rather than
  deferred. B-097's import report shrinks from "make rare warnings re-findable without training the
  user to dismiss them" to "list the errors".

## Consequences

- **Positive:** B-007 is materially smaller — no positions, no FEN handling, no variant selection, no
  legality walk, and `shakmaty` is not even a direct dependency. Two states instead of three. Three
  backlog items simplify and one disappears. **B-064 largely evaporates for the MVP**: "two chess rule
  implementations must agree" is a risk only because both walk moves, and in the MVP only `chessops`
  does. It returns with the position index.
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
