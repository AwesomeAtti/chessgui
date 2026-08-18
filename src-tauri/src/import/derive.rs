//! The derived half of ADR-0005: dates, player names, results, ratings.
//!
//! Everything here turns an authoritative raw string into a useful lossy one. Nothing here
//! rejects anything — a value that will not parse yields `None`, never an error, because
//! ADR-0009 says an import error is a game `pgn-reader` refuses and nothing else. A date of
//! `"tuesday"` is a game with no derived date, not a failed import.

use unicode_normalization::UnicodeNormalization;

use super::model::PgnDate;

/// Parse a PGN `Date` tag: `2024.03.17`, `2024.??.??`, `????.??.??`.
///
/// `raw` is kept exactly as it appeared. `parsed` is filled only when all three components
/// are present and plausible — plausible meaning a real calendar day, so `2024.02.31`
/// yields a year and a month but no ISO date. That check is derivation quality rather than
/// validation: an implausible date still imports.
pub fn parse_date(raw: &str) -> PgnDate {
    let mut parts = raw.split('.');
    let year = parts.next().and_then(|p| parse_component(p, 1, 9999));
    let month = parts.next().and_then(|p| parse_component(p, 1, 12));
    let day = parts.next().and_then(|p| parse_component(p, 1, 31));
    let trailing = parts.next();

    // More than three components is not a PGN date; keep it raw and derive nothing.
    let (year, month, day) = if trailing.is_some() {
        (None, None, None)
    } else {
        (year, month, day)
    };

    let parsed = match (year, month, day) {
        (Some(y), Some(m), Some(d)) if is_real_day(y, m, d) => {
            Some(format!("{y:04}-{m:02}-{d:02}"))
        }
        _ => None,
    };

    PgnDate {
        raw: raw.to_owned(),
        parsed,
        year: year.map(|y| y as i32),
        month,
    }
}

fn parse_component(part: &str, min: u32, max: u32) -> Option<u32> {
    if part.is_empty() || !part.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    part.parse::<u32>().ok().filter(|v| *v >= min && *v <= max)
}

fn is_real_day(year: u32, month: u32, day: u32) -> bool {
    // `is_multiple_of` rather than `%`, which clippy requires now that the declared MSRV is
    // 1.95 — the method stabilised in 1.87, and clippy suppresses this lint below that.
    let leap = year.is_multiple_of(4) && (!year.is_multiple_of(100) || year.is_multiple_of(400));
    let days = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return false,
    };
    day <= days
}

/// Derive the lossy matching form of a player name (B-058).
///
/// Case-folded, accent-stripped, whitespace-collapsed, canonicalised to `lastname, firstname`.
///
/// **Two deliberate limits.** Reordering a name that has no comma treats the last word as
/// the surname, which is wrong for `van der Wiel` and right for `Magnus Carlsen`; PGN asks
/// for `Lastname, Firstname` and most sources comply, so the heuristic only fires on files
/// that already departed from the spec. And accent-stripping decomposes then drops combining
/// marks, which handles `Müller` and `Núñez` but not letters with no decomposition — those
/// get an explicit map below, and anything outside Latin is left alone rather than
/// transliterated, because a wrong transliteration matches the wrong player.
///
/// This value is never displayed and never authoritative. Merging real duplicates is B-022.
pub fn normalise_name(name: &str) -> String {
    let collapsed = name.split_whitespace().collect::<Vec<_>>().join(" ");
    let reordered = match collapsed.split_once(',') {
        Some((last, first)) => format!("{}, {}", last.trim(), first.trim()),
        None => match collapsed.rsplit_once(' ') {
            Some((first, last)) => format!("{last}, {first}"),
            None => collapsed,
        },
    };

    let lowered = reordered.to_lowercase();
    let mut out = String::with_capacity(lowered.len());
    // **A combining mark is only dropped when it sits on a Latin letter**, and the reason is
    // a test failure worth keeping: Cyrillic `й` (U+0439) decomposes to `и` plus a combining
    // breve, so a blanket strip of U+0300..U+036F rewrites `Анатолий` to `анатолии` — a
    // different name, and one that would silently match a different player. The accent in
    // `Müller` is decoration; the breve in `й` is a letter. Only the writing system knows
    // which, so the base character decides.
    let mut base_is_latin = false;
    for ch in lowered.nfd() {
        if ('\u{0300}'..='\u{036f}').contains(&ch) {
            if !base_is_latin {
                out.push(ch);
            }
            continue;
        }
        base_is_latin = ch.is_ascii_alphabetic();
        match ch {
            'ø' => out.push('o'),
            'đ' | 'ð' => out.push('d'),
            'ł' => out.push('l'),
            'ħ' => out.push('h'),
            'ŧ' => out.push('t'),
            'æ' => out.push_str("ae"),
            'œ' => out.push_str("oe"),
            'ß' => out.push_str("ss"),
            'þ' => out.push_str("th"),
            other => {
                out.push(other);
                continue;
            }
        }
        // Everything in the map above resolves to Latin letters, so a mark following one of
        // them is decoration too.
        base_is_latin = true;
    }
    // Recompose, so a kept mark is one character again and equals the same name typed
    // directly. Comparing normalised names is the entire point of the field.
    let recomposed: String = out.nfc().collect();
    recomposed.trim().trim_end_matches(',').to_owned()
}

