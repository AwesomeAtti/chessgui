/**
 * Document tabs — which *game* you are looking at.
 *
 * Distinct from the panel's segmented tabs, which choose which *tool*. Two orthogonal axes;
 * chess.com and lichess only ever had the second one because neither has a library.
 *
 * The library tab is **pinned and cannot be closed**. It is the home you always return to,
 * which removes an entire class of "where did my games go".
 */
import { useTranslation } from "react-i18next";

import type { GameId } from "@/model/game";

export interface OpenTab {
  readonly gameId: GameId;
  readonly label: string;
}

interface TabBarProps {
  tabs: readonly OpenTab[];
  /** `null` means the pinned library tab is active. */
  activeGameId: GameId | null;
  onSelectLibrary: () => void;
  onSelect: (gameId: GameId) => void;
  onClose: (gameId: GameId) => void;
}

export function TabBar({
  tabs,
  activeGameId,
  onSelectLibrary,
  onSelect,
  onClose,
}: TabBarProps) {
  const { t } = useTranslation();

  return (
    <div className="tab-bar" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={activeGameId === null}
        className={activeGameId === null ? "tab pinned active" : "tab pinned"}
        onClick={onSelectLibrary}
      >
        {t("tabs.library")}
      </button>

      {tabs.map((tab) => (
        <div
          key={tab.gameId}
          className={tab.gameId === activeGameId ? "tab active" : "tab"}
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab.gameId === activeGameId}
            className="tab-label"
            onClick={() => onSelect(tab.gameId)}
            title={tab.label}
          >
            {tab.label}
          </button>
          <button
            type="button"
            className="tab-close"
            aria-label={t("tabs.close")}
            onClick={() => onClose(tab.gameId)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
