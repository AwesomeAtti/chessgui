/**
 * The board pane.
 *
 * Renders a static position from a FEN, sized to fill whatever space the layout gives it.
 * The board is `viewOnly`: pieces cannot be dragged. That is deliberate and not a bug —
 * there is no game tree yet to record a move into, so a draggable board would let the user
 * reach a position the application cannot describe or undo. Interaction arrives with B-009.
 *
 * chessops validates the FEN before chessground is asked to draw it — the ADR-0003 split in
 * practice, with chessops owning rules on the TypeScript side.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { parseFen } from "chessops/fen";
import type { Config } from "chessground/config";

import { useChessground } from "./useChessground";

interface BoardViewProps {
  fen: string;
}

export function BoardView({ fen }: BoardViewProps) {
  const { t } = useTranslation();

  const fenIsValid = useMemo(() => parseFen(fen).isOk, [fen]);

  const config = useMemo<Config>(
    () => ({
      fen,
      viewOnly: true,
      coordinates: true,
      addPieceZIndex: false,
      animation: { enabled: false },
      drawable: { enabled: false },
    }),
    [fen],
  );

  const { paneRef, boardRef } = useChessground(config);

  if (!fenIsValid) {
    return (
      <div className="board-pane">
        <p role="alert">{t("board.invalidFen")}</p>
      </div>
    );
  }

  return (
    <div ref={paneRef} className="board-pane">
      {/* No React children inside the board element — chessground owns it. */}
      <div ref={boardRef} className="board" aria-label={t("board.positionLabel")} />
    </div>
  );
}
