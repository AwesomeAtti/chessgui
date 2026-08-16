# Milestone M1: Skeleton

- **Status:** done — the app runs on macOS and the primary paths are verified
- **Target:** reached, session 3
- **Backlog item:** B-054

## Goal

The first product code in the repository. A Tauri window opens, shows a mock list of games,
and lets you open one onto a static board rendered from a hardcoded FEN. Nothing is imported,
nothing is stored, nothing is analysed.

**What can be demonstrated:** the app launches on macOS, both screens render, and you can
navigate between them. That is the entire bar.

## Why this milestone is not really about the screens

Two screens are a couple of days of work. M1 exists because three structural things are nearly
free to establish now and expensive to retrofit, and all three are invisible in the demo:

1. **The message catalogue (B-072).** No user-facing string literal appears in a component,
   ever, starting with the first one. English is the only locale that ships; the point is that
   adding a second is a translation job rather than a refactor.
2. **The single frontend IPC adapter.** Every call into the shell goes through `src/shell/ipc.ts`.
   This is the standing constraint that keeps ADR-0001 reversible — it stops being true the
   moment `@tauri-apps/api` is imported directly from a component.
3. **Portability guardrails (B-069).** Paths, keyboard shortcuts, and dialogs sit behind
   abstractions in `src/shell/platform.ts` from the start, because only macOS can currently be
   tested (B-068) and implicit macOS assumptions are what make the other two platforms
   unshippable a year from now.

If M1 ships the screens and skips these three, it has failed at the thing it was for.

## The screen model was wrong, and running it is what showed that

M1 was originally specified as "window, static board from FEN, mock game list, navigation" —
two screens with a back button between them. It was built that way, it launched, and the
first reaction on seeing it was that it *felt like a web page rather than a desktop app*.

That turned out to be a precise diagnosis, not a vague one. Three concrete symptoms:

- narrowing the window reflowed game-list rows into different heights
- the board ignored the space it was given and stayed a fixed size
- the game list and the board could never be seen at the same time

The third is the real one. **A chess database is a master–detail application**: the list of
games is permanent furniture, and selecting a row populates the board and move list beside
it. Replacing the whole screen on selection is a web navigation idiom, and it is wrong for
this product independently of how it looks.

Rebuilt as a single window: resizable library pane on the left, board and move list on the
right, the window as the viewport, and nothing scrolling except individual pane bodies.

**Two things worth taking from this.** First, `B-053` — the core workflows document, the last
outstanding Stage 1 deliverable — is described in the backlog as the thing that "feeds the
skeleton's screen list". It was skipped as not being on the critical path, and the skeleton
promptly got its screen list wrong. That is what skipping it looks like, and it is cheap to
recover from now only because there were four components to change.

Second, the error survived a design decision, a milestone document, and a code review, and
was caught in under a minute by *opening the window*. Worth remembering next time something
is deliberated instead of run.

### It then happened again, which is what produced the process change

The master–detail rebuild was rejected too. Layout is subjective, and guess-code-reject does
not converge — "I don't like it" is not a bug report and should not have to be.

So the loop was replaced: a survey of the category (`docs/ui-survey.md`), the workflows
document written at last (`docs/core-workflows.md`), then **four structural options mocked and
discussed before any code**, plus two refinement rounds against chess.com screenshots. The
outcome is **ADR-0007 — layout C+**, and it is the first layout in this project chosen rather
than guessed.

The rule is now in `AGENTS.md` and `ai/methodology.md`: **UI layout is mocked and approved
before it is coded.** B-088 backports it to the starter kit.

## Scope

| Backlog ID | Description | Status |
|-----------|-------------|--------|
| B-054 | Window, static board from FEN, mock game list, navigation | in-progress |
| B-065 | SPDX identifiers in `Cargo.toml` and `package.json` | in-progress |
| B-072 | i18n foundation — message catalogue, no literals in components | in-progress |
| B-069 | Portability guardrails behind abstractions | in-progress |
| B-046 | Three-OS CI build matrix | in-progress |
| B-058 | Player identity — separate table, name normalisation | decided (ADR-0005) |
| B-059 | Partial-date handling — raw string plus nullable parsed date | decided (ADR-0005) |
| B-060 | Full PGN tag set as JSON, `Result` as integer | decided (ADR-0005) |
| B-056 | FEN paste as a cheap board smoke test | stretch |

