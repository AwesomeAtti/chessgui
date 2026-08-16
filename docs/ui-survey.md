# UI survey — how existing chess GUIs are laid out

> Written at B-087, after two coded layouts were rejected in one session. The purpose is to
> replace "I don't like it" with shared vocabulary, and to replace my guesses with what the
> category has already converged on.

## The finding that matters most

**Every mature product in this category made layout user-configurable, and did so
deliberately.** This is not a detail of their implementations — it is their answer to the same
problem we just hit.

- **ChessBase 18** ships *predefined layouts* for different purposes and lets the user save
  their own. Panes are dragged by their title bar and rearranged freely, and each pane can be
  switched off entirely. Layouts are saved and reloaded from the View menu, including engine
  configuration.
- **Scid vs. PC** offers *five layout slots*, three of them user-defined and savable. The game
  list docks to whichever side has the most width and can be dragged anywhere.
- **Lichess** is the exception that proves it: a fixed layout, and its most recent redesign drew
  sustained complaints precisely because the side panel took space from the board and could no
  longer be easily collapsed. A browser extension exists largely to restore the ability to hide
  panels.

So the conclusion is not "we picked the wrong layout". It is that **layout in this category is
genuinely subjective and workflow-dependent, and the products that survived treat it as a
setting rather than a decision.** Two rejected layouts in one session is the expected outcome of
trying to pick one correct answer to a question that does not have one.

## The structural patterns

### 1. Two contexts — ChessBase

A **database window** (the "control centre": folder tree on the left, databases on the right, a
preview pane showing a games list) and a separate **board window** (board, notation, engine,
reference, book, photos — a dozen optional panes). They are different windows for different
activities. Opening a game moves you from one to the other.

Notation itself is tabbed — full notation, table notation, score sheet, training, book,
reference — which is how ChessBase fits so much into one pane.

### 2. Tabbed documents — Scid vs. PC

A tabbed document interface: game lists and game windows are tabs in one window, in the manner
of a code editor. Multiple games open at once, switchable. Keyboard navigation through a game
is Left/Right/Home/End; double-click or Ctrl+Enter loads a game from the list.

### 3. Single fixed page — Lichess

Board on one side, a stacked side panel on the other holding move list, engine evaluation and
opening explorer. Nothing is dockable. Simple and immediately legible; the complaints are about
inflexibility, not comprehensibility.

### 4. Master–detail — what we built second

List permanently on the left, selection populating board and moves on the right. Common in
mail and file managers; **notably, not what any of the dedicated chess databases actually do.**
Worth recording, since it was asserted in this project as the obvious answer and the survey does
not support that.

## What the criticism says

ChessBase is described in the wider community as convoluted, built on an MS-Word-like design,
unintuitive, and dated-looking despite running on fast hardware — the result of forty years of
accumulated features. Scid vs. PC is described as capable but visually dated. Yet ChessBase
retains its users, because nothing matches its functionality.

**That gap is the opportunity in the product vision, and it is specific rather than vague.** The
complaint is not that these tools lack features. It is that the interface is dense, dated, and
hard to approach. "Modern" for this product therefore means restraint and clarity at a
comparable level of capability — which is a design brief, not an adjective, and goes some way to
answering handover risk 2.

## Implications for chessgui

1. **Do not try to pick the one correct layout.** Pick a good default and offer a small number
   of presets. Full dockable panes are a large feature and not an MVP concern; two or three
   named presets capture most of the benefit for a fraction of the cost.
2. **Panels must be collapsible.** The single loudest complaint about the newest layout in this
   category is a panel that cannot be hidden and steals space from the board.
3. **The board is the thing that should get the space.** Every layout in every product treats
   board size as the scarce resource that everything else competes for.
4. **Keyboard navigation is expected**, not a nicety: Left/Right/Home/End through a game is
   universal (B-086).
5. **Decide the "two contexts vs. one window" question deliberately** — it is the biggest
   structural fork, it is what ChessBase and Scid answer differently, and it is much harder to
   change later than pane proportions.

## Sources

- [Board window — ChessBase 18](https://help.chessbase.com/CBase/18/Eng/board_window.htm)
- [Database window — ChessBase 18](https://help.chessbase.com/CBase/18/Eng/database_window.htm)
- [ChessBase 18 — Standard Layout or Custom Layout](https://en.chessbase.com/post/chessbase-18-beginner-s-tips-part-10-standard-layout-or-custom-layout)
- [Scid vs. PC — README](https://scidvspc.sourceforge.net/README.html)
- [Scid vs. PC — Sorting the Game List](https://scidvspc.sourceforge.net/doc/GameList.htm)
- [SCID — Chess Programming Wiki](https://chessprogramming.org/SCID)
- [Recent Study UI update makes coaching difficult — Lichess feedback](https://lichess.org/forum/lichess-feedback/recent-study-ui-update-makes-coaching-difficult)
- [GUIs compared — Chess.com forums](https://www.chess.com/forum/view/chess-equipment/guis-compared)
- [En Croissant](https://encroissant.org/)
