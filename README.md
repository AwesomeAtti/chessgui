# chessgui

A modern, cross-platform chess database and chess GUI.

> **Search your games. Understand your chess.**

Build a personal chess library on your own machine: import games, search and organize them,
annotate positions and variations, and analyze with UCI-compatible engines — in an interface
that feels like it belongs on a modern desktop.

**Status:** early implementation. The app runs on macOS: pasted PGN imports, the library lists
the games, and you can open one and play through it. **Nothing persists across a restart yet** —
that is the next milestone but one. See [`docs/handover.md`](docs/handover.md) for exactly where
things stand, which is always more current than this file.

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

## Project documents

The repository is the source of truth — not a chat log and not anyone's memory. If you are
arriving cold, read the first two and stop when you have enough.

| Document | What it is |
|---|---|
| [`docs/handover.md`](docs/handover.md) | **Start here.** Where the project is right now, what was decided last, and what to do next. Rewritten every session |
| [`docs/product-vision.md`](docs/product-vision.md) | What we are building and why — audience, value, success criteria, non-goals |
| [`docs/backlog.md`](docs/backlog.md) | Append-only record of every item: planned, in progress, done, deferred, and **rejected with reasons** |
| [`docs/adr/`](docs/adr/) | Architecture Decision Records — the decisions that were expensive to reverse, with the options weighed |
| [`docs/tech-stack.md`](docs/tech-stack.md) | The stack, the source layout, the test harness, and the measurements behind each |
| [`docs/core-workflows.md`](docs/core-workflows.md) | The six journeys the interface has to serve, written before the interface was |
| [`docs/ui-survey.md`](docs/ui-survey.md) | How ChessBase, Scid vs. PC, Lichess, chess.com and En Croissant actually lay things out — and where they disagree |
| [`docs/feature-specs/`](docs/feature-specs/) | Per-feature specs, including [B-007 PGN import](docs/feature-specs/b007-pgn-import.md) |
| [`docs/milestones/`](docs/milestones/) | Milestone plans and their verification passes |
| [`AGENTS.md`](AGENTS.md) | Always-on rules for AI assistants working in this repo |
| [`ai/methodology.md`](ai/methodology.md) | How this project is developed — stages, decision gates, the habits that came from being wrong |
| [`ai/prompts/`](ai/prompts/) | Reusable session prompts: vision, kick-off, session-start, feature, decision |
| [`fixtures/README.md`](fixtures/README.md) | The shared PGN corpus both test suites read, and what each fixture is for |

## Planned MVP

The smallest thing worth shipping — get your games in, find them, look at them:

1. PGN import (file or paste) into a local database that survives restart
2. Sortable game list with the columns that matter
3. Search and filter on game headers
4. Board and move list — open a game, play through it, follow variations

Of these, **1 is partly built** (paste imports; file import and persistence are next) and **4 is
built for the mainline**. The MVP targets a personal database of around 10,000 games. Engine
analysis, annotation editing, online imports, and position search come after — as does a separate
reference database of master games for opening search and win/draw/loss statistics.

## Running it

Requires **Node 22** and **Rust 1.95** or newer. The Rust floor is set by the dependency
graph rather than by this code — `pgn-reader` requires 1.88 and the `shakmaty` it pulls in
requires 1.95.

```sh
npm install
npm run tauri dev        # the app
```

Checks, all of which CI runs on macOS, Ubuntu and Windows:

```sh
npm run typecheck                              # tsc --noEmit
npm test                                       # vitest — the PGN walker, import rules, catalogue
npm run check:i18n                             # no user-facing literals; IPC boundary intact
cargo test --manifest-path src-tauri/Cargo.toml # the importer, and the shared fixture corpus
```

`npm run check:i18n` is a real gate rather than decoration: it fails the build on a user-facing
string literal in a component, or a `@tauri-apps/api` import outside `src/shell/`.

## Repository layout

