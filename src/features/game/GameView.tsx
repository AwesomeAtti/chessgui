/**
 * A game tab: board on the left (fluid), panel on the right (fixed).
 *
 * Serves W3 — review the game you played last night. The interaction that matters most here
 * is stepping through moves with the keyboard, because it is the most repetitive thing in the
 * whole product and the one most punished by friction.
 *
 * The board is still `viewOnly`: you can navigate the mainline, but not play your own moves
 * onto it, because there is nothing to record them into until B-009 and B-015.
 */
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { BoardView } from "@/features/board/BoardView";
import { MoveList } from "@/features/moves/MoveList";
import { SidePanel, type PanelTab } from "@/features/shell/SidePanel";
import { GameInfo } from "@/features/game/GameInfo";
import { clampPly, readMainline } from "@/features/game/mainline";
import type { Game } from "@/model/game";

interface GameViewProps {
  game: Game;
  ply: number;
  onPlyChange: (ply: number) => void;
  panelTab: string;
  onPanelTabChange: (id: string) => void;
}

export function GameView({
  game,
  ply,
  onPlyChange,
  panelTab,
  onPanelTabChange,
}: GameViewProps) {
  const { t } = useTranslation();
  const mainline = useMemo(() => readMainline(game.pgn), [game.pgn]);
  const current = clampPly(mainline, ply);
  const fen = mainline.fens[current] ?? mainline.fens[0] ?? "";

  // W3: arrow keys are the primary interaction. Home/End jump to either end.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target !== null && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const last = mainline.san.length;
      let next: number | null = null;
      if (event.key === "ArrowRight") next = Math.min(last, current + 1);
      else if (event.key === "ArrowLeft") next = Math.max(0, current - 1);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = last;

      if (next !== null) {
        event.preventDefault();
        onPlyChange(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, mainline.san.length, onPlyChange]);

  const tabs: readonly PanelTab[] = [
    { id: "moves", label: t("panel.moves") },
    { id: "info", label: t("panel.info") },
  ];

  const last = mainline.san.length;

  return (
    <div className="game-view">
      <div className="board-region">
        <div className="player-strip">
          <span className="player-name">{game.black.name}</span>
          {game.blackElo !== null && (
            <span className="player-elo">{game.blackElo}</span>
          )}
        </div>

        <BoardView fen={fen} />

        <div className="player-strip">
          <span className="player-name">{game.white.name}</span>
          {game.whiteElo !== null && (
            <span className="player-elo">{game.whiteElo}</span>
          )}
        </div>
      </div>

      <SidePanel
        tabs={tabs}
        activeTab={panelTab}
        onSelectTab={onPanelTabChange}
        footer={
          <div className="nav-buttons">
            <button
              type="button"
              aria-label={t("nav.first")}
              onClick={() => onPlyChange(0)}
              disabled={current === 0}
            >
              ⏮
            </button>
            <button
              type="button"
              aria-label={t("nav.previous")}
              onClick={() => onPlyChange(Math.max(0, current - 1))}
              disabled={current === 0}
            >
              ◀
            </button>
            <button
              type="button"
              aria-label={t("nav.next")}
              onClick={() => onPlyChange(Math.min(last, current + 1))}
              disabled={current === last}
            >
              ▶
            </button>
            <button
              type="button"
              aria-label={t("nav.last")}
              onClick={() => onPlyChange(last)}
              disabled={current === last}
            >
              ⏭
            </button>
          </div>
        }
      >
        {panelTab === "moves" ? (
          <MoveList
            san={mainline.san}
            currentPly={current}
            truncatedAt={mainline.truncatedAt}
            onSelect={onPlyChange}
          />
        ) : (
          <GameInfo game={game} />
        )}
      </SidePanel>
    </div>
  );
}
