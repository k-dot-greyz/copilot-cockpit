//! Pure classify / flood / duplicate helpers. No GitHub client, no I/O.

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AuthorType {
    Human,
    Bot,
    External,
}

pub fn classify_author(login: &str, account_type: &str, human_logins: &[&str]) -> AuthorType {
    let lower = login.to_ascii_lowercase();
    if account_type.eq_ignore_ascii_case("Bot")
        || login.starts_with("app/")
        || lower.contains("[bot]")
    {
        return AuthorType::Bot;
    }
    if human_logins.iter().any(|h| *h == login) {
        return AuthorType::Human;
    }
    AuthorType::External
}

pub fn extract_issue_refs(title: &str) -> Vec<u32> {
    title
        .match_indices('#')
        .filter_map(|(i, _)| {
            let rest = title.get(i + 1..)?;
            let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
            if digits.is_empty() {
                None
            } else {
                digits.parse().ok()
            }
        })
        .collect()
}

/// Groups `ns/prefix-xxxx` hex-suffix branches. `min_count` from the config card.
pub fn detect_flood_prefixes<'a>(
    refs: impl IntoIterator<Item = &'a str>,
    min_count: usize,
) -> Vec<(String, usize)> {
    use std::collections::BTreeMap;
    let mut groups: BTreeMap<String, usize> = BTreeMap::new();
    for head in refs {
        if let Some(prefix) = flood_prefix(head) {
            *groups.entry(prefix).or_insert(0) += 1;
        }
    }
    let mut out: Vec<_> = groups
        .into_iter()
        .filter(|(_, n)| *n >= min_count)
        .collect();
    out.sort_by(|a, b| b.1.cmp(&a.1));
    out
}

fn flood_prefix(head: &str) -> Option<String> {
    // `anything/prefix-xxxx` where xxxx is 4 hex chars
    let slash = head.find('/')?;
    let rest = &head[slash + 1..];
    let dash = rest.rfind('-')?;
    let (prefix, hash) = rest.split_at(dash);
    let hash = &hash[1..];
    if prefix.is_empty() || hash.len() != 4 || !hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    if !prefix.chars().all(|c| c.is_ascii_lowercase() || c == '-') {
        return None;
    }
    Some(prefix.to_string())
}

pub fn duplicate_titles<'a>(titles: impl IntoIterator<Item = &'a str>) -> Vec<(String, usize)> {
    use std::collections::BTreeMap;
    let mut groups: BTreeMap<String, usize> = BTreeMap::new();
    for title in titles {
        *groups.entry(title.to_string()).or_insert(0) += 1;
    }
    let mut out: Vec<_> = groups.into_iter().filter(|(_, n)| *n > 1).collect();
    out.sort_by(|a, b| b.1.cmp(&a.1));
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_from_team_card_not_a_single_login() {
        let team = ["k-dot-greyz", "kasparsgreizis", "greyZ"];
        assert_eq!(
            classify_author("kasparsgreizis", "User", &team),
            AuthorType::Human
        );
        assert_eq!(
            classify_author("copilot[bot]", "User", &team),
            AuthorType::Bot
        );
        assert_eq!(classify_author("stranger", "User", &team), AuthorType::External);
    }

    #[test]
    fn extracts_issue_refs() {
        assert_eq!(extract_issue_refs("fix #12 and #34"), vec![12, 34]);
    }

    #[test]
    fn detects_flood_prefixes() {
        let refs: Vec<String> = (1..=10)
            .map(|i| format!("greyzxc/issue-resolution-{:04x}", i))
            .collect();
        let borrowed: Vec<&str> = refs.iter().map(|s| s.as_str()).collect();
        let floods = detect_flood_prefixes(borrowed, 10);
        assert_eq!(floods, vec![("issue-resolution".to_string(), 10)]);
    }

    #[test]
    fn finds_duplicate_titles() {
        let dups = duplicate_titles(["same", "same", "unique"]);
        assert_eq!(dups, vec![("same".to_string(), 2)]);
    }
}
