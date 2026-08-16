/**
 * Walk a PGN mainline into a position per ply.
 *
 * This is the smallest thing that makes a board worth looking at: arrow keys step through
 * the game. It is **not** the game tree (B-009) — variations, comments and NAGs are ignored,
 * and nothing here is editable. Replacing it with the real tree should not change the board
 * or panel components, only what feeds them.
 *
 * `startingPosition` is used rather than assuming the standard opening, because a PGN may
 * carry `FEN`/`SetUp` headers — studies and endgame positions routinely do, and ADR-0005
 * keeps those tags.
 *
 * Illegal or unparseable moves truncate rather than throw. Real-world PGN contains plenty of
 * both, and a game that stops early is far more useful than a screen that fails. The final
 * policy on malformed input is B-049.
 */
import { parsePgn, startingPosition } from "chessops/pgn";
import { parseSan } from "chessops/san";
import { makeFen } from "chessops/fen";

import { INITIAL_FEN } from "@/model/game";

export interface Mainline {
  readonly san: readonly string[];
  /** One longer than `san`: `fens[0]` is the initial position, `fens[n]` is after `san[n-1]`. */
  readonly fens: readonly string[];
  /** Ply at which parsing stopped, or `null` if the whole mainline was read. */
  readonly truncatedAt: number | null;
}

const EMPTY: Mainline = { san: [], fens: [INITIAL_FEN], truncatedAt: null };

export function readMainline(pgn: string): Mainline {
  const [game] = parsePgn(pgn);
  if (game === undefined) return EMPTY;

  const start = startingPosition(game.headers);
  if (start.isErr) return { ...EMPTY, truncatedAt: 0 };

  const pos = start.unwrap();
  const san: string[] = [];
  const fens: string[] = [makeFen(pos.toSetup())];
  let truncatedAt: number | null = null;

  for (const node of game.moves.mainline()) {
    const move = parseSan(pos, node.san);
    if (move === undefined) {
      truncatedAt = san.length;
      break;
    }
    pos.play(move);
    san.push(node.san);
    fens.push(makeFen(pos.toSetup()));
  }

  return { san, fens, truncatedAt };
}

/** Clamp a ply to a mainline's valid range. */
export function clampPly(mainline: Mainline, ply: number): number {
  return Math.max(0, Math.min(ply, mainline.san.length));
}
