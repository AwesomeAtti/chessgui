# ADR-0002: Project licence — GPL-3.0-or-later

- **Status:** accepted
- **Date:** 2026-08-16
- **Deciders:** Project owner
- **Backlog link:** B-052 (also constrains B-031, B-051)

## Context

The chess libraries selected in ADR-0003 — `shakmaty`, `pgn-reader`, `chessops`, and
`chessground` — are all licensed **GPL-3.0-or-later**. Stockfish is GPL-3.0 as well, which
matters if an engine is ever bundled (B-051).

Linking GPL-licensed libraries into a distributed application requires that application to be
distributed under GPL-compatible terms. There is no configuration of the recommended stack that
avoids this.

The timing matters more than the choice. Today the project has two commits, no dependencies,
and a single copyright holder — the decision is free. Once the first GPL crate is added the
choice is effectively made by accident, and once outside contributors hold copyright on parts
of the code, relicensing requires locating and obtaining permission from every one of them.
This is the cheapest it will ever be to decide deliberately.

The vision already states the intent to open-source the project for the chess community once
it is genuinely usable, so the constraint aligns with the stated direction rather than fighting
it.

## Options considered

1. **GPL-3.0-or-later** — keeps the entire recommended stack. Same licence family as Lichess.
2. **Permissive (MIT / Apache-2.0)** — requires replacing the whole chess stack. No shakmaty,
   no pgn-reader, no chessops, no chessground. The board component and rules layer become
   hand-written, and ADR-0001 reopens, since the chessground/shakmaty argument was most of why
   Tauri won.
3. **Retain a closed-source / commercial option** — same practical consequence as permissive,
   plus a private repository. Materially more work for a product the vision describes as built
   first for the author's own study.

## Decision

We chose **GPL-3.0-or-later**.

## Rationale

It is the only option that preserves the technical decisions in ADR-0001 and ADR-0003, and it
matches the project's already-stated intent to open-source. The alternatives buy licensing
freedom the project has no stated use for, at the cost of hand-writing the two hardest
components in the product.

Deciding it now rather than at the B-004 gate removes the risk of it being settled implicitly
by the first `cargo add`.

## Consequences

- **Positive:** the recommended stack is usable as-is; bundling Stockfish later raises no new
  licensing question (B-051 reduces to binary size, signing, and per-platform builds); places
  the project in the same licence family as the wider open-source chess ecosystem, which is
  where its likely contributors already are.
- **Negative / tradeoffs:** no closed-source or proprietary-licensed release is possible, ever.
  Anyone distributing a modified build must publish their source. Relicensing after
  contributors arrive is effectively impossible — this is a one-way door and is being walked
  through knowingly.
- **Follow-ups:** add a `COPYING` file with the full GPL-3.0 text and an SPDX identifier in
  `Cargo.toml` / `package.json` before the first dependency lands (B-057); B-031 (open-source
  readiness — CONTRIBUTING, issue templates); B-051 (bundle-engine decision, now unblocked on
  licensing grounds).
