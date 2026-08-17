# ADR-0008: PGN import fidelity — accept, repair, or reject

- **Status:** proposed
- **Date:** 2026-08-17
- **Deciders:** Owner (session 4)
- **Backlog link:** B-049 — blocks B-007; constrains B-011, B-073, B-078

## Context

Vision open question 2 asks how much malformed real-world PGN we accept, repair, or reject. It
is the last thing standing in front of B-007, and it has to be answered in writing first,
because a fidelity policy discovered incrementally while writing an importer is just a record of
which malformed file happened to arrive first.

Three forces bound the answer, and all three are already decided:

- **W1 says nothing may be silently dropped**, and malformed games must be *reported* rather
  than vanishing (`docs/core-workflows.md`). This is the moment the product either earns trust or
  loses it, on first run, with the user's own irreplaceable files.
- **ADR-0005 stores the verbatim PGN text in the row and derives everything else from it.**
  Derived values are never authoritative.
- **ADR-0003 chose `pgn-reader`, which deliberately does not validate legality**, leaving the
  decision to the caller. That is precisely what makes this a real choice rather than a default.

**The framing in the question is misleading, and noticing that is most of the work.**
"Accept / repair / reject" sounds like three exclusive dispositions for a file. But ADR-0005
already guarantees the raw bytes survive in the row, so *nothing we conclude about a game can
destroy it*. Repair cannot corrupt, because repair only ever writes derived columns. Rejection
cannot lose, because the text is retained. What is actually being decided is much narrower:
**how much derived understanding a partially-comprehensible game gets, and how the shortfall is
surfaced to the user.**

Real-world PGN is worse than the specification, in ways worth naming concretely because each
implies a different policy: unterminated comments and quotes; missing or duplicated Seven Tag
Roster entries; `Result` disagreeing with the game's own final token; dates like `2024.??.??`
(already handled by ADR-0005); Latin-1 bytes in player names in a file with no encoding
declaration; localised SAN piece letters from non-English software (B-073); moves that are
illegal in the position reached, whether from a transcription error or a variant we don't
support; games with headers and no moves; and files that are only PGN by extension.

## Options considered

1. **Strict — reject anything that does not fully conform.** Defensible for a tool that must
   guarantee its own data, and disastrous here: the user's first action is importing files they
   already own, and telling them their games are invalid makes the product the problem.
2. **Permissive — accept everything, parse what parses, say nothing.** Maximum apparent success
   and the worst failure mode this project has: silent data loss, which W1 forbids and which the
   user cannot detect until they go looking for a game that isn't there.
3. **Tiered per *game*, with the file never being the unit of failure** — every game that can be
   attributed at all is stored verbatim and derived as far as it can be, with the shortfall
   recorded per game and reported after the run.
4. **Tiered per *file*** — same as 3 but a file with any bad game is quarantined whole. Simpler
   to implement and wrong at the scale that matters: a 3,000-game export with four damaged games
   is not a damaged export.

## Decision

**Option 3. The unit of import is one game; the file is never the unit of failure.** Concretely,
seven rules.

**1. Every game gets exactly one of three dispositions, and the disposition is derived.**

- **`clean`** — tokenized, headers parsed, every mainline move legal in the position reached.
- **`imported`** — in the database and fully browsable, with one or more recorded warnings. This
  is the tier that does the work, and it is expected to be common rather than exceptional.
- **`quarantined`** — the bytes could not be attributed to a game at all: no move text *and* no
  recognisable tag pair. The text is still retained, still counted, still reportable, and still
  re-runnable after a parser fix. **"Rejected" is deliberately not a word we use, because we
  never discard.**

The disposition and its warnings are **derived, not authoritative** — recomputed from the stored
text on every re-import, exactly like every other derived column (ADR-0005). A better parser
next year silently upgrades old rows on a rebuild. That property is free here and would be
expensive to add later.

**2. Repair is always to derived values, never to the stored text.** The PGN column is
byte-preserved, including the malformed parts. If we misinterpret `Result` today, the fix is a
rule change and a re-import (B-078), not a data recovery exercise. This is the same construction
that let ADR-0004 downgrade the storage gate, and it is what makes an aggressive repair policy
safe rather than reckless.

**3. Legality is validated at import, and never blocks the row.** `shakmaty` walks the mainline;
the first illegal or ambiguous move is recorded with its ply and the derived mainline stops
there. The game imports with a warning. Two reasons to validate even though it costs time:
import is the only moment we can afford to know, and **the frontend already behaves this way** —
`mainline.ts` truncates at an illegal move rather than throwing, verified against fixtures at
B-093. Import agreeing with the reader it feeds is worth more than either behaviour on its own.

**4. Notation language is a property of the file, decided once, and never guessed per token
(B-073).** This is the rule most likely to be got wrong by writing the obvious thing first.
The obvious thing is "if a token fails as English SAN, try other languages and accept whatever
yields a legal move" — and it is unsafe, because the collisions are real and silent:
**`R` is rook in English and *roi* (king) in French; `D` is queen in both German and French but
nothing in English.** In a position where both a rook move and a king move to `d1` are legal,
`Rd1` is legal under either reading and means different games. Legality cannot arbitrate.

