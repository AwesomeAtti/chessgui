# Tech Stack

> Stage 2. What we build on, and what we have actually verified rather than assumed.
> Decisions live in `docs/adr/`; this file records the stack and the evidence behind it.

## Chosen stack

| Layer | Choice | Source |
|---|---|---|
| Desktop shell | Tauri 2 | ADR-0001 |
| Frontend language | TypeScript (5.9, not 7 — see below) | ADR-0001 |
| Frontend framework | React 19 | ADR-0006 |
| Build tool | Vite 8 | notify-and-proceed, session 3 |
| Board rendering | `chessground` | ADR-0003 |
| Rules & move legality (frontend) | `chessops` | ADR-0003 |
| PGN parsing & bulk import (backend) | `pgn-reader` + `shakmaty` (Rust) | ADR-0003 |
| Game tree | Our own | ADR-0003 |
| Storage | SQLite | ADR-0004 |
| Data model | Players table, dual dates, JSON tag set | ADR-0005 |
| i18n | `i18next` + `react-i18next` | B-072 |
| Licence | GPL-3.0-or-later | ADR-0002 |

**TypeScript is pinned to 5.9, not the current 7.x.** TS 7 is the Go rewrite and is `latest`
on npm, but it is a rewritten compiler at `.0.2`, and its selling point is compile speed — which
is not a constraint on a project with four source files. Adopting it is a one-line change
whenever we want it; recovering from a compiler bug in a project with a bus factor of one is
not. Revisit once it has a few minor versions behind it.

## B-048 — webview under engine load

The spike that had to pass before anything was built on ADR-0001. Spec and pass criteria:
`docs/feature-specs/b048-webview-engine-spike.md`, written before the run.

**Verdict: pass. ADR-0001 stands.**

### Conditions

Apple Silicon MacBook Pro, mains power, built-in display at 60 Hz. Stockfish supplied locally,
4 threads, 256 MB hash, `go infinite` from the "Kiwipete" middlegame position. Emitter fixed at
10 Hz. Frame times sampled per `requestAnimationFrame` while the pointer was held down.

### Results

| Measure | Engine stopped | Engine running | Read |
|---|---|---|---|
| Frame time, median | 17.0 ms | 17.0 ms | vsync at 60 Hz, both states |
| Frame time, p95 | 17.0 ms | 17.0 ms | no tail |
| Frame time, max | 22.0 ms | 18.0 ms | *lower under load* — see below |
| Pointer-down latency | 1 ms | 1–5 ms | no perceptible input delay |
| Frontend events/sec | — | 10.0 | exactly the emitter rate |
| Dropped events | — | 0 | |
| Engine nodes/sec | — | 1.78 M | 4 threads |
| Depth reached | — | 30 | |
| Orphaned engine processes after quit | — | none | `pgrep -fl stockfish` returned nothing |

The max-frame column is the one worth reading twice: the worst frame was **better** with the
engine running than without it. Both figures are single-frame jitter around vsync, and the
inversion is the clearest possible evidence that engine load is not touching the render path.

### The premise was wrong, and that is the main finding

The spec assumed Stockfish floods stdout continuously and that per-line IPC events would melt
the webview. Measured, with MultiPV 1: **0–1 lines/sec** once the search is at depth. With
MultiPV 8, to force the issue: **~44 lines/sec peak in the first seconds, then back to 0–1.**

Stockfish only prints on a new depth or a new best move. The output profile is a **burst during
the shallow-depth phase, then near-silence** — not a sustained flood. The 100×+ decoupling ratio
the spec predicted never appeared; the observed peak ratio was about 4:1.

This does not retire the throttle (see below), but it does re-rank the risk. The dominant
concern in the handover was overstated.

### Measurement gotcha worth keeping

The first run measured a flat 33.0 ms median — a hard 30 fps — in *both* the Tauri app and
Safari. The cause was **macOS Low Power Mode set to "Always"**, which caps rendering to 30 fps
even on mains power. It also halved engine throughput (0.8 M vs 1.78 M nodes/sec).

Two lessons, both cheap to bank now and expensive to relearn:

1. **Always measure a control in a plain browser on the same machine.** Safari showing the
   identical 33 ms is what proved the cap was environmental rather than a Tauri defect. Without
   that control, this spike would have produced a false negative against ADR-0001.
2. **Record power state and Low Power Mode with any performance number.** A benchmark without
   them is not reproducible.

### Correction to the spec's threshold

The agreed criterion was "max frame under ~16.7 ms". That is unattainable by construction: at
60 Hz vsync a frame *is* 16.67 ms, so normal jitter puts the max at 17–18 ms regardless of load.
The honest test, and the one used above, is **median and p95 sitting at vsync, with no delta
between load states.** Future performance criteria should be written against median/p95 and a
comparison, never a max against an absolute.

### What this spike does not answer

- **Linux / WebKitGTK.** Not touched. macOS is WKWebView — same family, different and better
  optimised port. Remains open as **B-066**, blocked on hardware or a tester (B-070).
- **The realistic burst pattern.** The spike ran one long analysis. A real GUI restarts the
  search on every move, so the user clicking through a game triggers the *burst* phase over and
  over — which is precisely the phase that produces output. Untested, tracked as **B-076**.
