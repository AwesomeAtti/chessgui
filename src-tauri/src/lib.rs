//! chessgui — Tauri shell.
//!
//! M1 is a skeleton: this process opens a window and serves the frontend. It owns no
//! chess logic and no storage yet.
//!
//! Two rules that hold from here on:
//!
//! 1. **Commands return error *codes*, never English prose** (B-072). The frontend owns
//!    every user-facing word. See `AppError`.
//! 2. **Everything the frontend calls goes through `src/shell/ipc.ts`** on the other side,
//!    which is what keeps ADR-0001 reversible.

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
