//! The Rust half of the shared fixture corpus contract.
//!
//! This does not walk a mainline or judge a game, and under ADR-0009 it never will: the MVP
//! importer builds no positions, because `pgn-reader` validates syntax and legality is checked on
//! the display side where it costs one game instead of three thousand. What this asserts is the
//! part most likely to break silently — that `fixtures/pgn/` is reachable from `src-tauri/`, that
//! its manifest parses, and that every file it lists exists.
//!
//! That matters because the corpus is shared rather than duplicated per language. A relative path
//! that stopped resolving would not fail loudly: the Rust suite would simply stop reading the
//! corpus while the TypeScript suite carried on passing.
//!
//! What B-007 adds here is narrower than an earlier version of this comment promised: whatever
//! `pgn-reader` turns out to refuse, once milestone 1 has measured it. Legality assertions belong
//! on the TypeScript side, which is the side that walks moves.
use std::fs;
use std::path::PathBuf;

use serde_json::Value;

/// `fixtures/` sits at the repository root, one level above this crate. See `fixtures/README.md`.
fn corpus_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../fixtures/pgn")
}

#[test]
fn shared_corpus_is_reachable_and_every_listed_fixture_exists() {
    let dir = corpus_dir();
    let manifest = dir.join("expected.json");

    let text = fs::read_to_string(&manifest)
        .expect("fixtures/pgn/expected.json is unreadable — has the corpus moved?");
    let parsed: Value =
        serde_json::from_str(&text).expect("fixtures/pgn/expected.json is not valid JSON");
    let fixtures = parsed["fixtures"]
        .as_array()
        .expect("fixtures/pgn/expected.json must hold a `fixtures` array");

    // A moved directory would otherwise leave an empty list, a loop that runs zero times, and a
    // green test. Same guard as the TypeScript side.
    assert!(!fixtures.is_empty(), "the shared corpus is empty");

    // And the count, because "not empty" is far too weak: this test reported the same single pass
    // when the corpus held two fixtures and when it held eighteen. A fixture added to the
    // directory but never added to the manifest is read by nothing and asserted by nothing, which
    // is the quiet half of the same failure. Mirrors the TypeScript assertion.
    let on_disk = fs::read_dir(&dir)
        .expect("fixtures/pgn/ is unreadable")
        .filter_map(Result::ok)
        .filter(|entry| entry.path().extension().is_some_and(|ext| ext == "pgn"))
        .count();
    assert_eq!(
        on_disk,
        fixtures.len(),
        "fixtures/pgn/ holds {on_disk} .pgn files but expected.json lists {}",
        fixtures.len()
    );

    for entry in fixtures {
        let name = entry["file"]
            .as_str()
            .expect("every fixture entry needs a `file` string");
        assert!(dir.join(name).is_file(), "missing fixture file: {name}");

        // Every entry must explain itself. A fixture nobody can describe is a fixture nobody dares
        // change — and this is now the only content assertion, because the manifest deliberately
        // carries no import expectations until B-007 milestone 1 measures what pgn-reader refuses.
        let note = entry["note"].as_str().unwrap_or_default();
        assert!(
            !note.is_empty(),
            "{name} has no note explaining why it exists"
        );
    }
}