- **Long-run memory stability.** The 10-minute observation was not completed.

## Backend → frontend streaming (B-067)

**Rule: high-frequency backend events are absorbed in Rust and emitted on a fixed timer. The
frontend never sees one event per source line.**

Validated by the spike and unchanged by the finding that the flood was smaller than feared —
the design costs almost nothing and removes an entire class of failure.

Three properties, in the order they matter:

1. **Parse at the source.** UCI text is parsed in Rust. The frontend receives structured state,
   never raw engine output to interpret.
2. **Keep latest state, not history.** Parsed results *overwrite* a single struct. Nothing
   accumulates, so memory is flat by construction rather than by cleanup. The spike's PV field
   is replaced on every update, never appended.
3. **Emit on a timer, not on arrival.** A separate thread emits at a fixed rate, fully decoupled
   from input rate. Measured at exactly 10.0 events/sec with zero drops while the source rate
   varied between 0 and 44 lines/sec.

Supporting detail: the reader thread blocks on `BufRead::lines`, which parks it between lines —
no polling, no busy-wait, and idle CPU is near zero without special handling.

**Process lifetime is part of the design, not an afterthought.** The spike sent `stop` then
`quit`, waited briefly for a polite exit, and killed the child if it outstayed the grace period,
wired to the app's exit event. Verified: no orphaned engine processes after quitting.

**Emitter rate:** 10 Hz is confirmed workable but not yet tuned; 4 Hz was not tested and may be
indistinguishable. Not worth deciding until there is a real analysis panel to judge it against.

**Generalise it.** This is the answer for any high-frequency backend→frontend stream, not just
engine output — import progress over a 10,000-game PGN is the next obvious case.

## Source layout (established at B-054)

Recorded here per AGENTS.md: state the layout, then don't rearrange it. Restructuring an
established layout is a hard stop.

```
/
├── index.html              vite entry
├── package.json            SPDX GPL-3.0-or-later (B-065)
├── scripts/
│   └── check-no-literals.mjs   CI guardrail for B-072 + the IPC boundary
├── src/                    React frontend
│   ├── main.tsx            root render; imports chessground stylesheets
│   ├── App.tsx             shell: tab state, kept deliberately thin (ADR-0007)
│   ├── features/           grouped by feature, not by file type
│   │   ├── board/          BoardView + useChessground (the vanilla-DOM escape hatch)
│   │   ├── game/           GameView, GameInfo, mainline.ts (PGN → a FEN per ply)
│   │   ├── library/        LibraryView — filter bar and full-width games table
│   │   ├── moves/          MoveList
│   │   └── shell/          TabBar (document tabs) + SidePanel (the fixed column)
│   ├── i18n/               message catalogue, typed keys, Intl formatters
│   ├── model/              the ADR-0005 data model
│   ├── mock/               placeholder data, deleted at B-007
│   └── shell/              ipc.ts + platform.ts — the only Tauri-aware code
└── src-tauri/              Rust side, standard Tauri 2 lib/bin split
    ├── Cargo.toml          SPDX GPL-3.0-or-later (B-065)
    ├── icons/icon.png      must exist or the build fails in a proc macro
    └── src/{main,lib}.rs
```

Three boundaries in that tree are load-bearing rather than tidy:

- **`src/shell/` is the only place `@tauri-apps/api` may be imported.** This is what keeps
  ADR-0001 reversible. Enforced in CI, not by memory.
- **`src/i18n/` owns every user-facing word** (B-072). Also enforced in CI.
- **`src/features/board/useChessground.ts` is the only React↔chessground seam.** chessground
  mutates its own DOM subtree; React must never reconcile it. The container div has no React
  children, deliberately.
- **`App.tsx` is the only component that knows the layout exists.** Everything below it
  receives data and size and never decides its own placement. This is what keeps ADR-0007
  reversible toward the simpler "option E" shell — the moment a component knows it lives in a
  tab, that reversibility is gone.

Two layout invariants that are easy to break silently:

- **The window is the viewport.** The shell is one screen tall, the document never scrolls, and
  panes scroll their own bodies. This depends on `min-height: 0` on *every* ancestor of a
  scrolling region — grid and flex children default to `min-height: auto` and refuse to shrink.
- **Fixed measure for text, fluid for graphics.** The side panel is a fixed 320px; the board
  and the table absorb all resize. This is why the board is sized by `ResizeObserver` rather
  than by CSS.

### The guardrail script earns its place

`npm run check:i18n` parses with the TypeScript compiler API rather than regexes. The first
version used regexes and immediately produced three false positives by reading `=>` and `<` as
JSX delimiters. Worth recording because the lesson generalises: **a guardrail that cries wolf
gets switched off**, which is worse than not having one. It was also verified with a negative
control — a deliberately planted literal, confirmed to fail the check — which is the B-077
habit applied to something other than a benchmark.

## Notes

- The spike itself was throwaway and built outside this repository. Only these findings survive.
- The UCI parser was written as a pure module with unit tests covering bound markers, mate
  scores, truncated lines, and `info string` noise. That shape — parsing isolated from
  transport — is worth carrying into the product even though the code is not.
