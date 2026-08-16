# ADR-0003: Chess rules, PGN handling, and board rendering — buy, split by tier

- **Status:** accepted
- **Date:** 2026-08-16
- **Deciders:** Project owner
- **Backlog link:** B-005 (constrains B-007, B-009, B-042)

## Context

"PGN handling" is three separable jobs, and conflating them is why the library landscape looks
confusingly overlapping:

1. **Tokenizing** — read bytes, emit tags, SAN tokens, comments, NAGs, variation markers. No
   chess knowledge required.
2. **Legality validation and position tracking** — turn SAN into a legal move against a board.
3. **Game tree model** — a mutable tree of mainline plus variations with comments and NAGs
   attached. This is what an annotation editor needs.

The MVP needs 1 and 2. Annotation editing (B-015) and export (B-017) need 3.

ADR-0001 established a Rust backend and a TypeScript frontend, so there is also a *placement*
question: which side of the IPC boundary does each job live on?

## Options considered

1. **`pgn-reader` + `shakmaty`** (Rust) — jobs 1 and 2. Visitor/streaming reader, non-allocating,
   deliberately does not validate legality so the caller decides. Zobrist hashing built in.
2. **`chessops`** (TypeScript) — jobs 1–3, including a game tree, PGN writing, a DoS-resistant
   streaming parser, and parsing of eval/clock/shape comments.
3. **`sacrifice` / `rpgn`** (Rust) — job 3, game trees layered over shakmaty. Single maintainer,
   low adoption.
4. **Hand-written tokenizer** — rejected. Real-world PGN is far worse than the specification
   suggests, and the failure mode is silent data loss.

## Decision

**Buy jobs 1 and 2; build job 3. Split by location, not by preference.**

- **Rust (`pgn-reader` + `shakmaty`) owns import.** Bulk ingestion, header extraction, legality
  validation, Zobrist hashing for the future position index.
- **TypeScript (`chessops`) owns the open game.** Tree model, move legality feeding
  chessground's `movable.dests`, comment/eval/clock parsing, FEN and SAN in the UI.
- **`chessground`** renders the board.
- **No third-party Rust game tree.** `sacrifice` and `rpgn` are declined; if a Rust-side tree is
  needed for B-015/B-017, it is written in-project.

## Rationale

**On placement.** The IPC boundary is a physical boundary; each library belongs on the side
where its data already lives. PGN files are on disk, and in Tauri the filesystem is Rust-side —
streaming file bytes across IPC to parse them in a slower parser would be absurd at scale.
Conversely, once a game is open, every click needs legal destination squares; doing that in Rust
means an IPC round-trip on the critical path of a drag. chessops runs it synchronously beside
the board, and shares vocabulary with chessground because the same author wrote both to compose.

**On buy-vs-build.** Buy the hard parts (tokenizing, bitboards, legality, Zobrist); build the
easy part. A game tree over shakmaty is a few hundred lines and is the core domain model of a
chess database — the thing touched most often and most worth shaping in-project. Taking a
single-maintainer dependency for the piece that is best understood is the trade backwards.

**On why these libraries, given modest adoption.** shakmaty has ~42 reverse dependencies and
pgn-reader ~171k lifetime downloads. These are niche crates by general Rust standards. The
justification is not popularity and not primarily raw speed — at 10k games any competent parser
clears the 200 ms target and SQLite writes dominate import. It is **rules correctness**: chess
rules have a vicious long tail (en passant discovered pins, castling through attacked squares,
insufficient material, Chess960 castling encoding), and nine years of running Lichess's
tablebase server and opening explorer — where a rules bug returns a provably wrong answer that
someone notices — is a far better credential than download counts. Zobrist hashing being built
in is the second reason: it is exactly B-042's core primitive.

## Consequences

- **Positive:** B-009 becomes an integration rather than a build; B-042's core primitive already
  exists and is correct; import throughput is far beyond what the MVP needs, so B-040 is a
  feature rather than a rewrite; `shakmaty-syzygy` gives B-027 a path.
- **Negative / tradeoffs:**
  - **Two chess rule implementations must agree.** Mitigated by shared authorship and by the
    fact that they never arbitrate the same question — Rust validates at import, TypeScript
    during interaction — but it is a real cost and a real source of future confusion.
  - **Bus factor of one.** Niklas Fiekas maintains shakmaty, pgn-reader, chessops, chessground,
    and fishnet. Mitigated by all of it being GPL, open, and small (shakmaty ~10K SLoC,
    pgn-reader 1,442 lines) — forkable if it came to that.
  - **`pgn-reader` has a 0.x API that breaks roughly annually.** Pin versions; expect an upgrade
    chore each year (B-063). Its author describes maintenance as minimal, following shakmaty.
  - All of it is GPL-3.0-or-later — see ADR-0002.
- **Follow-ups:** B-049 (import fidelity policy — pgn-reader not validating legality by default
  is what makes accept/repair/reject a real choice), B-063 (dependency upgrade chore), B-064
  (keep the two rule implementations consistent).
