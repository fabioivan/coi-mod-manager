use scraper::{Html, Selector};
use crate::models::Mod;

const BASE_URL: &str = "https://hub.coigame.com";

pub async fn scrape_all(
    client: &reqwest::Client,
    order_by: &str,
    time_range: &str,
) -> Result<Vec<Mod>, reqwest::Error> {
    let mut all_mods = Vec::new();
    let mut rank: i32 = 0;

    let html = client
        .get(format!("{}/Mods/Search", BASE_URL))
        .query(&[
            ("orderBy",             order_by),
            ("timeRange",           time_range),
            ("author",              ""),
            ("query",               ""),
            ("gameVersion",         ""),
            ("devStates",           "1"),
            ("devStates",           "2"),
            ("devStatesExplicit",   "true"),
            ("myFavorites",         "false"),
            ("ignoreLibraries",     "true"),
            ("ignoreClosedSource",  "false"),
        ])
        .send().await?.text().await?;
    let batch = parse_cards(&html, &mut rank);
    let done = batch.len() < 20;
    all_mods.extend(batch);

    if !done {
        let mut page = 2u32;
        loop {
            let html = client
                .get(format!("{}/Mods/LoadMoreThumbnails", BASE_URL))
                .query(&[
                    ("orderBy",             order_by),
                    ("timeRange",           time_range),
                    ("author",              ""),
                    ("query",               ""),
                    ("gameVersion",         ""),
                    ("devStates",           "1"),
                    ("devStates",           "2"),
                    ("devStatesExplicit",   "true"),
                    ("myFavorites",         "false"),
                    ("ignoreLibraries",     "true"),
                    ("ignoreClosedSource",  "false"),
                    ("page",                &page.to_string()),
                ])
                .send().await?.text().await?;
            let batch = parse_cards(&html, &mut rank);
            let done = batch.len() < 20;
            all_mods.extend(batch);
            if done { break; }
            page += 1;
        }
    }

    Ok(all_mods)
}

fn parse_cards(html: &str, rank: &mut i32) -> Vec<Mod> {
    let doc = Html::parse_document(html);

    // Card root
    let card_sel = Selector::parse("a.mod-card").unwrap();

    // h5 title + mod version span (plain mod-card-tag with no extra classes in h5)
    let title_sel       = Selector::parse("h5.mod-card-title").unwrap();
    let h5_spans_sel    = Selector::parse("h5.mod-card-title > span").unwrap();
    let mod_ver_sel     = Selector::parse("h5.mod-card-title > span.mod-card-tag").unwrap();

    // Card-body items (devstate, game-version, category tags)
    let author_sel      = Selector::parse(".card-body p.text-muted").unwrap();
    let desc_sel        = Selector::parse(".card-body p:not(.text-muted)").unwrap();
    let devstate_sel    = Selector::parse(".card-body span[class*='mod-card-devstate']").unwrap();
    let game_ver_sel    = Selector::parse(".card-body .mod-card-game-version").unwrap();
    let tag_sel         = Selector::parse(".card-body span.mod-card-tag").unwrap();

    // Stats bar
    let updated_sel     = Selector::parse(".stats .time-ago[data-type='updated']").unwrap();
    // Os 3 divs no lado direito do stats: download, favorites, approval%
    let stats_nums_sel  = Selector::parse(".stats > div:last-child > div > div:last-child").unwrap();

    // Thumbnail
    let thumb_sel       = Selector::parse(".mod-card-icon img").unwrap();

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    doc.select(&card_sel)
        .filter_map(|card| {
            let href = card.value().attr("href")?;
            let id   = href.split('/').nth(2)?.to_string();
            let url  = format!("{}{}", BASE_URL, href);

            let title_el = card.select(&title_sel).next()?;

            // All span texts in h5 — used to strip from full title to get clean name
            let h5_span_texts: Vec<String> = card
                .select(&h5_spans_sel)
                .map(|s| s.text().collect::<String>())
                .collect();

            // Mod version: plain span.mod-card-tag in h5 (e.g. "v0.2.4")
            // Filter: only spans whose class is exactly "mod-card-tag" (no devstate/game-version)
            let version_available = card
                .select(&mod_ver_sel)
                .find(|el| {
                    let cls = el.value().attr("class").unwrap_or("");
                    // must not contain devstate or game-version
                    !cls.contains("mod-card-devstate") && !cls.contains("mod-card-game-version")
                })
                .map(|s| {
                    s.text().collect::<String>()
                        .trim()
                        .trim_start_matches('v')
                        .to_string()
                })
                .unwrap_or_default();

            // Clean mod name: strip all h5 span texts from full h5 text
            let full_title: String = title_el.text().collect();
            let mut name = full_title;
            for t in &h5_span_texts {
                name = name.replace(t.as_str(), "");
            }
            let name = name.trim().to_string();
            if name.is_empty() { return None; }

            // Author: "by AuthorName" strip prefix
            let author = card
                .select(&author_sel)
                .next()
                .map(|p| p.text().collect::<String>().trim().trim_start_matches("by ").to_string())
                .unwrap_or_default();

            // Description: first non-muted p
            let description = card
                .select(&desc_sel)
                .next()
                .map(|p| p.text().collect::<String>().trim().to_string())
                .unwrap_or_default();

            // Devstate from card-body (1=Beta 2=Stable 3=Deprecated 4=Abandoned)
            let devstate = card
                .select(&devstate_sel)
                .find_map(|s| {
                    let cls = s.value().attr("class").unwrap_or("");
                    if      cls.contains("mod-card-devstate-1") { Some(1i32) }
                    else if cls.contains("mod-card-devstate-2") { Some(2) }
                    else if cls.contains("mod-card-devstate-3") { Some(3) }
                    else if cls.contains("mod-card-devstate-4") { Some(4) }
                    else { None }
                })
                .unwrap_or(0);

            // Game version range from card-body (e.g. "0.8.2 – 0.8.4")
            let game_version = card
                .select(&game_ver_sel)
                .next()
                .map(|el| {
                    // text() includes SVG text nodes — grab only text, skip SVG
                    el.text()
                        .collect::<String>()
                        .trim()
                        .to_string()
                })
                .unwrap_or_default();

            // Category tags: card-body spans that are not devstate or game-version
            let category = card
                .select(&tag_sel)
                .filter(|el| {
                    let cls = el.value().attr("class").unwrap_or("");
                    !cls.contains("mod-card-devstate") && !cls.contains("mod-card-game-version")
                })
                .map(|el| el.text().collect::<String>().trim().to_string())
                .filter(|s| !s.is_empty())
                .collect::<Vec<_>>()
                .join(", ");

            // Updated at — ISO date from data-utc-date attribute
            let updated_at = card
                .select(&updated_sel)
                .next()
                .and_then(|el| el.value().attr("data-utc-date"))
                .map(|s| s.to_string());

            // Stats numbers: [downloads, favorites, approval_pct]
            let stats_nums: Vec<String> = card
                .select(&stats_nums_sel)
                .map(|el| el.text().collect::<String>().trim().to_string())
                .collect();

            let downloads = stats_nums.first()
                .and_then(|s| s.parse::<i64>().ok())
                .unwrap_or(0);
            let favorites = stats_nums.get(1)
                .and_then(|s| s.parse::<i64>().ok())
                .unwrap_or(0);
            let approval_pct = stats_nums.get(2)
                .and_then(|s| s.trim_end_matches('%').parse::<i32>().ok())
                .unwrap_or(-1);

            // Thumbnail
            let thumbnail = card
                .select(&thumb_sel)
                .next()
                .and_then(|img| img.value().attr("src"))
                .map(|src| {
                    if src.starts_with("http") { src.to_string() }
                    else { format!("{}{}", BASE_URL, src) }
                });

            let current_rank = *rank;
            *rank += 1;

            Some(Mod {
                id,
                name,
                author,
                description,
                category,
                devstate,
                game_version,
                scrape_rank: current_rank,
                version_available,
                version_installed: None,
                updated_at,
                downloads,
                favorites,
                approval_pct,
                url,
                thumbnail,
                is_installed: false,
                last_scraped_at: Some(now.clone()),
            })
        })
        .collect()
}

