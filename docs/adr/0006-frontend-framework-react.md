# ADR-0006: Frontend framework — React 19

- **Status:** accepted
- **Date:** 2026-08-16
- **Deciders:** Owner (session 3)
- **Backlog link:** B-054

## Context

ADR-0001 chose Tauri 2 "with a TypeScript frontend" and stopped there. It never named a
framework, and neither did `docs/tech-stack.md`. That gap went unnoticed for two sessions
because no product code existed to expose it; the first component makes it unavoidable.

Frameworks are a hard-stop Decision Gate under `AGENTS.md`, so this was raised and decided
before any component was written.

Two workloads dominate the frontend, and they pull in different directions:

- **The board.** `chessground` is a vanilla-DOM library that takes ownership of an element and
  mutates it directly. Any virtual-DOM framework must be told to keep out of that subtree.
- **The game list.** 10,000 rows, sortable, with user-selectable columns (B-008) and filtered
  search under 200 ms (B-033). This needs virtualisation and is the genuinely hard widget.

**A note on what did *not* decide this.** The obvious argument — that a lighter runtime protects
the frame budget — was considered and set aside as unmeasured. B-048 recorded 17.0 ms median
*and* p95 with comfortable headroom while an engine ran. Nothing here is going to exhaust that
rendering a board and a table. Per risk 9 in the handover, this project has already been misled
once by a risk sized from reasoning rather than measurement, so a performance claim with no
benchmark behind it was not allowed to carry the decision.

## Options considered

1. **React 19** — largest ecosystem; TanStack Table/Virtual and `react-i18next` are the
   reference answers to exactly our two hard problems. Needs a ref wrapper for chessground.
2. **Svelte 5** — least ceremony, cleanest chessground fit, smallest code volume. Thinner
   ecosystem for virtualised tables; runes are comparatively new.
3. **Vanilla TS + Vite** — no framework risk at all, perfect chessground fit. Viable for a
   skeleton; by B-008 we would be writing a worse framework by accident.

## Decision

We chose **React 19**, with Vite 8 as the build tool.

## Rationale

The deciding argument is consistency with ADR-0003 rather than any property of React itself.
ADR-0003 committed this project to **buying the hard problems and building only the one with no
good off-the-shelf answer** — `pgn-reader` and `shakmaty` for import, `chessops` for rules,
`chessground` for the board, our own game tree because nothing suitable existed.

The virtualised, sortable, column-configurable 10,000-row table is the same category of hard
problem, and TanStack is the same category of answer. Choosing a framework where that library
is a first-class citizen applies the reasoning the project has already adopted.

Two supporting considerations, neither decisive alone. The repository is intended to go public
(B-031) and needs Windows and Linux testers who may become contributors (B-070); React maximises
the pool of people who can read the code without learning something first. And React's churn is
low — it is the boring option, which `AGENTS.md` explicitly prefers.

## Consequences

- **Positive:** B-008 and B-033 have off-the-shelf answers when we reach them. `react-i18next`
  gives B-072 a mature ICU-plural implementation rather than something hand-rolled. The largest
  hiring and contributor pool of the three.
- **Negative / tradeoffs:** the heaviest runtime of the options considered, in a project whose
  thesis is a lean local-first app. Every vanilla-DOM chess library — chessground now, possibly
  others later — needs an escape hatch. `StrictMode` double-invokes effects in development,
  which makes correct teardown mandatory rather than optional in that wrapper.
- **Mitigation, and it is the important part:** the chessground seam is confined to exactly one
  file, `src/features/board/useChessground.ts`. Its container div has no React children. If a
  component ever renders inside it, React and chessground will fight over the same nodes and the
  symptom — pieces vanishing on unrelated state changes — will look nothing like the cause.
- **Not yet taken:** TanStack Table and Virtual are *not* dependencies yet. The mock list has
  four rows. They arrive with B-008, when there is something to virtualise. Adding them now
  would be buying a solution before owning the problem.
- **Follow-ups:** B-008 (table), B-033 (measure the 10k case — with a control, per B-077),
  B-024 (design system, deliberately not started).