/// Map a PGN result token to ADR-0005's integer. Anything unrecognised is `None`.
///
/// `*` means unknown or in progress and is `None` rather than a draw — which is B-103's
/// standing condition stated in code: derive the winner positively, never infer a draw by
/// default.
pub fn parse_result(token: &str) -> Option<i8> {
    match token.trim() {
        "1-0" => Some(1),
        "0-1" => Some(-1),
        "1/2-1/2" => Some(0),
        _ => None,
    }
}

/// Parse an Elo tag. Non-numeric ratings — `"unrated"`, `"-"`, an empty tag — derive nothing.
pub fn parse_elo(value: &str) -> Option<u32> {
    let value = value.trim();
    if value.is_empty() || !value.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    value.parse().ok()
}

/// A tag value that is present but empty derives nothing, so `Some("")` never reaches the UI.
pub fn non_empty(value: &str) -> Option<String> {
    let value = value.trim();
    (!value.is_empty()).then(|| value.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn complete_dates_parse() {
        let d = parse_date("2024.03.17");
        assert_eq!(d.raw, "2024.03.17");
        assert_eq!(d.parsed.as_deref(), Some("2024-03-17"));
        assert_eq!(d.year, Some(2024));
        assert_eq!(d.month, Some(3));
    }

    #[test]
    fn partial_dates_keep_what_is_known() {
        let d = parse_date("2024.??.??");
        assert_eq!(d.parsed, None);
        assert_eq!(d.year, Some(2024));
        assert_eq!(d.month, None);

        let d = parse_date("2024.05.??");
        assert_eq!(d.parsed, None);
        assert_eq!(d.year, Some(2024));
        assert_eq!(d.month, Some(5));
    }

    #[test]
    fn fully_unknown_dates_derive_nothing_and_keep_the_raw_text() {
        let d = parse_date("????.??.??");
        assert_eq!(d.raw, "????.??.??");
        assert_eq!(d.parsed, None);
        assert_eq!(d.year, None);
        assert_eq!(d.month, None);
    }

    #[test]
    fn nonsense_dates_import_and_derive_nothing() {
        for raw in ["tuesday", "", "2024", "2024.13.01", "2024.02.31", "1.2.3.4"] {
            let d = parse_date(raw);
            assert_eq!(d.raw, raw, "raw must survive: {raw}");
            assert_eq!(d.parsed, None, "must not derive an ISO date from {raw}");
        }
        // A real month is still derivable from an impossible day.
        assert_eq!(parse_date("2024.02.31").month, Some(2));
    }

    #[test]
    fn names_are_folded_and_stripped() {
        assert_eq!(normalise_name("Müller, Jörg"), "muller, jorg");
        assert_eq!(normalise_name("Núñez, Inés"), "nunez, ines");
        assert_eq!(normalise_name("  Vasquez ,  Marta "), "vasquez, marta");
    }

    #[test]
    fn names_without_a_comma_are_reordered() {
        assert_eq!(normalise_name("Magnus Carlsen"), "carlsen, magnus");
        assert_eq!(normalise_name("Carlsen"), "carlsen");
    }

    #[test]
    fn letters_without_a_decomposition_are_mapped_explicitly() {
        assert_eq!(normalise_name("Nørgaard, Bjørn"), "norgaard, bjorn");
        assert_eq!(normalise_name("Wojtaszek, Radosław"), "wojtaszek, radoslaw");
        assert_eq!(normalise_name("Weiß, Hans"), "weiss, hans");
    }

    #[test]
    fn non_latin_names_are_folded_but_never_transliterated() {
        // Cyrillic lowercases and is otherwise left alone: a guessed transliteration
        // would match the wrong player, which is worse than not matching at all.
        assert_eq!(normalise_name("Карпов, Анатолий"), "карпов, анатолий");
    }

    #[test]
    fn cyrillic_letters_that_decompose_are_not_stripped_into_other_letters() {
        // The regression this file exists to remember. `й` = `и` + combining breve, and
        // `ё` = `е` + diaeresis; stripping either merges two distinct letters, and two
        // distinct players with them. Latin decoration is stripped in the same pass.
        assert_eq!(normalise_name("Андрейкин, Дмитрий"), "андрейкин, дмитрий");
        assert_eq!(normalise_name("Алёхин, Александр"), "алёхин, александр");
        assert_ne!(normalise_name("Анатолий"), normalise_name("Анатолии"));
    }

    #[test]
    fn the_same_person_written_two_ways_normalises_the_same() {
        assert_eq!(
            normalise_name("Müller, Jörg"),
            normalise_name("MULLER, JORG")
        );
    }

    #[test]
    fn results_map_to_integers_and_star_is_unknown() {
        assert_eq!(parse_result("1-0"), Some(1));
        assert_eq!(parse_result("0-1"), Some(-1));
        assert_eq!(parse_result("1/2-1/2"), Some(0));
        assert_eq!(parse_result("*"), None);
        assert_eq!(parse_result("½-½"), None);
        assert_eq!(parse_result(""), None);
    }

    #[test]
    fn elo_parses_only_digits() {
        assert_eq!(parse_elo("2412"), Some(2412));
        assert_eq!(parse_elo(" 2412 "), Some(2412));
        assert_eq!(parse_elo("unrated"), None);
        assert_eq!(parse_elo("-"), None);
        assert_eq!(parse_elo(""), None);
    }
}
