# ADR-0001: UI framework and desktop shell — Tauri 2

- **Status:** accepted
- **Date:** 2026-08-16
- **Deciders:** Project owner
- **Backlog link:** B-003

## Context

chessgui must run on Windows, macOS, and Linux from one codebase, present a genuinely modern
interface (the vision's central differentiator), render an interactive chessboard smoothly
while a UCI engine floods stdout, and later support a read-mostly reference database of
millions of master games with a position index.

The framework choice determines language, library ecosystem, storage options, packaging, and
the performance ceiling. It touches every file and cannot be walked back cheaply. It is the
first hard-stop gate and everything else is downstream of it.

A reframing that shaped the decision: this gate contains two nested choices of very different
reversibility.

1. **Web-tech UI vs. natively-drawn UI** — genuinely irreversible.
2. **Which web-tech shell (Electron vs. Tauri)** — much cheaper than it appears, because both
   render the same frontend. With shell calls confined to a single IPC adapter module, the
   switch cost is a backend, not a rewrite.

The hard stop is really the first. The second is closer to notify-and-proceed.

## Options considered

1. **Electron** (industry standard) — bundles Chromium and Node. Mature signing,
   notarisation, and auto-update tooling; identical rendering on all three platforms; one
   language end to end.
2. **Avalonia** (simplest alternative) — C#/.NET, draws its own UI with Skia. One language,
   one runtime, no IPC boundary, no webview.
3. **Tauri 2** — Rust backend, web frontend, OS-native webview.

## Decision

We chose **Tauri 2**, with a TypeScript frontend.

## Rationale

The project has two hard technical problems, and Tauri is the only candidate with a
best-in-class off-the-shelf answer to both:

| Problem | Answer |
|---|---|
| Fast, attractive, interactive board (B-009, B-024) | **chessground** — Lichess's production board component |
| Millions of games parsed and position-indexed (B-040, B-042) | **shakmaty** + **pgn-reader** — the stack behind lila-openingexplorer |

This is *industry standards first* applied literally: building on the libraries that run
Lichess's service tier rather than assembling equivalents.

Secondary reasons: a web frontend makes CSS and design tokens available, which is the cheapest
place to actually deliver B-024; Rust makes the 200 ms search target trivial and the position
index tractable; bundle sizes land under ~10 MB against Electron's 50–150 MB.

Avalonia was rejected because there is no chessground equivalent for .NET — the board, its
drag-and-drop, animations, arrows, and premoves would all be hand-written, and the board is the
product's face. Electron was rejected on the reference database: bulk-parsing millions of games
in JavaScript is roughly an order of magnitude slower, which turns B-040 into a rewrite.

The project owner has prior production experience with Tauri, which materially lowers the
learning-curve risk that would otherwise weigh against a two-language stack.

## Consequences

- **Positive:** best available chess libraries on both sides of the IPC boundary; the reference
  database becomes a feature rather than a rewrite; small binaries and low memory; CSS-based
  design system; Rust's compiler front-loads correctness work.
- **Negative / tradeoffs:** two languages for a solo developer. The Linux webview is WebKitGTK,
  not Chromium — rendering and CSS-support divergence is the concrete risk, and Linux is where
  "cross-platform is real" is most likely to quietly stop being true. Tauri is reportedly
  working toward a Chromium-based Linux webview; treat that as upside, not as a plan.
  Signing and notarisation tooling is younger than Electron's.
- **Escape hatch:** all shell/IPC calls are confined to a single frontend adapter module, so
  the frontend stays portable to Electron if the Linux webview proves unworkable. Preserving
  this property is a standing constraint, not a one-off.
- **Follow-ups:** B-048 (spike: chessground interaction under engine stdout load on
  WebKitGTK — the one result that could invalidate this), B-046 (three-OS CI), B-032
  (packaging and signing), B-055 (`tech-stack.md` and `architecture.md`).
