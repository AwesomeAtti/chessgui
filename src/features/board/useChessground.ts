/**
 * The chessground escape hatch, plus desktop-style sizing.
 *
 * Two jobs, both awkward and both confined here so no component has to know about them.
 *
 * **1. Keeping React out.** chessground is a vanilla-DOM library: it takes ownership of an
 * element and mutates it directly. React must never reconcile that subtree. So the API is
 * created in an empty-dependency effect and updates go through chessground's own `set()`.
 * The container div must have no React children.
 *
 * **2. Filling the pane.** A chessboard is square; a pane is not. The board must be the
 * largest square that fits, and must re-fit whenever the window or the splitter moves.
 *
 * Sizing is done in JavaScript with a `ResizeObserver` rather than in CSS. `aspect-ratio`
 * with container queries would express it more elegantly, but this runs in three different
 * webviews — one of which (WebKitGTK) nobody has tested yet (B-066) — and a `ResizeObserver`
 * behaves identically in all of them. That is the B-069 trade: boring and portable over
 * elegant and assumed.
 *
 * The size is also floored to a multiple of 8 so every square gets the same whole number of
 * pixels. Without it, squares differ by a pixel and the board looks subtly crooked.
 */
import { useCallback, useEffect, useRef } from "react";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { Config } from "chessground/config";

export function useChessground(config: Config): {
  /** Attach to the element the board should fit inside. */
  paneRef: React.RefObject<HTMLDivElement | null>;
  /** Attach to the board element itself. Must have no React children. */
  boardRef: React.RefObject<HTMLDivElement | null>;
} {
  const paneRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const api = useRef<Api | null>(null);

  const configRef = useRef(config);
  configRef.current = config;

  const fit = useCallback(() => {
    const pane = paneRef.current;
    const board = boardRef.current;
    if (pane === null || board === null) return;

    const side = Math.floor(Math.min(pane.clientWidth, pane.clientHeight) / 8) * 8;
    if (side <= 0) return;

    board.style.width = `${side}px`;
    board.style.height = `${side}px`;
    // chessground caches element bounds; without this, coordinates drift after a resize.
    api.current?.redrawAll();
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    const pane = paneRef.current;
    if (board === null || pane === null) return;

    api.current = Chessground(board, configRef.current);
    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(pane);

    return () => {
      observer.disconnect();
      api.current?.destroy();
      api.current = null;
    };
    // Mount once. Config updates are handled by the effect below.
  }, [fit]);

  useEffect(() => {
    api.current?.set(config);
    fit();
  }, [config, fit]);

  return { paneRef, boardRef };
}
