use crate::models::Mod;
use scraper::{Html, Selector};

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
            ("orderBy", order_by),
            ("timeRange", time_range),
            ("author", ""),
            ("query", ""),
            ("gameVersion", ""),
            ("devStates", "1"),
            ("devStates", "2"),
            ("devStatesExplicit", "true"),
            ("myFavorites", "false"),
            ("ignoreLibraries", "true"),
            ("ignoreClosedSource", "false"),
        ])
        .send()
        .await?
        .text()
        .await?;
    let batch = parse_cards(&html, &mut rank);
    let done = batch.len() < 20;
    all_mods.extend(batch);

    if !done {
        let mut page = 2u32;
        loop {
            let html = client
                .get(format!("{}/Mods/LoadMoreThumbnails", BASE_URL))
                .query(&[
                    ("orderBy", order_by),
                    ("timeRange", time_range),
                    ("author", ""),
                    ("query", ""),
                    ("gameVersion", ""),
                    ("devStates", "1"),
                    ("devStates", "2"),
                    ("devStatesExplicit", "true"),
                    ("myFavorites", "false"),
                    ("ignoreLibraries", "true"),
                    ("ignoreClosedSource", "false"),
                    ("page", &page.to_string()),
                ])
                .send()
                .await?
                .text()
                .await?;
            let batch = parse_cards(&html, &mut rank);
            let done = batch.len() < 20;
            all_mods.extend(batch);
            if done {
                break;
            }
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
    let title_sel = Selector::parse("h5.mod-card-title").unwrap();
    let h5_spans_sel = Selector::parse("h5.mod-card-title > span").unwrap();
    let mod_ver_sel = Selector::parse("h5.mod-card-title > span.mod-card-tag").unwrap();

    // Card-body items (devstate, game-version, category tags)
    let author_sel = Selector::parse(".card-body p.text-muted").unwrap();
    let desc_sel = Selector::parse(".card-body p:not(.text-muted)").unwrap();
    let devstate_sel = Selector::parse(".card-body span[class*='mod-card-devstate']").unwrap();
    let game_ver_sel = Selector::parse(".card-body .mod-card-game-version").unwrap();
    let tag_sel = Selector::parse(".card-body span.mod-card-tag").unwrap();

    // Stats bar
    let updated_sel = Selector::parse(".stats .time-ago[data-type='updated']").unwrap();
    // Os 3 divs no lado direito do stats: download, favorites, approval%
    let stats_nums_sel = Selector::parse(".stats > div:last-child > div > div:last-child").unwrap();

    // Thumbnail
    let thumb_sel = Selector::parse(".mod-card-icon img").unwrap();

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    doc.select(&card_sel)
        .filter_map(|card| {
            let href = card.value().attr("href")?;
            let id = href.split('/').nth(2)?.to_string();
            let url = format!("{}{}", BASE_URL, href);

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
                    s.text()
                        .collect::<String>()
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
            if name.is_empty() {
                return None;
            }

            // Author: "by AuthorName" strip prefix
            let author = card
                .select(&author_sel)
                .next()
                .map(|p| {
                    p.text()
                        .collect::<String>()
                        .trim()
                        .trim_start_matches("by ")
                        .to_string()
                })
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
                    if cls.contains("mod-card-devstate-1") {
                        Some(1i32)
                    } else if cls.contains("mod-card-devstate-2") {
                        Some(2)
                    } else if cls.contains("mod-card-devstate-3") {
                        Some(3)
                    } else if cls.contains("mod-card-devstate-4") {
                        Some(4)
                    } else {
                        None
                    }
                })
                .unwrap_or(0);

            // Game version range from card-body (e.g. "0.8.2 – 0.8.4")
            let game_version = card
                .select(&game_ver_sel)
                .next()
                .map(|el| {
                    // text() includes SVG text nodes — grab only text, skip SVG
                    el.text().collect::<String>().trim().to_string()
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

            let downloads = stats_nums
                .first()
                .and_then(|s| s.parse::<i64>().ok())
                .unwrap_or(0);
            let favorites = stats_nums
                .get(1)
                .and_then(|s| s.parse::<i64>().ok())
                .unwrap_or(0);
            let approval_pct = stats_nums
                .get(2)
                .and_then(|s| s.trim_end_matches('%').parse::<i32>().ok())
                .unwrap_or(-1);

            // Thumbnail
            let thumbnail = card
                .select(&thumb_sel)
                .next()
                .and_then(|img| img.value().attr("src"))
                .map(|src| {
                    if src.starts_with("http") {
                        src.to_string()
                    } else {
                        format!("{}{}", BASE_URL, src)
                    }
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
        .send()
        .await
        .map_err(|e| format!("Failed to access {}: {}", mod_page_url, e))?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    let doc = Html::parse_document(&html);

    let sel =
        Selector::parse("a.mod-download-trigger").map_err(|e| format!("Selector error: {}", e))?;

    let download_path = doc
        .select(&sel)
        .next()
        .and_then(|el| el.value().attr("href"))
        .ok_or_else(|| format!("Download link not found at {}", mod_page_url))?;

    Ok(format!("{}{}", BASE_URL, download_path))
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ModDetails {
    pub id: String,
    pub url: String,
    pub name: String,
    pub author: String,
    pub short_description: String,
    pub version_available: String,
    pub updated_at: String,
    pub license: Option<String>,
    pub source_code_url: Option<String>,
    pub zip_file_size: Option<String>,
    pub game_versions: String,
    pub save_game_add_ok: bool,
    pub save_game_remove_ok: bool,
    pub downloads: i64,
    pub favorites: i64,
    pub approval_pct: i32,
    pub description_html: String,
    pub screenshots: Vec<String>,
    pub websites: Vec<String>,
    pub tags: Vec<String>,
    pub capabilities: Vec<ModCapability>,
    pub announcements: Vec<Announcement>,
    pub versions: Vec<ModVersion>,
    pub changelogs: Vec<ChangelogEntry>,
    pub dependencies: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ModCapability {
    pub name: String,
    pub severity: String,
    pub description: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct Announcement {
    pub title: String,
    pub date: String,
    pub version: String,
    pub content_html: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ModVersion {
    pub version: String,
    pub latest: bool,
    pub download_url: String,
    pub downloads: i64,
    pub game_version: String,
    pub released_date: String,
    pub file_size: String,
    pub license: String,
    pub changelog: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ChangelogEntry {
    pub version: String,
    pub date: String,
    pub text: String,
}

pub async fn scrape_mod_details(
    client: &reqwest::Client,
    mod_url: &str,
) -> Result<ModDetails, String> {
    let html = client
        .get(mod_url)
        .send()
        .await
        .map_err(|e| format!("Failed to load mod {}: {}", mod_url, e))?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    let doc = Html::parse_document(&html);

    let id = mod_url
        .split('/')
        .nth(4)
        .ok_or_else(|| "Invalid mod URL".to_string())?
        .to_string();

    let h1_sel = Selector::parse(".mv2-header-center h1").unwrap();
    let version_tag_sel = Selector::parse(".mv2-header-center h1 span.mod-card-tag").unwrap();
    let author_sel = Selector::parse(".mv2-header-center .text-muted a").unwrap();
    let short_desc_sel = Selector::parse(".mv2-header-center .mv2-short-desc").unwrap();

    let info_pills_sel = Selector::parse(".mv2-header-center .info-pill").unwrap();
    let download_count_sel = Selector::parse("#downloadCountD").unwrap();

    let game_versions_sel = Selector::parse(".mv2-meta-bar .mv2-meta-item strong").unwrap();
    let save_compat_sel = Selector::parse(".mv2-save-compat").unwrap();
    let vote_percentage_sel = Selector::parse("#votePercentageD").unwrap();
    let favorites_count_sel = Selector::parse("#favoritesCount").unwrap();

    let tab_info_sel = Selector::parse("#tab-info").unwrap();
    let links_table_tr_sel = Selector::parse(".mv2-links-table tr").unwrap();
    let tags_sel = Selector::parse(".mod-tags-row a.mod-tag").unwrap();
    let description_sel = Selector::parse(".description").unwrap();
    let td_sel = Selector::parse("td").unwrap();
    let a_sel = Selector::parse("a").unwrap();
    let badge_sel = Selector::parse(".badge").unwrap();
    let h4_mb1_sel = Selector::parse("h4.mb-1").unwrap();
    let small_info_pill_sel = Selector::parse("small.text-muted span.info-pill").unwrap();
    let small_text_muted_sel = Selector::parse("small.text-muted").unwrap();
    let h4_mb2_sel = Selector::parse("h4.mb-2").unwrap();
    let pre_sel = Selector::parse("pre").unwrap();
    let time_ago_span_sel = Selector::parse(".mv2-header-center span.time-ago").unwrap();
    let h4_sel = Selector::parse("h4").unwrap();
    let info_pill_sel = Selector::parse(".info-pill").unwrap();
    let mod_download_trigger_sel = Selector::parse(".mod-download-trigger").unwrap();

    let full_h1_text = doc
        .select(&h1_sel)
        .next()
        .map(|el| el.text().collect::<String>())
        .unwrap_or_default();
    let version_available = doc
        .select(&version_tag_sel)
        .next()
        .map(|el| {
            el.text()
                .collect::<String>()
                .trim()
                .trim_start_matches('v')
                .to_string()
        })
        .unwrap_or_default();

    let name = if !version_available.is_empty() {
        full_h1_text
            .replace(&format!("v{}", version_available), "")
            .trim()
            .to_string()
    } else {
        full_h1_text.trim().to_string()
    };

    let author = doc
        .select(&author_sel)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    let short_description = doc
        .select(&short_desc_sel)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    let mut license = None;
    let mut source_code_url = None;
    for pill in doc.select(&info_pills_sel) {
        let title = pill.value().attr("title").unwrap_or("");
        if title == "License" {
            license = Some(pill.text().collect::<String>().trim().to_string());
        } else if title == "Source code" {
            source_code_url = pill.value().attr("href").map(|h| h.to_string());
        }
    }

    let file_size_sel = Selector::parse(".mv2-file-size strong").unwrap();
    let zip_file_size = doc
        .select(&file_size_sel)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string());

    let downloads = doc
        .select(&download_count_sel)
        .next()
        .and_then(|el| {
            el.text()
                .collect::<String>()
                .trim()
                .replace(',', "")
                .parse::<i64>()
                .ok()
        })
        .unwrap_or(0);

    let game_versions = doc
        .select(&game_versions_sel)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    let save_compat_text = doc
        .select(&save_compat_sel)
        .next()
        .map(|el| el.text().collect::<String>())
        .unwrap_or_default();
    let save_game_add_ok =
        save_compat_text.contains("Add ✓") || save_compat_text.contains("Add \u{2713}");
    let save_game_remove_ok =
        save_compat_text.contains("Remove ✓") || save_compat_text.contains("Remove \u{2713}");

    let approval_pct = doc
        .select(&vote_percentage_sel)
        .next()
        .and_then(|el| {
            el.text()
                .collect::<String>()
                .trim()
                .trim_end_matches('%')
                .parse::<i32>()
                .ok()
        })
        .unwrap_or(-1);

    let favorites = doc
        .select(&favorites_count_sel)
        .next()
        .and_then(|el| {
            el.text()
                .collect::<String>()
                .trim()
                .replace(',', "")
                .parse::<i64>()
                .ok()
        })
        .unwrap_or(0);

    let mut websites = Vec::new();
    for tr in doc.select(&links_table_tr_sel) {
        let cells: Vec<_> = tr.select(&td_sel).collect();
        if cells.len() >= 2 {
            let label = cells[0].text().collect::<String>().trim().to_string();
            if label == "Websites" || label == "Source code" {
                for a in cells[1].select(&a_sel) {
                    if let Some(href) = a.value().attr("href") {
                        websites.push(href.to_string());
                    }
                }
            }
        }
    }

    let tags = doc
        .select(&tags_sel)
        .map(|el| el.text().collect::<String>().trim().to_string())
        .collect::<Vec<_>>();

    let rewrite_urls = |html: &str| -> String {
        html.replace("src=\"/", "src=\"https://hub.coigame.com/")
            .replace(
                "data-full-src=\"/",
                "data-full-src=\"https://hub.coigame.com/",
            )
            .replace("href=\"/", "href=\"https://hub.coigame.com/")
    };

    let mut description_html = String::new();
    let mut screenshots = Vec::new();
    if let Some(tab_info) = doc.select(&tab_info_sel).next() {
        if let Some(desc_el) = tab_info.select(&description_sel).next() {
            let raw_desc_html = desc_el.html();
            description_html = rewrite_urls(&raw_desc_html);

            let img_sel = Selector::parse("img").unwrap();
            for img in desc_el.select(&img_sel) {
                if let Some(src) = img.value().attr("src") {
                    let abs_src = if src.starts_with("http") {
                        src.to_string()
                    } else {
                        format!("https://hub.coigame.com{}", src)
                    };
                    screenshots.push(abs_src);
                }
            }
        }
    }

    let mut capabilities = Vec::new();
    let cap_dt_sel = Selector::parse("#capabilitiesInfoModal dl.capability-list dt").unwrap();
    let cap_dd_sel = Selector::parse("#capabilitiesInfoModal dl.capability-list dd").unwrap();
    let mut dds = doc.select(&cap_dd_sel);
    for dt in doc.select(&cap_dt_sel) {
        if let Some(badge) = dt.select(&badge_sel).next() {
            let name = badge.text().collect::<String>().trim().to_string();
            let cls = badge.value().attr("class").unwrap_or("");
            let severity = if cls.contains("text-bg-warning") {
                "notable".to_string()
            } else if cls.contains("text-bg-danger") {
                "concerning".to_string()
            } else {
                "info".to_string()
            };
            let description = dds
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string())
                .unwrap_or_default();

            capabilities.push(ModCapability {
                name,
                severity,
                description,
            });
        }
    }

    let mut announcements = Vec::new();
    let announce_item_sel =
        Selector::parse("#tab-announcements .darkerGreyBg.p-3.rounded.mb-3").unwrap();
    for ann in doc.select(&announce_item_sel) {
        let title = ann
            .select(&h4_mb1_sel)
            .next()
            .map(|el| el.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        let mut version = String::new();
        if let Some(pill) = ann.select(&small_info_pill_sel).next() {
            version = pill.text().collect::<String>().trim().to_string();
        }

        let full_date_text = ann
            .select(&small_text_muted_sel)
            .next()
            .map(|el| el.text().collect::<String>())
            .unwrap_or_default();
        let date = full_date_text.replace(&version, "").trim().to_string();

        let desc_el = ann.select(&description_sel).next();
        let content_html = desc_el
            .map(|el| rewrite_urls(&el.html()))
            .unwrap_or_default();

        announcements.push(Announcement {
            title,
            date,
            version,
            content_html,
        });
    }

    let mut versions = Vec::new();
    let version_pane_sel = Selector::parse("#tab-versions .versionPane").unwrap();
    for pane in doc.select(&version_pane_sel) {
        let v_h4 = pane
            .select(&h4_sel)
            .next()
            .map(|el| el.text().collect::<String>().trim().to_string())
            .unwrap_or_default();
        if v_h4.is_empty() {
            continue;
        }

        let latest = pane
            .select(&info_pill_sel)
            .next()
            .map(|el| el.text().collect::<String>().trim().to_string() == "Latest")
            .unwrap_or(false);

        let download_url = pane
            .select(&mod_download_trigger_sel)
            .next()
            .and_then(|el| el.value().attr("href"))
            .map(|h| format!("https://hub.coigame.com{}", h))
            .unwrap_or_default();

        let v_download_count_sel = Selector::parse(".mv2-compound-count").unwrap();
        let downloads = pane
            .select(&v_download_count_sel)
            .next()
            .and_then(|el| {
                el.text()
                    .collect::<String>()
                    .trim()
                    .replace(',', "")
                    .parse::<i64>()
                    .ok()
            })
            .unwrap_or(0);

        let mut v_game_version = String::new();
        let mut v_released_date = String::new();
        let mut v_file_size = String::new();
        let mut v_license = String::new();

        let meta_tr_sel = Selector::parse(".mv2-version-meta tr").unwrap();
        for tr in pane.select(&meta_tr_sel) {
            let cells: Vec<_> = tr.select(&td_sel).collect();
            if cells.len() >= 2 {
                let key = cells[0].text().collect::<String>().trim().to_string();
                let val = cells[1].text().collect::<String>().trim().to_string();
                if key.contains("Game version") {
                    v_game_version = val;
                } else if key.contains("Released") {
                    v_released_date = val;
                } else if key.contains("File size") {
                    v_file_size = val;
                } else if key.contains("License") {
                    v_license = val;
                }
            }
        }

        let changelog = pane
            .select(&pre_sel)
            .next()
            .map(|el| el.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        versions.push(ModVersion {
            version: v_h4,
            latest,
            download_url,
            downloads,
            game_version: v_game_version,
            released_date: v_released_date,
            file_size: v_file_size,
            license: v_license,
            changelog,
        });
    }

    let mut changelogs = Vec::new();
    let changelog_item_sel =
        Selector::parse("#tab-changelog .darkerGreyBg.p-3.rounded.mb-3").unwrap();
    for ch in doc.select(&changelog_item_sel) {
        let full_title = ch
            .select(&h4_mb2_sel)
            .next()
            .map(|el| el.text().collect::<String>().trim().to_string())
            .unwrap_or_default();
        if full_title.is_empty() {
            continue;
        }

        let parts: Vec<&str> = full_title.split('|').collect();
        let version = parts
            .first()
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        let date = parts
            .get(1)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();

        let text = ch
            .select(&pre_sel)
            .next()
            .map(|el| el.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        changelogs.push(ChangelogEntry {
            version,
            date,
            text,
        });
    }

    let tab_dependencies_sel = Selector::parse("#tab-dependencies").unwrap();
    let dependencies = doc
        .select(&tab_dependencies_sel)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_else(|| "This mod has no dependencies.".to_string());

    let updated_at = doc
        .select(&time_ago_span_sel)
        .next()
        .and_then(|el| el.value().attr("data-utc-date"))
        .map(|s| s.to_string())
        .unwrap_or_default();

    Ok(ModDetails {
        id,
        url: mod_url.to_string(),
        name,
        author,
        short_description,
        version_available,
        updated_at,
        license,
        source_code_url,
        zip_file_size,
        game_versions,
        save_game_add_ok,
        save_game_remove_ok,
        downloads,
        favorites,
        approval_pct,
        description_html,
        screenshots,
        websites,
        tags,
        capabilities,
        announcements,
        versions,
        changelogs,
        dependencies,
    })
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
        assert_eq!(
            m.updated_at.as_deref(),
            Some("2026-05-08T14:36:28Z"),
            "updated_at mismatch: {:?}",
            m.updated_at
        );
        assert_eq!(m.downloads, 2705, "downloads mismatch: {}", m.downloads);
        assert_eq!(m.favorites, 81, "favorites mismatch: {}", m.favorites);
        assert_eq!(
            m.approval_pct, 85,
            "approval_pct mismatch: {}",
            m.approval_pct
        );
        assert_eq!(
            m.version_available, "1.0",
            "version mismatch: {}",
            m.version_available
        );
        assert_eq!(m.devstate, 2, "devstate mismatch: {}", m.devstate);
        assert_eq!(
            m.game_version, "0.8.4",
            "game_version mismatch: {}",
            m.game_version
        );
    }
}
