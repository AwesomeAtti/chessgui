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

## Decisions made

Recorded as ADRs in [`docs/adr/`](docs/adr/):

| Decision | Choice | ADR |
|---|---|---|
| UI framework / desktop shell | Tauri 2 with a TypeScript frontend | [ADR-0001](docs/adr/0001-ui-framework-tauri.md) |
| Licence | GPL-3.0-or-later | [ADR-0002](docs/adr/0002-licence-gpl3.md) |
| Chess rules, PGN handling, board | `shakmaty` + `pgn-reader` (Rust, import) · `chessops` (TS, open game) · `chessground` (board) | [ADR-0003](docs/adr/0003-chess-libraries.md) |
| Local storage | SQLite | [ADR-0004](docs/adr/0004-storage-sqlite.md) |
| Game data model | Players table · raw + parsed dates · full tag set as JSON | [ADR-0005](docs/adr/0005-game-data-model.md) |
| Frontend framework | React 19 with Vite | [ADR-0006](docs/adr/0006-frontend-framework-react.md) |
| Application layout | Pinned library tab · fluid board · fixed side panel | [ADR-0007](docs/adr/0007-application-layout.md) |
| PGN import fidelity | Tiered per game, never per file · nothing discarded · warnings derived | [ADR-0008](docs/adr/0008-pgn-import-fidelity.md) *(proposed)* |

## Decisions pending

No gate blocks implementation. Remaining open questions, see `docs/backlog.md`:

- **B-049** — PGN import fidelity: accept, repair, or reject malformed input
- **B-006** — engine process management and UCI transport
- **B-051** — bundle an engine, or require the user to supply one
- **B-031** — when the repository goes public

## Licence

GPL-3.0-or-later. The chess libraries this project builds on — `shakmaty`, `pgn-reader`,
`chessops`, and `chessground` — are all GPL-3.0-or-later, as is Stockfish. See
[ADR-0002](docs/adr/0002-licence-gpl3.md) for the reasoning.

## Contributing

Not open to contributions yet. The intent is to open-source this for the chess community once
it is genuinely usable; contribution guidelines will land then.
