# Product Vision

> Stage 0 — Idea validation. Approved. See `ai/methodology.md` for stage definitions.

**Search your games. Understand your chess.**

A modern, cross-platform chess database and chess GUI for players who want to search,
organize, annotate, and analyze their games — without the complexity, clutter, or dated
experience of traditional chess software.

## 1. Problem

Serious chess study happens on the desktop, but desktop chess software hasn't kept up. The
established tools are powerful and genuinely capable — and also cluttered, dated,
Windows-centric, and steep enough that most players use a fraction of what they own. The
lightweight alternatives are the mirror image: clean but thin, with weak database and search
capability.

Meanwhile the player's games are scattered across online platforms and loose PGN files, in
accounts they don't control. There is no good place to build a personal chess library you own,
and no modern tool that makes searching and understanding it pleasant.

## 2. Target users

- **Primary:** the improving club/tournament player who studies seriously — reviews their own
  games, keeps opening notes, wants their history in one place. Comfortable with computers;
  not interested in configuring one.
- **Secondary:** coaches and analysts managing collections across students or opponents.
- **Also served:** players on macOS and Linux, for whom the incumbents range from awkward to
  unavailable.

Built first for the author's own study; intended to be open-sourced for the wider chess
community once it is genuinely usable.

## 3. Value proposition

- **Your games, your machine.** Local database, open formats, no account required.
- **Search that answers real questions** — "my Sicilians as Black that I lost," not just a
  filename.
- **Modern by design, not just by stack.** Coherent design system, sensible defaults,
  responsive interaction, low visual noise, intuitive information architecture.
- **Engine analysis without engine administration.** UCI engines configured, run, and
  interpreted through an approachable interface.
- **Consistent across Windows, macOS, and Linux** — one product, three platforms,
  native-feeling on each.

## 4. MVP sketch

The smallest thing worth shipping: **get your games in, find them, look at them.**

1. Import PGN — file or paste — into a local database that survives restart.
2. Game list: sortable, with the columns that matter (players, event, date, result, ECO).
3. Search and filter on game headers.
4. Board + move list: open a game, play through it, follow variations.

Explicitly **not** in the MVP: engine analysis, annotation editing, Chess.com/Lichess import,
position search. Each is a natural next milestone; none is needed to prove the core.

## 5. Success criteria

| Signal | Observable test |
|---|---|
| Replaces existing habit | The author imports a real game history and uses this instead of their current tool for a full month |
| Import is trustworthy | A 10,000-game PGN imports with zero data loss and no crash; round-trips back to PGN cleanly |
| Search is fast enough to think with | Filtered results on a 10k-game database in under 200 ms — fast enough to explore, not to query |
| Approachable | A chess-literate person who has never seen it imports a PGN and finds a specific game with no instructions |
| Feels current | Side-by-side with an incumbent, the interface reads as contemporary; first run presents no configuration wall |
| Cross-platform is real | The same build ships and runs on all three OSes from day one, not "Linux later" |

## 6. Non-goals

- **Not a chess engine.** We integrate UCI engines; we do not write one.
- **Not an online chess platform.** No play-vs-humans, lobbies, ratings, or social features.
- **Not cloud-first.** No account, no sync, no server in v1. Local-first is the point.
- **Not mobile or web.** Desktop only: Windows, macOS, Linux.
- **Not feature parity with the incumbents.** Deliberately smaller. Clarity is the product.
- **Not a training / spaced-repetition app.** Adjacent, and a different product.

## 7. Scale target *(decided)*

Two distinct workloads, and conflating them is the trap:

| | **Personal database** (MVP) | **Reference database** (post-MVP) |
|---|---|---|
| Size | ~10,000 games | Millions (master games) |
| Access | Read **and** write — import, edit, annotate, delete | Read-mostly, bulk-loaded, rarely edited |
| Queries | Header search and filter | Position lookup, aggregate W/D/L statistics |
| Needs a position index | No | Yes — it is the whole point |

**The MVP designs for the left-hand column only.** At 10k games, header search is
straightforward and almost any embedded store will meet the 200 ms target; designing the MVP
as though it must scale to millions would be premature complexity.

**But the right-hand column must not be designed out.** The storage decision (B-004) is
therefore judged on one extra criterion beyond MVP fit: *does it leave room for a separate,
read-mostly, position-indexed reference database later?* Treating these as two stores with
different shapes — rather than forcing one store to do both — is the working assumption, to be
confirmed at the gate.

## 8. Open questions

1. **Where does annotation sit?** Read-only-first is much simpler, but a database you cannot
   write notes into may not displace anything.
2. **Import fidelity vs. speed** — how much malformed real-world PGN do we accept, repair, or
   reject?
3. **Do we bundle an engine** (e.g. Stockfish) or require the user to supply one? Bundling
   helps first run enormously and drags in licensing, binary size, signing, and per-platform
   builds.
4. **Where does the reference data come from?** A masters database needs a source with
   licensing that permits redistribution — and shipping millions of games is a very different
   download than shipping an application.
5. **Open-source timing** — public from the first commit, or once it is usable? The repository
   is hosted on GitHub either way.

## Decision Gates triggered early

Hard stops per `ai/methodology.md`. Each needs the six-part decision format and explicit
approval before work proceeds; each becomes an ADR once decided.

| Gate | Why it is expensive to reverse | Backlog |
|---|---|---|
| UI framework / desktop shell | Determines language, ecosystem, performance ceiling, and whether "modern" and "native-feeling" can both be true. Touches every file. | B-003 |
| Local storage / database engine | Migrating a user's database later is a data-safety problem, not a refactor. Judged on MVP fit at 10k games **and** on leaving room for a separate reference database. | B-004 |
| Chess rules & PGN handling: library vs. own implementation | Buy-vs-build at the core of the domain. Follows from the framework choice. | B-005 |
| Engine process management & UCI transport | Becomes a platform-surface commitment if an engine binary is bundled: signing, notarisation, sandboxing, per-OS builds. | B-006 |

**No auth or infrastructure gate.** Local-first avoids both — a real architectural saving
worth protecting deliberately.

## Biggest risk to resolve first

**The framework choice**, and specifically whether one codebase can deliver a genuinely modern
UI on all three desktop platforms without becoming a compromise on each. Everything else is
downstream of it: language, libraries, storage options, packaging, performance ceiling. It is
also the choice that cannot be walked back.

Its close second, worth resolving in the same breath: **can the chosen stack render and
interact with a chessboard smoothly while an engine floods stdout?** A small spike answers
this before any commitment is made.
