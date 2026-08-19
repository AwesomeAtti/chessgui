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
import {
  ImportDialog,
  type ImportSource,
  type ImportStep,
} from "@/features/library/ImportDialog";
import {
  buildFileImportReport,
  buildImportReport,
  shouldCloseAfterImport,
  type ImportReport,
} from "@/features/library/importReport";
import { LibraryView } from "@/features/library/LibraryView";
import type { Criterion, MatchMode } from "@/features/library/filters";
import { GameView } from "@/features/game/GameView";
import type { Game, GameId, GameSummary } from "@/model/game";
import {
  getAppInfo,
  getGame,
  importPgnFiles,
  importPgnText,
  isShellAvailable,
  listGames,
  type AppInfo,
} from "@/shell/ipc";
import { choosePgnFiles, onPgnFileDrop } from "@/shell/files";
import { isAccelPressed } from "@/shell/platform";

interface OpenGame {
  readonly gameId: GameId;
  /** Half-moves from the start. Per-tab, so switching tabs does not lose your place. */
  readonly ply: number;
}

export default function App() {
  const { t } = useTranslation();

  // **The library is a database now** (B-011). `games` is hot-field-only `GameSummary[]`,
  // re-read with `listGames()` — never grown by appending what an import call returned, which
  // used to carry full `Game` values (pgn and tags included) into React state for every row.
  // `gameDetails` holds the full `Game` for whichever games have been opened, fetched with
  // `getGame` on demand — the library table itself never needs `pgn` or `tags`, which is the
  // other half of the B-033 fix.
  const [games, setGames] = useState<readonly GameSummary[]>([]);
  const [gameDetails, setGameDetails] = useState<ReadonlyMap<GameId, Game>>(
    new Map(),
  );

  const [openGames, setOpenGames] = useState<readonly OpenGame[]>([]);
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null);
  const [selectedId, setSelectedId] = useState<GameId | null>(null);
  const [query, setQuery] = useState("");
  /**
   * Composed library filters (B-010).
   *
   * Here rather than in `LibraryView` for the same reason `query` is: that view unmounts every
   * time a game tab becomes active, so anything it owns is lost on the way back.
   */
  const [criteria, setCriteria] = useState<readonly Criterion[]>([]);
  const [matchMode, setMatchMode] = useState<MatchMode>("all");
  const [gameTab, setGameTab] = useState("moves");
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("input");
  const [importSource, setImportSource] = useState<ImportSource>("paste");
  const [importText, setImportText] = useState("");
  /** Absolute paths staged for import. Only their base names ever reach the screen. */
  const [importPaths, setImportPaths] = useState<readonly string[]>([]);
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

  /** (Re-)read the library from the database. Called on mount and after every import. */
  const refreshLibrary = useCallback(async () => {
    const result = await listGames();
    if (result.ok) {
      setGames(result.value);
    } else {
      console.error("[library] ipc failed", result.error);
    }
  }, []);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  /**
   * Open a game, fetching its full detail first if this is the first time.
   *
   * **Fetches before switching tabs**, rather than switching immediately and showing a loading
   * state, which keeps `GameView` from needing to know about a game that is not fully loaded
   * yet — simplicity first, and nothing here needs to feel instantaneous at MVP scale.
   */
  const openGame = useCallback(
    async (gameId: GameId) => {
      if (!gameDetails.has(gameId)) {
        const result = await getGame(gameId);
        if (!result.ok || result.value === null) {
          console.error("[game] failed to fetch", gameId, result);
          return;
        }
        const game = result.value;
        setGameDetails((current) => {
          const next = new Map(current);
          next.set(gameId, game);
          return next;
        });
      }
      setOpenGames((current) =>
        current.some((entry) => entry.gameId === gameId)
          ? current
          : [...current, { gameId, ply: 0 }],
      );
      setActiveGameId(gameId);
    },
    [gameDetails],
  );

  const closeGame = useCallback((gameId: GameId) => {
    setOpenGames((current) => current.filter((entry) => entry.gameId !== gameId));
    // Closing the active tab returns to the library rather than guessing a neighbour.
    setActiveGameId((current) => (current === gameId ? null : current));
  }, []);

  const openImport = useCallback((prefill?: string) => {
    if (prefill !== undefined) setImportText(prefill);
    setImportSource("paste");
    setImportStep("input");
    setImportOpen(true);
  }, []);

  /**
   * Files were dropped on the window.
   *
   * **Always returns to the library first, then confirms.** Dropping on a game tab and having
   * games appear in a list you cannot see is the version that feels like nothing happened, and
   * the switch also makes the dialog's file list legible as "these are about to join *this*
   * table". The dialog is the confirmation — it names what we caught before acting on it —
   * which is why there is no separate prompt in front of it.
   */
  const dropFiles = useCallback((paths: readonly string[]) => {
    setActiveGameId(null);
    setImportPaths(paths);
    setImportSource("files");
    setImportStep("input");
    setImportOpen(true);
  }, []);

  useEffect(() => onPgnFileDrop(dropFiles), [dropFiles]);

  /**
   * Pasting anywhere opens the Add games dialog with the pasted text in it.
   *
   * **Lives here rather than in `LibraryView`, which is where it started.** Mounted in that
   * view it only existed while the library was on screen, so a paste on a game tab did
   * nothing — not a decision anybody made, just a consequence of where the effect was
   * declared, and found by the owner testing the build. A drop and a paste mean the same
   * thing, so they behave the same way: return to the library, then confirm in the dialog.
   *
   * **We do not check whether the text looks like PGN, and that is deliberate.** Sniffing it
   * would be us deciding what a valid game looks like, which is precisely the validation
   * ADR-0009 declines — `pgn-reader` is the only thing entitled to that opinion. Text that is
   * not PGN produces one empty junk row, visibly and removably.
   *
   * A `paste` listener rather than reading the clipboard on a keypress: the gesture carries
   * its own data, so this needs no clipboard permission and no platform branch.
   */
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target !== null && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      // With the dialog already open, the dialog is the place to paste — its own textarea
      // handles it, and hijacking the gesture would discard whatever is staged there.
      if (importOpen) return;
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (text.trim() === "") return;
      event.preventDefault();
      setActiveGameId(null);
      openImport(text);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [importOpen, openImport]);

  const chooseFiles = useCallback(async () => {
    const chosen = await choosePgnFiles();
    // Appended rather than replaced, so a second trip to the picker adds to the list instead
    // of quietly discarding what was there. Cancelling returns nothing and changes nothing.
    if (chosen.length > 0) setImportPaths((current) => [...current, ...chosen]);
  }, []);

  /**
   * Apply a finished import.
   *
   * Shared by both sources on purpose: the difference between a paste and a batch of files is
   * entirely in how the report was built, and everything after that — the strip, the closing
   * rule, re-reading the library — must not be able to diverge.
   *
   * **No longer takes the imported games themselves** (B-011): the backend already persisted
   * them and handed back only ids, so what changed is "re-read the library", not "append these
   * rows" — same reasoning as `refreshLibrary`.
   */
  const applyImport = useCallback(
    (report: ImportReport) => {
      // **The strip always gets the outcome**, whichever way the dialog goes. That is what
      // makes dismissing the dialog safe, and it is the difference between this and the version
      // that was reported as losing the status.
      setImportReport(report);

      if (shouldCloseAfterImport(report)) {
        setImportOpen(false);
        // Clearing the inputs is part of closing: reopening on last week's paste, or on a file
        // list that has already been imported, is how games get imported twice by accident, and
        // duplicate rows are expected but not free.
        setImportText("");
        setImportPaths([]);
      } else {
        // Something to read or act on, so the dialog holds — on its result step, not on a box
        // still full of the text that just failed.
        setImportStep("result");
      }
      // The database is the library now: two imports are two batches of the same table, and
      // re-reading it is simpler than reasoning about which rows a partial batch added.
      // Duplicate rows are expected and visible (ADR-0008 rule 6 was deleted); de-duplicating
      // is B-022.
      void refreshLibrary();
    },
    [refreshLibrary],
  );

  const runImport = useCallback(async () => {
    setImportBusy(true);
    // The previous outcome goes as soon as a new import starts: a strip describing the last
    // run while this one is in flight is worse than no strip.
    setImportReport(null);

    if (importSource === "files") {
      const result = await importPgnFiles(importPaths);
      setImportBusy(false);
      if (!result.ok) {
        // A database failure, not a bad PGN — parsing still cannot fail (ADR-0009), but
        // persisting now can (B-011). See the note at the top of `src-tauri/src/lib.rs`.
        console.error("[import] ipc failed", result.error);
        return;
      }
      applyImport(buildFileImportReport(result.value));
      return;
    }

    const result = await importPgnText(importText);
    setImportBusy(false);
    if (!result.ok) {
      console.error("[import] ipc failed", result.error);
      return;
    }
    applyImport(buildImportReport(result.value));
  }, [applyImport, importPaths, importSource, importText]);

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

  // Tab labels and the active board both read `gameDetails`, not `games` (the library
  // summaries): `openGame` fetches into `gameDetails` before a game is ever added to
  // `openGames`, so every open tab is guaranteed to have an entry there.
  const tabs: readonly OpenTab[] = openGames.flatMap((entry) => {
    const game = gameDetails.get(entry.gameId);
    if (game === undefined) return [];
    return [{ gameId: entry.gameId, label: `${game.white.name}–${game.black.name}` }];
  });

  const active =
    activeGameId === null ? null : (gameDetails.get(activeGameId) ?? null);
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
            criteria={criteria}
            matchMode={matchMode}
            onFiltersChange={(next, mode) => {
              setCriteria(next);
              setMatchMode(mode);
            }}
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
        source={importSource}
        onSourceChange={setImportSource}
        text={importText}
        onTextChange={setImportText}
        paths={importPaths}
        onChooseFiles={() => void chooseFiles()}
        onRemovePath={(index) =>
          setImportPaths((current) => current.filter((_, at) => at !== index))
        }
        report={importReport}
        busy={importBusy}
        onImport={() => void runImport()}
        // Offered only when exactly one game arrived and nothing else needs saying. The strip
        // deliberately does *not* carry this: it records, and opening a game is an action.
        onOpenGame={
          importReport?.singleGameId == null
            ? null
            : () => {
                const id = importReport.singleGameId;
                if (id === null) return;
                void openGame(id);
                setImportOpen(false);
                setImportText("");
                setImportPaths([]);
              }
        }
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