| Path | Purpose |
|------|---------|
| `src/` | React frontend. Grouped by feature, with four load-bearing boundaries — see `docs/tech-stack.md` |
| `src/shell/` | **The only place `@tauri-apps/api` may be imported.** What keeps the frontend portable |
| `src/i18n/` | Every user-facing word, with typed keys so a misspelt one is a compile error |
| `src-tauri/` | The Rust side: the Tauri shell and `src/import/`, the PGN importer |
| `fixtures/` | The PGN corpus shared by both test suites — at the root because neither language owns it |
| `scripts/` | Guardrails and instruments: the i18n check, the PGN survey tool |
| `docs/`, `ai/`, `AGENTS.md` | See *Project documents* above |

## How this project is developed

Decisions, current state, and open questions live in `docs/`. Read `docs/handover.md` to find out
where things stand; read `ai/methodology.md` to understand the process.

Decisions that are expensive to reverse — framework, storage, platform commitments — are **hard
stops**: written up with options and tradeoffs, approved explicitly, and recorded as an ADR before
any code depends on them. Anything that decides screen structure is **mocked and approved before it
is coded**, because layout is subjective and the build-dislike-rebuild loop does not converge.

Two habits are worth knowing about, because they explain a lot of the documents above. **Claims get
measured rather than argued** — a stated frequency, a performance number or a dependency's behaviour
is a measurement claim even when it is phrased as a design assumption, and this project has had to
retract nine plausible explanations that turned out to be wrong. And **findings are written down
where the next person will trip over them**, which is why the backlog keeps rejected items and the
ADRs keep the reasoning that was superseded.

## Decisions made

Recorded as ADRs in [`docs/adr/`](docs/adr/):

| Decision | Choice | ADR |
|---|---|---|
| UI framework / desktop shell | Tauri 2 with a TypeScript frontend | [ADR-0001](docs/adr/0001-ui-framework-tauri.md) |
| Licence | GPL-3.0-or-later | [ADR-0002](docs/adr/0002-licence-gpl3.md) |
| Chess rules, PGN handling, board | `pgn-reader` (Rust, import) · `chessops` (TS, open game) · `chessground` (board) | [ADR-0003](docs/adr/0003-chess-libraries.md) |
| Local storage | SQLite | [ADR-0004](docs/adr/0004-storage-sqlite.md) |
| Game data model | Players table · raw + parsed dates · full tag set retained | [ADR-0005](docs/adr/0005-game-data-model.md) |
| Frontend framework | React 19 with Vite | [ADR-0006](docs/adr/0006-frontend-framework-react.md) |
| Application layout | Pinned library tab · fluid board · fixed side panel | [ADR-0007](docs/adr/0007-application-layout.md) |
| PGN import fidelity | Tiered per game, warnings derived — **superseded by ADR-0009** | [ADR-0008](docs/adr/0008-pgn-import-fidelity.md) *(superseded; kept for the reasoning)* |
| **PGN import — the live policy** | **Strict: a game imports or it errors. The libraries are the validator and we add nothing** | [ADR-0009](docs/adr/0009-strict-pgn-import.md) |

## Decisions pending

Nothing blocks implementation. Open questions live in [`docs/backlog.md`](docs/backlog.md):

- **B-006** — engine process management and UCI transport
- **B-051** — bundle an engine, or require the user to supply one
- **B-031** — when the repository goes public
- **B-112** — whether chess streamers are an audience this product serves
- **B-116** — whether import should carry on past a game the parser refuses

## Licence

GPL-3.0-or-later. The chess libraries this project builds on — `shakmaty`, `pgn-reader`,
`chessops`, and `chessground` — are all GPL-3.0-or-later, as is Stockfish. See
[ADR-0002](docs/adr/0002-licence-gpl3.md) for the reasoning.

## Contributing

Not open to contributions yet. The intent is to open-source this for the chess community once
it is genuinely usable; contribution guidelines will land then.
