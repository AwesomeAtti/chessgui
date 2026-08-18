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
import { ImportDialog, type ImportStep } from "@/features/library/ImportDialog";
import {
  buildImportReport,
  shouldCloseAfterImport,
  type ImportReport,
} from "@/features/library/importReport";
import { LibraryView } from "@/features/library/LibraryView";
import { GameView } from "@/features/game/GameView";
import type { Game, GameId } from "@/model/game";
import {
  getAppInfo,
  importPgnText,
  isShellAvailable,
  type AppInfo,
} from "@/shell/ipc";
import { isAccelPressed } from "@/shell/platform";

interface OpenGame {
  readonly gameId: GameId;
  /** Half-moves from the start. Per-tab, so switching tabs does not lose your place. */
  readonly ply: number;
}

export default function App() {
  const { t } = useTranslation();

  // **The library lives here, in memory, for the life of the process** (B-007 milestone 3).
  // Games disappear on restart, on purpose: persistence is B-011, and keeping it out of this
  // milestone is what stops the first import feature from also being the first migration.
  const [games, setGames] = useState<readonly Game[]>([]);

  const [openGames, setOpenGames] = useState<readonly OpenGame[]>([]);
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null);
  const [selectedId, setSelectedId] = useState<GameId | null>(null);
  const [query, setQuery] = useState("");
  const [gameTab, setGameTab] = useState("moves");
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("input");
  const [importText, setImportText] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  /**
   * The last import's outcome. **Deliberately not owned by the dialog**, which is the whole of
   * the fix: it outlives the dialog so that dismissing the dialog is not the end of the record.
   * Cleared only when the user dismisses the strip, or when the next import starts.
   */
  const [importReport, setImportReport] = useState<ImportReport | null>(null);

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

  const openImport = useCallback((prefill?: string) => {
    if (prefill !== undefined) setImportText(prefill);
    setImportStep("input");
    setImportOpen(true);
  }, []);

  const runImport = useCallback(async () => {
    setImportBusy(true);
    // The previous outcome goes as soon as a new import starts: a strip describing the last
    // run while this one is in flight is worse than no strip.
    setImportReport(null);
    const result = await importPgnText(importText);
    setImportBusy(false);
    if (!result.ok) {
      // A transport failure, not a bad PGN — the command itself cannot fail (ADR-0009).
      // Outside Tauri this is the expected path, and the browser control that B-077 argues for.
      console.error("[import] ipc failed", result.error);
      return;
    }

    const report = buildImportReport(result.value);
    // **The strip always gets the outcome**, whichever way the dialog goes. That is what makes
    // dismissing the dialog safe, and it is the difference between this and the version that
    // was reported as losing the status.
    setImportReport(report);

    if (shouldCloseAfterImport(report)) {
      setImportOpen(false);
      // Clearing the box is part of closing: reopening it on last week's paste is how a game
      // gets imported twice by accident, and duplicate rows are expected but not free.
      setImportText("");
    } else {
      // Something to read or act on, so the dialog holds — on its result step, not on a box
      // still full of the text that just failed.
      setImportStep("result");
    }
    // Appended rather than replaced: ids come from one long-lived importer in the backend, so
    // two pastes are two batches of the same library. Duplicate rows are expected and visible
    // (ADR-0008 rule 6 was deleted); de-duplicating is B-022.
    setGames((current) => [...current, ...result.value.games]);
  }, [importText]);

  const setPly = useCallback((gameId: GameId, ply: number) => {
    setOpenGames((current) =>
      current.map((entry) => (entry.gameId === gameId ? { ...entry, ply } : entry)),
    );
  }, []);

  // Close the active tab with the platform's own accelerator — Cmd+W on macOS, Ctrl+W
  // elsewhere. Routed through shell/platform.ts rather than reading `metaKey` directly,
  // which is the entire point of B-069: the macOS assumption is made once, in one file.
  //
  // **The early return below is deliberate: do not add `preventDefault()` to it.** With no
  // game tab open there is nothing to close — the library tab is pinned — so the event is
  // allowed to fall through to the platform, where Cmd+W is Close Window and, in a
  // single-window app, quits. That is the macOS convention and the same thing Chrome does
  // with its last tab. It reads like an oversight because the two branches are asymmetric,
  // and it was reported as a bug once already (M1-F2 in docs/milestones/m1-skeleton.md).
  // Swallowing the key here would instead break the standard close-window shortcut. This is
  // only safe while nothing is unsaved, which is true of the read-only MVP (B-050) and stops
  // being true at B-015 — revisit it there, not before.
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

  const byId = (id: GameId) => games.find((game) => game.id === id) ?? null;

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
            games={games}
            query={query}
            onQueryChange={setQuery}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpen={openGame}
            onAddGames={openImport}
            importReport={importReport}
            onDismissReport={() => setImportReport(null)}
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

      <ImportDialog
        open={importOpen}
        step={importStep}
        text={importText}
        onTextChange={setImportText}
        report={importReport}
        busy={importBusy}
        onImport={() => void runImport()}
        onBack={() => setImportStep("input")}
        onClose={() => setImportOpen(false)}
      />

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
