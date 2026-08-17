//! The Rust half of the shared fixture corpus contract.
//!
//! There is no PGN code here yet — `pgn-reader` and `shakmaty` arrive with B-007 — so this does
//! not walk a mainline or assert a disposition. What it does assert is the part most likely to
//! break silently: that `fixtures/pgn/` is reachable from `src-tauri/`, that its manifest parses,
//! and that every file the manifest lists actually exists.
//!
//! That matters because the corpus is deliberately shared rather than duplicated per language
//! (ADR-0008 rule 3, B-064). A relative path that stops resolving would not fail loudly — it
//! would simply mean the Rust suite stops reading the corpus while the TypeScript suite carries
//! on passing, which is the exact shape of divergence this arrangement exists to prevent.
//!
//! When B-007 lands, the legality assertions belong here, against the same `truncatedAtPly`
//! numbers `mainline.test.ts` already asserts.
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

    for entry in fixtures {
        let name = entry["file"]
            .as_str()
            .expect("every fixture entry needs a `file` string");
        assert!(dir.join(name).is_file(), "missing fixture file: {name}");

        // Keeps the two suites honest about ADR-0008 rule 1's vocabulary: a typo here would
        // otherwise be asserted against on one side and ignored on the other.
        let disposition = entry["disposition"]
            .as_str()
            .expect("every fixture entry needs a `disposition` string");
        let known = matches!(disposition, "clean" | "imported" | "quarantined");
        assert!(known, "unknown disposition in {name}: {disposition}");
    }
}
