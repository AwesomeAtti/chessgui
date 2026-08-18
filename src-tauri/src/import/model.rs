//! The Rust expression of ADR-0005, kept in step with `src/model/game.ts` by hand.
//!
//! Field names serialise as camelCase so the frontend receives exactly the shape
//! `src/model/game.ts` declares. If you change a name here, change it there — there is no
//! generator, and B-011 is the point at which that stops being acceptable.
//!
//! The governing rule, from ADR-0005: **store the raw thing, derive the useful thing.**
//! `pgn` is the source of truth and everything else is derivable from it, which is why a
//! wrong derivation rule costs a re-import rather than data.

use std::collections::BTreeMap;

use serde::Serialize;

/// Stable row identity, assigned at import and never reused (B-050).
///
/// **Per-session only.** These are handed out by a single [`crate::import::Importer`] and
/// mean nothing across restarts; B-011 replaces them with database identity.
pub type GameId = u64;
pub type PlayerId = u64;

/// A player (B-058).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Player {
    pub id: PlayerId,
    /// Verbatim, as it appeared in the PGN tag. Authoritative.
    pub name: String,
    /// Derived and deliberately lossy — see [`crate::import::derive::normalise_name`].
    /// Used for matching and grouping only, never displayed.
    pub normalised_name: String,
}

/// A PGN date (B-059).
///
/// `raw` is authoritative; the rest are derived so a partially-known date still sorts.
///
/// **An absent `Date` tag gives `raw: ""`**, which is deliberately distinguishable from a
/// literal `"????.??.??"`. Milestone 1 measured that `pgn-reader` reports tags truthfully
/// where `chessops` fabricates `?` defaults, and this is where that difference is spent:
/// the importer can tell "the file said nothing" from "the file said unknown", and the
/// frontend can too.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PgnDate {
    pub raw: String,
    /// ISO `YYYY-MM-DD`, only when the date is complete and plausible. Derived.
    pub parsed: Option<String>,
    pub year: Option<i32>,
    pub month: Option<u32>,
}

impl PgnDate {
    /// The date of a game whose file carried no `Date` tag at all.
    pub fn absent() -> Self {
        PgnDate {
            raw: String::new(),
            parsed: None,
            year: None,
            month: None,
        }
    }
}

/// A game as the frontend sees it.
///
/// No move list: the MVP importer never builds a position (ADR-0009), and the game tree is
/// B-009's. `ply_count` is a count of movetext tokens, not a count of legal moves — see the
/// field's own note, because the two genuinely differ and the difference ships.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Game {
    pub id: GameId,

    // Hot fields — indexed columns at B-011, strictly derived from `tags`.
    pub white: Player,
    pub black: Player,
    pub event: Option<String>,
    pub site: Option<String>,
    pub date: PgnDate,
    pub round: Option<String>,
    /// `1` white win, `0` draw, `-1` black win, `None` unknown or in progress (B-060).
    pub result: Option<i8>,
    pub eco: Option<String>,
    /// chess.com's `ECOUrl` (B-102). Finer-grained than `eco`, not a prettier version of it.
    /// Never derive a display name from the slug — that is B-105.
    pub eco_url: Option<String>,
    pub white_elo: Option<u32>,
    pub black_elo: Option<u32>,

    /// **The number of movetext tokens `pgn-reader` handed back**, which is not always the
    /// number of moves that can be played.
    ///
    /// Measured, and both directions ship in the MVP:
    ///
    /// - `illegal-move-midgame.pgn` counts 9 here while the board stops at 6, because the
    ///   importer does not check legality and `chessops` does (ADR-0009's accepted cost).
    /// - `german-san.pgn` counts 3 here while the board shows 4, because `pgn-reader`
    ///   *drops* tokens it cannot parse and `chessops` *rewrites* them (B-115).
    ///
    /// TypeScript types this `number | null`; this importer never produces null, because a
    /// token count is always known. The null is reserved for sources that do not supply one.
    pub ply_count: u32,

    /// The complete tag set (B-060).
    ///
    /// **Duplicate tags: the first occurrence wins**, which is what `chessops` does, so the
    /// two sides agree. The loser is not lost — it is in `pgn` below, which is why a map is
    /// an acceptable shape for a format that permits repeats.
    pub tags: BTreeMap<String, String>,

    /// The verbatim PGN text of this game, byte-preserved, sliced out of the input by the
    /// parser's own byte offsets. **This is the source of truth.**
    pub pgn: String,
}

/// A game `pgn-reader` refused.
///
/// **There is at most one of these per input, and it is always terminal** — see the module
/// documentation. That is a measured property of the parser, not a design choice.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportError {
    /// 0-based position of the failing game within this input. The UI adds one.
    pub game_index: usize,
    /// A stable key the frontend maps to a localised message (B-072). Never English prose.
    pub code: &'static str,
    /// The parser's own message, untranslated. Diagnostics and logs only — never rendered
    /// to the user as-is.
    pub detail: String,
    /// Byte offset in the decoded input past which nothing could be read.
    pub byte_offset: u64,
    /// Enough of the header to identify the game to a human, where the tag section parsed
    /// before the failure. Measured: on an unterminated comment, all seven roster tags
    /// arrive before the parser gives up, so this is usually populated.
    pub white: Option<String>,
    pub black: Option<String>,
    pub date: Option<String>,
}

/// Error codes this module can produce. The vocabulary is closed because `pgn-reader`'s is.
pub mod codes {
    /// `pgn-reader` hit an unterminated `{` comment. Everything after it was swallowed.
    pub const UNTERMINATED_COMMENT: &str = "unterminated_comment";
    /// `pgn-reader` hit a tag line that never closes. Only reachable at end of input.
    pub const UNTERMINATED_TAG: &str = "unterminated_tag";
    /// Anything else the parser refuses. Reaching this means `pgn-reader` grew a new
    /// message (B-063) — `detail` carries it, and the corpus test is what will notice.
    pub const PARSE_FAILED: &str = "parse_failed";
}

/// What one call to the importer produced.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummary {
    pub games: Vec<Game>,
    pub errors: Vec<ImportError>,
}

/// Which decoder read the bytes (milestone 4 surfaces this; pasted text is always UTF-8).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Encoding {
    Utf8,
    Latin1,
}