**B-058 – B-060 are decided here, not built here.** M1 has no database. What M1 commits to is
the *data model* — the shape the mock game list conforms to and that import will later fill in.
The migration itself lands at B-011. The trap being avoided is arriving at B-007 with a schema
nobody chose, assembled accidentally out of whatever the mock data happened to look like.

## Explicitly out of scope

Deferring these is the point, not an oversight:

- Any database, any migration, any persistence (B-011)
- PGN parsing or import of any kind (B-007) — the board FEN is hardcoded
- Move *navigation* and variations (B-009). A **static** move list is now in scope — the
  three-pane layout could not be judged with an empty placeholder box where the moves go.
  Clicking a move does nothing and the board does not follow.
- Search or filtering (B-010)
- Any engine, any Rust chess dependency (B-014). No `shakmaty`, no `pgn-reader` yet.
- Visual design (B-024) — colour palettes, board and piece theming, type scale, anything
  anyone would call a brand. **Layout and affordance are *not* deferred**, and the split is
  deliberate: layout is expensive to change later because every component encodes assumptions
  about who owns the viewport, whereas a palette is a find-and-replace. So panes, splitters,
  scroll containers, selection states and hit areas are in scope; how it looks is not.
- Packaging, signing, notarisation (B-032)

## Definition of done

**Verified by the owner on macOS, session 3 — the app runs.**

- [x] `npm run build` and `tsc --noEmit` pass clean
- [x] `cargo build` succeeds and the window opens on macOS, no errors
- [x] Library table renders from mock data typed against the ADR-0005 model
- [x] Board renders a position via `chessground`
- [x] Double-click opens a game in a new tab
- [x] ← and → step through the moves; the current move highlights in the list
- [x] Two tabs opened and closed correctly
- [x] The window resizes and the layout follows
- [x] The Info tab shows the game's additional detail
- [x] Zero user-facing string literals in components — enforced in CI
- [x] Zero direct `@tauri-apps/api` imports outside `src/shell/` — enforced in CI
- [x] SPDX `GPL-3.0-or-later` in both manifests
- [x] `handover.md` and `backlog.md` updated

**Untested — none blocking, all a couple of minutes next session:**

- [ ] The filter box narrows the table and the count updates
- [ ] Arrow keys move the library selection; Enter opens the highlighted game
- [ ] Home / End jump to the start and end of a game
- [ ] Clicking a move in the list jumps the board to it
- [ ] Switching between two open tabs preserves each game's position
- [ ] Accel+W closes the active tab, and the library tab has no close control
- [ ] The on-screen move buttons in the panel footer
- [ ] No document-level scrollbar at extreme window sizes — this is B-090's territory
- [ ] CI green on all three platforms — cannot pass until the first push

## Notes

- **The Tauri icon trap.** `src-tauri/icons/icon.png` must exist or the build fails inside a
  proc macro with an unhelpful error. This bit the B-048 spike; it is pre-empted here.
- **Board sizing is done in JavaScript, not CSS.** A `ResizeObserver` measures the pane and
  sets pixel dimensions. `aspect-ratio` with container queries would be more elegant, but
  this has to run in three webviews and WebKitGTK is still untested (B-066) — so the boring
  portable mechanism wins, per B-069. The size is floored to a multiple of 8 so every square
  gets the same whole number of pixels; without that the board looks subtly crooked.
- **The board is `viewOnly`.** Pieces cannot be dragged, deliberately: there is no game tree
  to record a move into, so a draggable board would let the user reach a position the
  application cannot describe or undo.
- **No performance claims in M1.** Per B-077, any future measurement needs a control and a
  recorded power state. M1 measures nothing.
- **TanStack Table/Virtual is deliberately not added yet.** The 10k-row problem is real
  (B-008, B-033) but the mock list has a handful of rows, and adding the dependency before
  there is a list worth virtualising is speculative. It arrives with B-008.