So: scan the whole file for unambiguous evidence — letters that exist in exactly one convention,
such as `S`/`L`/`T` for German or `C`/`F` for French — pick one notation language for the file,
and apply it consistently to every game in it. If the evidence is absent or contradictory,
**assume English and warn**; never mix conventions within a file, and never let one odd token
change the interpretation of a file that is otherwise plainly English. Storage stays canonical
English SAN (ADR-0005); the verbatim text keeps whatever the file said.

**5. Encoding: try UTF-8, fall back to Latin-1, never fail.** PGN's specification says
ISO 8859-1 and modern exporters emit UTF-8, with no declaration either way. Decode as UTF-8; on
an invalid sequence, decode the file as Latin-1 instead and warn. Which encoding was used is
recorded, because it is exactly the kind of thing that later explains a mangled player name — and
B-058's name normalisation is downstream of it, so a wrong guess here quietly corrupts grouping
rather than announcing itself.

**6. Duplicate identity is a content hash over the normalised game, not over the bytes.**
Idempotent re-import (B-078) needs an identity, and the naive choice — hash the verbatim text —
fails immediately, because the same game re-exported from the same site with different line
wrapping is byte-different and would import twice. So the key is a hash over the Seven Tag
Roster plus the derived canonical move sequence. **This is the highest-regret rule in this ADR**
and it is worth being explicit about why: it is a claim that two games with identical players,
event, date, round, result and moves *are* the same game. That is almost always true and is not a
theorem — a double round-robin with an unrecorded round number can produce genuine collisions.
Accepted deliberately, with the mitigation that a false merge is visible (a game the user expects
is missing) and recoverable (the merge is derived, so changing the key and re-importing restores
it). The alternative failure — duplicates accumulating on every re-import — is both more likely
and more corrosive.

**7. The run ends with a report the user can act on, not a count.** Imported, warned, and
quarantined totals, with the warned and quarantined games reachable and inspectable. A number
alone satisfies the letter of W1 and not its point. Warnings cross IPC as codes, never English
prose (B-072).

## Rationale

The decision is close to forced once the framing is corrected. Given that verbatim text is
retained and everything else is derived, permissiveness costs nothing in safety and buys
everything in first-run experience — **provided the shortfall is recorded rather than swallowed.**
Options 1 and 2 are the two ways to get that wrong: option 1 protects data that was never at
risk, option 2 protects the user from information they need.

The per-game granularity is the same judgement in miniature. A file is an accident of how the
user's games were exported; a game is the thing they care about. Failing at file granularity
would throw away thousands of good games to register a complaint about four.

**On fidelity versus speed**, which is how the vision phrased the question: full legality
validation is the only expensive rule here, and it is the one that can be relaxed later without
a schema change, precisely because it only writes derived columns. **No claim is made about its
cost, because none has been measured** — per B-077 and risk 9, this project does not get to
assert performance. B-033 owns the number; if validation turns out to dominate import time, it
becomes optional or deferred, and nothing else in this ADR moves.

## Consequences

- **Positive:** W1's promise becomes structural rather than aspirational. B-007 has a
  specification instead of a series of judgement calls. Warnings improve for free as the parser
  does, because they are derived. An aggressive repair policy is safe by construction.
- **Negative / tradeoffs:**
  - **`imported`-with-warnings will be the common case, not the rare one**, and a warning nobody
    reads is decoration. Presenting warnings without training the user to dismiss them is a real
    design problem and it is not solved here.
  - **The duplicate key can merge two genuinely distinct games** (rule 6). Accepted, visible,
    recoverable.
  - Notation-language detection is heuristic. It will misfire on files with no distinguishing
    letters, which is why the fallback is English-and-warn rather than a cleverer guess.
  - Import does more work per game, unmeasured.
  - **This adds a derived field to the game model** — disposition plus warning codes — which
    ADR-0005 does not currently carry. It is an addition to derived state, so it does not
    re-open that ADR, but `src/model/game.ts` and the migration at B-011 both need it.
- **Follow-ups:** B-007 implements this and needs a feature spec. B-011's migration carries the
  disposition and warning columns. **B-064 gains a specific and previously unstated test case:**
  rule 3 makes `shakmaty` and `chessops` both walk the same mainline, so a game shakmaty accepts
  and chessops truncates would present as `clean` and then visibly stop mid-game — the two rule
  implementations disagreeing in a way the user can see. A shared fixture corpus is the cheap
  guard. New items raised by this ADR: **B-097** (import report UI), **B-098** (notation-language
  detection), **B-099** (malformed-PGN fixture corpus).
- **Not decided here:** what the import UI looks like, and how a quarantined game is re-run after
  a parser improvement. Both are B-097.