pub async fn resolve_download_url(
    client: &reqwest::Client,
    mod_page_url: &str,
) -> Result<String, String> {
    let html = client
        .get(mod_page_url)
        .send().await.map_err(|e| format!("Erro ao acessar {}: {}", mod_page_url, e))?
        .text().await.map_err(|e| e.to_string())?;

    let doc = Html::parse_document(&html);
    let sel = Selector::parse("a.mod-download-trigger")
        .map_err(|e| format!("Erro de seletor: {}", e))?;

    let download_path = doc.select(&sel).next()
        .and_then(|el| el.value().attr("href"))
        .ok_or_else(|| format!("Link de download não encontrado em {}", mod_page_url))?;

    Ok(format!("{}{}", BASE_URL, download_path))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stats_selectors() {
        use scraper::{Html, Selector};
        let html = r#"<a class="card mod-card" href="/Mod/4/Test">
            <div class="mod-card-content">
                <h5 class="card-title mod-card-title">Test<span class="mod-card-tag">v1.0</span></h5>
                <div class="card-body">
                    <p class="text-muted">by Author</p>
                    <p>Desc</p>
                    <div>
                        <span class="mod-card-tag mod-card-devstate-2">Stable</span>
                        <span class="mod-card-tag mod-card-game-version">0.8.4</span>
                        <span class="mod-card-tag">UI</span>
                    </div>
                </div>
            </div>
            <div class="stats d-flex">
                <div class="d-flex align-items-center gap-1">
                    <svg></svg>
                    <div><span class="time-ago" data-utc-date="2026-05-08T14:36:28Z" data-type="updated">2h</span></div>
                </div>
                <div class="d-flex align-items-center gap-3">
                    <div class="d-flex align-items-center"><svg></svg><div>2705</div></div>
                    <div class="d-flex align-items-center"><svg></svg><div>81</div></div>
                    <div class="d-flex align-items-center"><svg></svg><div>85%</div></div>
                </div>
            </div>
        </a>"#;

        let mut rank = 0i32;
        let mods = parse_cards(html, &mut rank);
        assert_eq!(mods.len(), 1, "expected 1 mod");
        let m = &mods[0];
        assert_eq!(m.updated_at.as_deref(), Some("2026-05-08T14:36:28Z"),
            "updated_at mismatch: {:?}", m.updated_at);
        assert_eq!(m.downloads, 2705, "downloads mismatch: {}", m.downloads);
        assert_eq!(m.favorites, 81,   "favorites mismatch: {}", m.favorites);
        assert_eq!(m.approval_pct, 85, "approval_pct mismatch: {}", m.approval_pct);
        assert_eq!(m.version_available, "1.0", "version mismatch: {}", m.version_available);
        assert_eq!(m.devstate, 2, "devstate mismatch: {}", m.devstate);
        assert_eq!(m.game_version, "0.8.4", "game_version mismatch: {}", m.game_version);
    }
}
