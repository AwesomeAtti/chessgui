# ADR-0007: Application layout — pinned library tab, board plus fixed side panel

- **Status:** accepted
- **Date:** 2026-08-16
- **Deciders:** Owner (session 3)
- **Backlog link:** B-087, and B-084 before it

## Context

Two layouts were coded and both were rejected inside one session. That is what this ADR is
really a response to.

The first was two screens with navigation between them; it "felt like a web page, not a
desktop app". The second was master–detail, which was asserted — by the AI, confidently and
without checking — to be what applications in this category do. `docs/ui-survey.md` does not
support that claim: no dedicated chess database uses it.

Three inputs then replaced guessing:

**The survey.** Every mature product in the category makes layout user-configurable. ChessBase
ships predefined plus savable custom layouts with rearrangeable panes; Scid vs. PC has five
layout slots. Lichess is fixed, and that is its most-complained-about trait. **Layout here is
genuinely subjective and workflow-dependent** — two rejections is the expected outcome of
seeking one right answer to a question the industry treats as a setting.

**The workflows** (`docs/core-workflows.md`). Three of the six make conflicting demands:
W2 and W5 want the game list prominent and wide; W3 wants the board dominant and uncluttered;
W4 needs several games open at once. No single fixed arrangement serves all three.

**Chess.com's pattern**, from screenshots the owner supplied: a fluid board and a fixed-width
right panel whose contents swap by context, with the panel built as a fixed header, a
scrolling body and a fixed footer.

## Options considered

1. **Master–detail** — list permanently left, board right. Gives the board the least space of
   any option, and the survey found nothing in the category doing it.
2. **Two contexts (ChessBase)** — separate database and board windows. Most board space; costs
   a mode switch.
3. **Tabbed documents (Scid)** — library and games as tabs in one window.
4. **Board-dominant** — maximum board, everything else behind an icon rail.
5. **Option E — one board, library inside the side panel.** Simplest model; rejected because a
   320px panel cannot show a filterable multi-column table, which is W5.

## Decision

**Option 3, refined — "C+".**

- A **pinned library tab** that cannot be closed, plus zero or more **game tabs**.
- **The library tab is a single full-width region.** The games table owns the whole window.
  Single-click selects, Enter or double-click opens the game in a tab.
- **A game tab is a fluid board plus a fixed-width right panel** (320px). The panel never moves
  or changes width; only its contents do.
- The panel is **three parts** — a header holding a segmented control, a scrolling body, and
  an optional fixed footer for actions that must never scroll away.
- **Two tab strips, deliberately different.** Document tabs read as browser tabs, closable and
  titled by game. Panel tabs are a segmented control. Two strips that look alike is confusing
  in a way that is easy to feel and hard to name.

**The state is a list, and that is load-bearing.** `openGames` is an array with a per-entry
ply. Option E is this shell with the array capped at one, so the simpler layout stays reachable
as a shell change rather than a rewrite. That optionality cost one array instead of one id.

## Rationale

C+ is the only option that serves all three conflicting workflow demands: the library tab owns
the full window (W5, W2), game tabs give the board the space (W3), and tabs allow several games
at once (W4).

The fixed panel comes from a principle rather than imitation: **fixed measure for text, fluid
for graphics.** A move list has an optimal reading width and gains nothing from stretching; a
board gains from every pixel. So the panel holds still and the board absorbs the resize.

### The library panel was built twice and removed twice

Worth recording, because the reasoning generalises and because the first version came straight
out of the survey.

**A preview board first.** ChessBase's database window has one, and it was introduced to soften
W2's scan-and-reject loop. But every game starts from the same position, so a preview of the
*starting* position is identical for every row and carries no information. Making it useful
would mean the final position or a scrubber — a small game view, not a preview.

**Then a details panel.** Better, but it showed the opponent, event, date and result that the
table's own columns already show, and it charged a fifth of the window's width for the
duplication — in the one view whose whole job is reading many games at once (W5).

So the library tab has **no panel at all**. The table is the artefact in that view, and
everything placed beside it was competing with it.

Two lessons: **borrowing a pattern from a survey is not the same as borrowing the reason it
works** — ChessBase's preview earns its place in a product where you can scrub it, ours could
not — and **consistency of geometry is worth less than giving each view what it actually
needs.** The original decision made a virtue of every view sharing one skeleton; a table and a
board simply want different things.

**Option E was seriously considered and is still attractive.** On desktop, W4's "compare two
games" is arguably better served by a second window than by tabs, which weakens the main
argument for C+. It was rejected for one concrete reason: the owner needs to search and filter
a wide table, and a fixed-width panel cannot hold one. Since C+ → E is deletion while E → C+ is
addition, starting at C+ is also the reversible direction.

## Consequences

- **Positive:** all six workflows are served. Geometry is consistent across views, so the panel
  is always in the same place. The panel's three-part structure lets the body get dense (an
  engine panel, an explorer) without losing its controls. Option E remains cheap to adopt.
- **Negative / tradeoffs:** tab management is a concept users must hold, and tabs accumulate
  clutter. Two tab strips need continuous visual discipline. More shell code than option E.
- **Deliberately not built:** dockable or rearrangeable panes. Two or three named presets
  (B-089) capture most of the value for a fraction of the cost, and collapsibility matters more
  than configurability — an un-hideable panel that steals board space is the loudest complaint
  in the category.
- **Follow-ups:** B-089 (presets, collapsible panel), B-085 (persist geometry, and decide
  whether open tabs restore), B-090 (narrow-window behaviour below ~900px), B-091 (board
  maximum size and what absorbs surplus width), B-010 (composed filters), B-033
  (virtualisation), B-014 (the engine panel slots into the existing panel tabs).
- **This ADR supersedes no earlier ADR.** It records a decision ADR-0001 left open, in the same
  way ADR-0006 did for the framework.
