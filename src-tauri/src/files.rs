//! Reading PGN files from disk and persisting them (B-007 milestone 4, B-011).
//!
//! **This module does IO but knows nothing about Tauri**, which is the same split that makes
//! [`crate::import`] and [`crate::db`] testable — `lib.rs` wraps [`import_files`] in a command
//! and adds nothing. The reason for the extra file rather than a few lines in `lib.rs` is that
//! the AI's container cannot build the Tauri crate, so anything living there is handed over
//! unverified; anything here is compiled and tested before it leaves.
//!
//! # The invariant that stops holding here
//!
//! Everything downstream of milestone 3 was built on **at most one error per import**. That is
//! a measured property of `pgn-reader` and it is a property of *one input*: its errors are
//! terminal, so a single file yields zero or one. **Several files are several inputs**, so this
//! module can return a failure followed by successes — the "n games with holes" shape the
//! standing constraint warns against, arriving legitimately because the holes fall between
//! files rather than inside one. Each file is read whole before the next starts, so a bad file
//! costs its own remainder and nothing else.
//!
//! # B-011: persistence, and why a database error aborts the whole batch
//!
//! Each file's games are inserted into the database as soon as they are parsed, inside
//! [`crate::db::insert_import`]'s own transaction. **A `pgn-reader` refusal is still data** — an
//! entry in that file's `errors`, same as before B-011 — but a *database* error (a full disk, a
//! poisoned connection) is not something this module can turn into a per-file outcome honestly,
//! so [`import_files`] returns `Err` and the caller reports it as a command failure. This is a
//! narrower use of `Result` than the parsing side ever needed: it exists only for the database,
//! never for anything a PGN file could contain.

use std::path::Path;

use rusqlite::Connection;
use serde::Serialize;

use crate::db;
use crate::import::{Encoding, GameId, ImportError, Importer};

/// Error codes this module can produce. [`crate::import::codes`] holds the parser's; these
/// exist only because there is a filesystem.
pub mod codes {
    /// The file could not be opened or read at all — missing, a directory, or no permission.
    /// The distinction is in `detail`; none of the three earns its own user-facing sentence.
    pub const UNREADABLE: &str = "file_unreadable";
}

/// What one file produced.
///
/// **A tagged union rather than a struct of optionals**, because the two cases share no fields.
/// `imported: Vec<_>` plus `error: Option<_>` admits a state where both are empty/`None`, and
/// the frontend would have to decide what that meant.
///
/// **No full `Game` values here, same reason as [`crate::TextImportResult`]:** `imported` is
/// just the new, stable ids assigned by the database, not the games themselves (B-011, the
/// B-033 fix).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum FileOutcome {
    Imported {
        imported: Vec<GameId>,
        errors: Vec<ImportError>,
        /// Which decoder read the bytes. Pasted text has already been decoded by the webview,
        /// so this is the first place the Latin-1 fallback is observable at all.
        encoding: Encoding,
    },
    Unreadable {
        code: &'static str,
        /// The OS message, untranslated, for logs only.
        ///
        /// **Checked rather than assumed: `std::fs::read`'s `io::Error` does not embed the
        /// path** — it renders as "No such file or directory (os error 2)". That matters,
        /// because a path contains a home directory and the standing rule keeps those out of
        /// anything we log or show.
        detail: String,
    },
}

/// One file's worth of import.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileImport {
    /// The file's **base name only, never the full path** — same reason as `detail` above. The
    /// frontend has no use for the directory, and a person recognises the file by its name.
    pub name: String,
    pub outcome: FileOutcome,
}

/// Read each path, import it, and persist what parsed — in order.
///
/// Never fails *for a parse reason*: an unreadable file or a refused game is one entry's
/// outcome, not an error for the batch. **Does fail for a database reason** — see the module
/// header — in which case nothing already inserted in this call is rolled back; each file's
/// [`crate::db::insert_import`] call already committed its own transaction before the next file
/// starts, so a failure on file 3 leaves files 1–2 persisted, which is the same "holes between
/// files, not within one" shape the rest of this module is built on.
pub fn import_files(
    importer: &mut Importer,
    conn: &mut Connection,
    paths: &[String],
) -> rusqlite::Result<Vec<FileImport>> {
    paths
        .iter()
        .map(|path| import_file(importer, conn, path))
        .collect()
}

