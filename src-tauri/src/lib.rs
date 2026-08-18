//! chessgui — Tauri shell.
//!
//! M1 is a skeleton: this process opens a window and serves the frontend. B-007 added the
//! import logic in [`import`] and [`files`] — pure/IO-only modules with no Tauri, which is what
//! lets them be tested without a window. B-011 adds [`db`], the same split: real IO (a SQLite
//! file), no Tauri, compiled and tested before handover.
//!
//! Two rules that hold from here on:
//!
//! 1. **Commands return error *codes*, never English prose** (B-072). The frontend owns
//!    every user-facing word. See `AppError`.
//! 2. **Everything the frontend calls goes through `src/shell/ipc.ts`** on the other side,
//!    which is what keeps ADR-0001 reversible.
//!
//! # B-011 changed one of those rules, and it is worth being explicit about which
//!
//! Milestones 3–4 of B-007 documented `import_pgn_text` / `import_pgn_files` as **returning no
//! `Result`**, on the grounds that a refused game is data (ADR-0009), not a command failure. That
//! reasoning is unchanged for *parsing*. It never covered *persistence* — writing the parsed
//! games to disk is a new failure class (a full disk, a permissions problem, a poisoned
//! migration) that has nothing to do with what the PGN said, and there is no honest way to
//! report "the database write failed" as import data. So both commands now return
//! `Result<_, AppError>`: `Ok` still carries every parse-time refusal as data exactly as before,
//! and `Err` is reserved for the database itself being unable to accept the write.

pub mod db;
pub mod files;
pub mod import;

use std::sync::{Mutex, PoisonError};

use serde::Serialize;
use tauri::Manager;

use import::{GameId, ImportError};

/// Machine-readable error returned to the frontend.
///
/// `code` is a stable key the frontend maps to a localised message. `detail` is optional
/// non-translated context (a path, a parser offset) for logs and diagnostics — never shown
/// to the user as-is.
#[derive(Debug, Serialize)]
pub struct AppError {
    pub code: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

impl AppError {
    #[allow(dead_code)]
    pub fn new(code: &'static str) -> Self {
        Self { code, detail: None }
    }

    pub fn with_detail(code: &'static str, detail: impl Into<String>) -> Self {
        Self {
            code,
            detail: Some(detail.into()),
        }
    }
}

/// A `rusqlite::Error` is never shown to the user as-is (B-072) — this just gets it behind the
/// same `AppError` shape as everything else. `code` is one value for now because the frontend
/// has no different action to offer for "disk full" versus "migration failed"; split it if that
/// stops being true.
fn db_error(error: rusqlite::Error) -> AppError {
    AppError::with_detail("db_error", error.to_string())
}

/// Build and version information for the About screen.
///
/// Exists mainly to prove the IPC path works end to end in M1. Values come from Cargo,
/// so there is nothing to keep in sync by hand.
#[derive(Debug, Serialize)]
pub struct AppInfo {
    pub name: &'static str,
    pub version: &'static str,
    pub license: &'static str,
}

#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        name: env!("CARGO_PKG_NAME"),
        version: env!("CARGO_PKG_VERSION"),
        license: "GPL-3.0-or-later",
    }
}

/// The open database connection, held for the life of the process.
///
/// **The in-memory `Importer` no longer lives in Tauri state.** Through milestone 4 it did,
/// because it handed out per-process ids and pasting twice had to not reissue one. B-011 retires
/// that: the database assigns every `GameId`/`PlayerId` on insert, so a fresh `Importer::new()`
/// per call is exactly as correct and there is no identity left to hold onto between calls.
struct DbState(Mutex<rusqlite::Connection>);

/// What one `import_pgn_text` call persisted.
///
/// **No full `Game` values cross this boundary** — that is B-011 fixing the B-033 finding: the
/// payload used to be 1.5x the source file because every row carried its own verbatim PGN over
/// IPC, and the library table never read it. `imported` is just the new, stable ids; the
/// frontend re-reads the library via `list_games` and fetches one game via `get_game`.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextImportResult {
    pub imported: Vec<GameId>,
    pub errors: Vec<ImportError>,
}

/// Import pasted PGN text and persist whatever parsed.
///
/// See the module header for why this now returns a `Result`: parsing still cannot fail in the
/// ADR-0009 sense (a refused game is `errors`, still data), but the database write can, and that
/// failure has no honest place inside `TextImportResult`.
#[tauri::command]
fn import_pgn_text(
    text: String,
    db: tauri::State<'_, DbState>,
) -> Result<TextImportResult, AppError> {
    let summary = import::Importer::new().import_text(&text);
    let mut conn = db.0.lock().unwrap_or_else(PoisonError::into_inner);
    let imported = db::insert_import(&mut conn, &summary.games).map_err(db_error)?;
    Ok(TextImportResult {
        imported,
        errors: summary.errors,
    })
}

/// Import one or more PGN files and persist whatever parsed.
///
/// A thin wrapper, deliberately: everything it does is in [`files::import_files`], which knows
/// nothing about Tauri and is therefore compiled and tested before handover. What is *not*
/// verifiable here is this signature and the handler registration below — as always.
#[tauri::command]
fn import_pgn_files(
    paths: Vec<String>,
    db: tauri::State<'_, DbState>,
) -> Result<Vec<files::FileImport>, AppError> {
    let mut importer = import::Importer::new();
    let mut conn = db.0.lock().unwrap_or_else(PoisonError::into_inner);
    files::import_files(&mut importer, &mut conn, &paths).map_err(db_error)
}

/// Every game in the database, hot fields only. **Never carries `tags` or `pgn`** — see
/// [`db::GameSummary`].
#[tauri::command]
fn list_games(db: tauri::State<'_, DbState>) -> Result<Vec<db::GameSummary>, AppError> {
    let conn = db.0.lock().unwrap_or_else(PoisonError::into_inner);
    db::list_games(&conn).map_err(db_error)
}

/// One game in full, including `tags` and the verbatim `pgn` — fetched only when the user opens
/// it, which is the other half of the B-033 fix. `None` if `id` does not exist.
#[tauri::command]
fn get_game(id: GameId, db: tauri::State<'_, DbState>) -> Result<Option<import::Game>, AppError> {
    let conn = db.0.lock().unwrap_or_else(PoisonError::into_inner);
    db::get_game(&conn, id).map_err(db_error)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Both plugins are first-party, `Apache-2.0 OR MIT`, and reached only through
        // `src/shell/` on the frontend side (ADR-0001). `dialog` is the native file picker
        // that B-069 lists as an open platform surface; `opener` is B-117, so an external URL
        // opens in the user's browser instead of navigating the app window away from the app.
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // The database is a derived artifact (ADR-0004 addendum, session 9): it lives in the
            // app's own data directory, not beside the user's PGN files, and it is fine for this
            // to be a hard failure at startup — there is no reduced-functionality mode for "no
            // database", and a silent one would be worse than a crash a user can report.
            let dir = app
                .path()
                .app_data_dir()
                .expect("app data dir is resolvable on every supported platform");
            std::fs::create_dir_all(&dir).expect("create the app data directory");
            let conn =
                db::open(&dir.join("chessgui.sqlite3")).expect("open and migrate the database");
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_info,
            import_pgn_text,
            import_pgn_files,
            list_games,
            get_game
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
