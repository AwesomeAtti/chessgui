# Feature Spec: B-048 — Webview + engine-load spike

- **Backlog ID:** B-048
- **Status:** draft
- **Owner:** Project owner

## Goal

Prove — or disprove — that a Tauri 2 webview can render and interact with a chessboard smoothly
while a UCI engine floods stdout. This is the one result that could invalidate ADR-0001, and it
should be known before any product code depends on the choice.

Throwaway by design. The code is deleted afterwards; only the findings and the throttling
design survive, into `docs/tech-stack.md` (B-055).

## What this spike actually tests, given no Linux access

The original risk was stated as *WebKitGTK on Linux*. With macOS-only hardware, this spike
**cannot close that risk**, and the plan should not pretend otherwise. What it can do:

**Genuinely answered on macOS**

- Whether the *throttling architecture* works — see below. This is the dominant risk and is
  almost entirely webview-independent.
- chessground integration, drag interaction, and move legality via chessops.
- Stockfish subprocess spawn, stdin/stdout plumbing, and clean shutdown from Rust.
- Tauri IPC event throughput and coalescing behaviour.

**Partially answered**

- macOS uses **WKWebView**, which is WebKit — the same engine family as WebKitGTK, a different
  and considerably better-optimised port. A macOS pass is therefore weak evidence for Linux
  rather than none, and a macOS *failure* would be strong evidence of a real problem.

**Not answered at all**

- WebKitGTK's specific frame pacing and compositing performance.
- Linux CSS feature divergence.
- Wayland vs. X11 behaviour.

These stay open as **B-066**. Linux remains a target (B-068) — it simply cannot be *verified*
yet, which is a testing constraint rather than a change of direction. Three-OS CI (B-046) keeps
it compiling in the meantime, so what's deferred is confirmation, not support.

## The reframe that matters

The instinctive worry is that chessground will be too slow to render under load. That is
probably the wrong worry.

Stockfish at depth emits many `info depth … pv …` lines per second. The failure mode is not
board rendering — it is **each stdout line becoming a Tauri event, becoming a frontend state
update, becoming a re-render.** That will melt any webview, Chromium included. Switching to
Electron would not fix it.

So the correct architecture is to absorb the flood in Rust: parse UCI there, keep only the
latest analysis state, and emit to the frontend on a fixed timer rather than per line.

That means the spike's real job is to **validate the throttling design**, which is
webview-independent — and it means the Linux gap, while real, is less threatening to ADR-0001
than the handover currently implies.

## MVP definition

The smallest thing that answers the question:

- A Tauri 2 app, single window, no router, no database, no persistence.
- chessground rendering the starting position; pieces draggable; legal moves enforced by
  chessops.
- A Rust command that spawns Stockfish, sends `go infinite`, and reads stdout on a dedicated
  thread.
- UCI parsing in Rust. Latest depth / eval / PV held in shared state.
- A **fixed-rate emitter** (start at 10 Hz) pushing that state to the frontend, decoupled from
  stdout arrival rate.
- A visible readout: current depth, eval, PV, plus measured engine lines/sec and emitted
  events/sec so the ratio is observable.

**Out of scope:** any persistence, any game list, PGN anything, multi-game handling, engine
configuration UI, pretty styling, error recovery, packaging.

## Acceptance criteria — agreed before running

Pass requires **all** of the following, measured while Stockfish runs `go infinite` on a
middlegame position with at least 4 threads:

- [ ] Dragging a piece stays visually smooth — no perceptible stutter, judged by feel and
      confirmed by frame timing staying under ~16 ms for the drag duration.
- [ ] Input latency from mouse-down to piece following the cursor is not noticeably worse with
      the engine running than with it stopped.
- [ ] Frontend event rate stays at the emitter's fixed rate regardless of engine output rate —
      i.e. the throttle actually decouples them. Engine lines/sec may be 100×+ the event rate.
- [ ] Idle CPU with the engine stopped is near zero. No busy-wait in the reader thread.
- [ ] Killing the app terminates the Stockfish process. No orphans in `ps`.
- [ ] Memory is stable over a 10-minute continuous run — no growth from accumulated events or
      unbounded PV history.

**Fail on any of these, and the response is diagnosis before reversal:** determine whether the
cause is the webview or the IPC/throttling design. Only a failure that survives a correctly
throttled backend is evidence against ADR-0001. A failure caused by unthrottled events is a
spike bug and proves nothing about Tauri.

**Explicitly not a pass criterion:** anything about Linux. Recorded as B-066.

## Risks & dependencies

- **Risks:**
  - Measuring "feels smooth" subjectively and calling it a pass. Mitigated by the frame-timing
    number and by writing the thresholds down *before* running, which is the point of this
    section existing.
  - Spike code leaking into the product. It is throwaway; the design notes are the deliverable.
  - Concluding too much from a macOS-only result — the central risk of this whole plan.
- **Dependencies:** ADR-0001 (Tauri), ADR-0003 (chessground, chessops). A local Stockfish
  binary, supplied manually — bundling is B-051 and is not decided here. Rust toolchain and
  Node.

## Future enhancements

- **B-066** — repeat on Linux/WebKitGTK once hardware, a VM, or a borrowed machine exists. This
  is the actual close-out of the original risk.
- Tune the emitter rate. 10 Hz is a guess; the spike may show 4 Hz is indistinguishable and
  cheaper, or that 20 Hz is affordable.
- Multi-PV output, which multiplies the line rate and re-tests the throttle.
- Carry the throttling design into `docs/architecture.md` — it is a general answer for any
  high-frequency backend-to-frontend stream, not just engine output.
