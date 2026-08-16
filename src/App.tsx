/**
 * Application shell — layout C+ (ADR-0007).
 *
 * A pinned library tab plus zero or more game tabs. The library owns the full window when
 * active, so filters and a wide table have room (W5); game tabs give the board the space and
 * put tools in the fixed right column (W3); several games can be open at once (W4).
 *
 * **The shell is deliberately thin, and the state is deliberately a list.** `openGames` is an
 * array even though a single-board variant would only ever need one entry. That was the whole
 * cost of keeping the simpler "option E" layout reachable: capping the list at one turns this
 * shell into that one, rather than requiring a rewrite. Components below receive data and
 * size and never decide their own placement — the moment one of them knows it lives in a tab,
 * that reversibility is gone.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { TabBar, type OpenTab } from "@/features/shell/TabBar";
import { LibraryView } from "@/features/library/LibraryView";
import { GameView } from "@/features/game/GameView";
import { MOCK_GAMES } from "@/mock/games";
import type { GameId } from "@/model/game";
import { getAppInfo, isShellAvailable, type AppInfo } from "@/shell/ipc";
import { isAccelPressed } from "@/shell/platform";

interface OpenGame {
  readonly gameId: GameId;
  /** Half-moves from the start. Per-tab, so switching tabs does not lose your place. */
  readonly ply: number;
}

export default function App() {
  const { t } = useTranslation();

  const [openGames, setOpenGames] = useState<readonly OpenGame[]>([]);
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null);
  const [selectedId, setSelectedId] = useState<GameId | null>(
    MOCK_GAMES[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const [gameTab, setGameTab] = useState("moves");
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAppInfo().then((result) => {
      if (!cancelled && result.ok) setAppInfo(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openGame = useCallback((gameId: GameId) => {
    setOpenGames((current) =>
      current.some((entry) => entry.gameId === gameId)
        ? current
        : [...current, { gameId, ply: 0 }],
    );
    setActiveGameId(gameId);
  }, []);

  const closeGame = useCallback((gameId: GameId) => {
    setOpenGames((current) => current.filter((entry) => entry.gameId !== gameId));
    // Closing the active tab returns to the library rather than guessing a neighbour.
    setActiveGameId((current) => (current === gameId ? null : current));
  }, []);

  const setPly = useCallback((gameId: GameId, ply: number) => {
    setOpenGames((current) =>
      current.map((entry) => (entry.gameId === gameId ? { ...entry, ply } : entry)),
    );
  }, []);

  // Close the active tab with the platform's own accelerator — Cmd+W on macOS, Ctrl+W
  // elsewhere. Routed through shell/platform.ts rather than reading `metaKey` directly,
  // which is the entire point of B-069: the macOS assumption is made once, in one file.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "w" || !isAccelPressed(event)) return;
      if (activeGameId === null) return;
      event.preventDefault();
      closeGame(activeGameId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeGameId, closeGame]);

  const byId = (id: GameId) => MOCK_GAMES.find((game) => game.id === id) ?? null;

  const tabs: readonly OpenTab[] = openGames.flatMap((entry) => {
    const game = byId(entry.gameId);
    if (game === null) return [];
    return [{ gameId: entry.gameId, label: `${game.white.name}–${game.black.name}` }];
  });

  const active = activeGameId === null ? null : byId(activeGameId);
  const activeEntry = openGames.find((entry) => entry.gameId === activeGameId) ?? null;

  return (
    <div className="app">
      <TabBar
        tabs={tabs}
        activeGameId={activeGameId}
        onSelectLibrary={() => setActiveGameId(null)}
        onSelect={setActiveGameId}
        onClose={closeGame}
      />

      <main className="workspace">
        {active === null || activeEntry === null ? (
          <LibraryView
            games={MOCK_GAMES}
            query={query}
            onQueryChange={setQuery}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpen={openGame}
          />
        ) : (
          <GameView
            key={active.id}
            game={active}
            ply={activeEntry.ply}
            onPlyChange={(ply) => setPly(active.id, ply)}
            panelTab={gameTab}
            onPanelTabChange={setGameTab}
          />
        )}
      </main>

      <footer className="statusbar">
        {appInfo !== null ? (
          <span>
            {t("about.version", { version: appInfo.version })} ·{" "}
            {t("about.license", { license: appInfo.license })}
          </span>
        ) : (
          !isShellAvailable() && <span>{t("about.shellUnavailable")}</span>
        )}
      </footer>
    </div>
  );
}
