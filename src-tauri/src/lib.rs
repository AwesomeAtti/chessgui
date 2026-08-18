//! chessgui — Tauri shell.
//!
//! M1 is a skeleton: this process opens a window and serves the frontend. B-007 milestone 2
//! added the first real logic, in [`import`] — a pure module with no IO and no Tauri, which
//! is what lets it be tested without a window.
//!
//! Two rules that hold from here on:
//!
//! 1. **Commands return error *codes*, never English prose** (B-072). The frontend owns
//!    every user-facing word. See `AppError`.
//! 2. **Everything the frontend calls goes through `src/shell/ipc.ts`** on the other side,
//!    which is what keeps ADR-0001 reversible.

pub mod files;
pub mod import;

use std::sync::{Mutex, PoisonError};

use serde::Serialize;

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

    #[allow(dead_code)]
    pub fn with_detail(code: &'static str, detail: impl Into<String>) -> Self {
        Self {
            code,
            detail: Some(detail.into()),
        }
    }
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

/// The importer, held for the life of the process (B-007 milestone 3).
///
/// **Stateful on purpose, and this is the only reason it lives here rather than being created
/// per call:** `Importer` hands out game and player ids, so pasting twice must not reissue the
/// same id, and the same player appearing in two pastes should be one player. Games are held by
/// the frontend for now; B-011 replaces both the storage and this identity scheme.
#[derive(Default)]
struct ImportState(Mutex<import::Importer>);

/// Import pasted PGN text.
///
/// **Returns no `Result`, and that is the policy rather than an oversight.** Under ADR-0009 a
/// refused game is *data* — an entry in `errors` — not a failed command, and there is no input
/// for which the importer has nothing to say: bytes that are only PGN by extension produce one
/// empty junk row. So the command cannot fail, and the frontend has no error branch to write for
/// it beyond the transport failures `ipc.ts` already models.
#[tauri::command]
fn import_pgn_text(text: String, state: tauri::State<'_, ImportState>) -> import::ImportSummary {
    // A poisoned lock is recovered from rather than reported. The guarded state is two
    // counters and a name map: a panic mid-import can cost at most a skipped id, which is
    // invisible, and there is no user-facing failure worth inventing a code for. If this ever
    // guards something with an invariant, that reasoning expires.
    let mut importer = state.0.lock().unwrap_or_else(PoisonError::into_inner);
    importer.import_text(&text)
}

/// Import one or more PGN files.
///
/// A thin wrapper, deliberately: everything it does is in [`files::import_files`], which knows
/// nothing about Tauri and is therefore compiled and tested before handover. What is *not*
/// verifiable here is this signature and the handler registration below — as always.
///
/// Like [`import_pgn_text`] it returns no `Result`: an unreadable file is data in that file's
/// outcome, not a failed command. **Unlike it, this can report several failures** — see the
/// note in [`files`].
#[tauri::command]
fn import_pgn_files(
    paths: Vec<String>,
    state: tauri::State<'_, ImportState>,
) -> Vec<files::FileImport> {
    let mut importer = state.0.lock().unwrap_or_else(PoisonError::into_inner);
    files::import_files(&mut importer, &paths)
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
        .manage(ImportState::default())
        .invoke_handler(tauri::generate_handler![
            app_info,
            import_pgn_text,
            import_pgn_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
