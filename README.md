# chessgui

A modern, cross-platform chess database and chess GUI.

> **Search your games. Understand your chess.**

Build a personal chess library on your own machine: import games, search and organize them,
annotate positions and variations, and analyze with UCI-compatible engines — in an interface
that feels like it belongs on a modern desktop.

**Status:** pre-implementation. Stage 0 (idea validation) is complete; no code yet. The
technology stack is deliberately undecided — see *Decisions pending* below.

## What it is

- A **chess database** — your games, stored locally, in open formats, searchable.
- A **chess GUI** — the interface through which you drive engines and read their analysis.
- **Cross-platform** — Windows, macOS, and Linux, from one codebase.
- **Local-first** — no account, no server, no sync. Your data stays yours.

## What it is not

- Not a chess engine. It runs UCI engines; it does not implement one.
- Not an online chess platform — no play-vs-humans, ratings, or social features.
- Not mobile or web.

Full reasoning, target users, and success criteria: [`docs/product-vision.md`](docs/product-vision.md).

## Planned MVP

The smallest thing worth shipping — get your games in, find them, look at them:

1. PGN import (file or paste) into a local database that survives restart
2. Sortable game list with the columns that matter
3. Search and filter on game headers
4. Board and move list — open a game, play through it, follow variations

The MVP targets a personal database of around 10,000 games. Engine analysis, annotation
editing, online imports, and position search come after — as does a separate reference
database of master games for opening search and win/draw/loss statistics.

## Running it

Nothing to run yet. This section gets filled in once the stack is chosen and a skeleton app
exists.

## Repository layout

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Always-on rules for AI assistants working in this repo |
| `ai/methodology.md` | How this project is developed — stages, decision gates, discipline |
| `ai/prompts/` | Reusable session prompts: vision, kick-off, session-start, feature, decision |
| `docs/product-vision.md` | What we're building and why |
| `docs/handover.md` | Current state. Read this first; updated every session |
| `docs/backlog.md` | Append-only record of all work — planned, done, deferred, rejected |
| `docs/adr/` | Architecture Decision Records |
| `docs/feature-specs/`, `docs/milestones/` | Per-feature specs and milestone plans |

Source code will live alongside these, in whatever layout the chosen platform conventionally
uses. That layout gets recorded in `docs/tech-stack.md` when it exists.

## How this project is developed

The repository is the source of truth, not any chat log or anyone's memory. Decisions,
current state, and open questions live in `docs/`. Read `docs/handover.md` to find out where
things stand; read `ai/methodology.md` to understand the process.

Decisions that are expensive to reverse — framework, storage, platform commitments — are
**hard stops**: they are written up with options and tradeoffs, approved explicitly, and
recorded as an ADR before any code depends on them.

## Decisions pending

Four hard-stop gates block implementation. See `docs/backlog.md` (B-003 – B-006):

- UI framework / desktop shell
- Local storage / database engine
- Chess rules & PGN handling — library vs. own implementation
- Engine process management and UCI transport

## Contributing

Not open to contributions yet. The intent is to open-source this for the chess community once
it is genuinely usable; licence and contribution guidelines will land then.