fn import_file(
    importer: &mut Importer,
    conn: &mut Connection,
    path: &str,
) -> rusqlite::Result<FileImport> {
    // `file_name` is `None` only for a path ending in `..`, which no file dialog and no drop
    // produces. Falling back to the whole path would leak a home directory, so it falls back
    // to empty and the frontend supplies its own placeholder.
    let name = Path::new(path)
        .file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_default();

    let outcome = match std::fs::read(path) {
        Ok(bytes) => {
            let (summary, encoding) = importer.import_bytes(&bytes);
            let imported = db::insert_import(conn, &summary.games)?;
            FileOutcome::Imported {
                imported,
                errors: summary.errors,
                encoding,
            }
        }
        Err(error) => FileOutcome::Unreadable {
            code: codes::UNREADABLE,
            detail: error.to_string(),
        },
    };

    Ok(FileImport { name, outcome })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn corpus(name: &str) -> String {
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../fixtures/pgn")
            .join(name)
            .to_string_lossy()
            .into_owned()
    }

    fn run(paths: &[String]) -> Vec<FileImport> {
        let mut importer = Importer::new();
        let mut conn = db::open_in_memory().unwrap();
        import_files(&mut importer, &mut conn, paths).unwrap()
    }

    fn imported_of(entry: &FileImport) -> &[GameId] {
        match &entry.outcome {
            FileOutcome::Imported { imported, .. } => imported,
            FileOutcome::Unreadable { detail, .. } => panic!("expected an import: {detail}"),
        }
    }

    fn errors_of(entry: &FileImport) -> &[ImportError] {
        match &entry.outcome {
            FileOutcome::Imported { errors, .. } => errors,
            FileOutcome::Unreadable { detail, .. } => panic!("expected an import: {detail}"),
        }
    }

    #[test]
    fn a_readable_file_imports_and_reports_its_encoding() {
        let results = run(&[corpus("clean-standard.pgn")]);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "clean-standard.pgn");
        assert_eq!(imported_of(&results[0]).len(), 1);
        assert!(matches!(
            results[0].outcome,
            FileOutcome::Imported {
                encoding: Encoding::Utf8,
                ..
            }
        ));
    }

    /// ADR-0009 rule 5's only reachable path: pasted text has already been decoded, so a
    /// declaration-free Latin-1 file can only arrive through a file.
    #[test]
    fn a_latin1_file_reports_the_fallback_rather_than_failing() {
        let results = run(&[corpus("latin1-no-declaration.pgn")]);

        assert!(
            matches!(
                results[0].outcome,
                FileOutcome::Imported {
                    encoding: Encoding::Latin1,
                    ..
                }
            ),
            "expected the Latin-1 fallback to fire and be visible"
        );
        assert_eq!(imported_of(&results[0]).len(), 1);
    }

    #[test]
    fn a_missing_file_is_one_entry_s_outcome_rather_than_a_failed_batch() {
        let results = run(&[corpus("no-such-file.pgn")]);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "no-such-file.pgn");
        match &results[0].outcome {
            FileOutcome::Unreadable { code, detail } => {
                assert_eq!(*code, codes::UNREADABLE);
                // The whole reason `detail` is safe to log.
                assert!(
                    !detail.contains('/'),
                    "the OS message must not carry the path: {detail}"
                );
            }
            FileOutcome::Imported { .. } => panic!("a missing file must not import"),
        }
    }

    #[test]
    fn a_directory_is_unreadable_rather_than_a_panic() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../fixtures/pgn")
            .to_string_lossy()
            .into_owned();
        let results = run(&[dir]);

        assert!(matches!(results[0].outcome, FileOutcome::Unreadable { .. }));
    }

    /// **The test this module exists for.** Milestone 3's report was built on "at most one
    /// error, and it ends the import". Across files that is false: the bad file stops at its
    /// own failure and the next file imports in full. If anyone reintroduces the single-error
    /// assumption downstream, this is where it should hurt.
    #[test]
    fn a_bad_file_costs_only_its_own_remainder_and_the_next_file_still_imports() {
        let results = run(&[
            corpus("clean-standard.pgn"),
            corpus("unterminated-comment.pgn"),
            corpus("dedupe-original.pgn"),
        ]);

        assert_eq!(results.len(), 3);
        assert!(errors_of(&results[0]).is_empty());
        assert_eq!(errors_of(&results[1]).len(), 1);
        assert!(
            errors_of(&results[2]).is_empty(),
            "the file after the failure must import normally — it is a separate input"
        );
        assert!(!imported_of(&results[2]).is_empty());
    }

    /// B-011: ids now come from the database, which is what makes them stable across restarts.
    /// A batch must still not reuse one within itself.
    #[test]
    fn ids_stay_unique_across_the_files_in_one_batch() {
        let results = run(&[corpus("clean-standard.pgn"), corpus("clean-standard.pgn")]);

        let first = imported_of(&results[0])[0];
        let second = imported_of(&results[1])[0];
        assert_ne!(
            first, second,
            "importing the same file twice must produce two distinct rows (B-022 dedupes, not us)"
        );
    }

    #[test]
    fn the_full_path_never_reaches_the_frontend() {
        let results = run(&[corpus("clean-standard.pgn")]);
        let json = serde_json::to_string(&results).expect("serialise");

        assert!(
            !json.contains("fixtures"),
            "the payload must carry the base name only, never the directory"
        );
    }

    #[test]
    fn a_database_failure_aborts_the_batch_as_an_error_rather_than_a_file_outcome() {
        // A connection with no schema at all (migrations never applied) makes every insert fail,
        // standing in for "the database itself is unavailable" without needing to simulate a
        // full disk. This is the one case in this module that is a `Result::Err`, not data.
        let mut importer = Importer::new();
        let mut conn = rusqlite::Connection::open_in_memory().unwrap();
        let result = import_files(&mut importer, &mut conn, &[corpus("clean-standard.pgn")]);
        assert!(result.is_err());
    }
}
