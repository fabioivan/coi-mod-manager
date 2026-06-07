use crate::models::MapItem;
use chrono::Utc;
use regex::Regex;
use scraper::{Html, Selector};
use std::collections::HashMap;

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct MapDetails {
    pub id: String,
    pub name: String,
    pub author: String,
    pub description_html: String,
    pub thumbnail: Option<String>,
    pub screenshots: Vec<String>,
    pub downloads: i64,
    pub favorites: i64,
    pub approval_pct: i32,
    pub vote_count: i64,
    pub updated_at: Option<String>,
    pub created_at: Option<String>,
    pub url: String,
    pub download_url: Option<String>,
    pub map_size: Option<String>,
    pub resources: Vec<MapResource>,
    pub versions: Vec<MapVersion>,
    pub starting_locations: Vec<MapStartingLocation>,
    pub comments: Vec<MapComment>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct MapComment {
    pub author: String,
    pub author_url: String,
    pub text: String,
    pub created_ago: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct MapResource {
    pub name: String,
    pub amount: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct MapVersion {
    pub version: String,
    pub download_url: String,
    pub release_date: String,
    pub downloads: i64,
    pub is_current: bool,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct MapStartingLocation {
    pub difficulty: String,
    pub description: String,
}

const ORDER_BY: &[&str] = &[
    "popularity",
    "score",
    "latest",
    "updated",
    "downloads",
    "favorites",
];
const TIME_RANGE: &[&str] = &["all-time", "past-week", "past-month", "past-year"];

fn parse_map_cards(html: &str) -> Vec<MapItem> {
    let doc = Html::parse_document(html);
    let mut maps = Vec::new();

    let card_sel = Selector::parse(".thumbnails .card").unwrap();
    let title_sel = Selector::parse("h5.card-title").unwrap();
    let text_sel = Selector::parse(".card-text").unwrap();
    let img_sel = Selector::parse("img.card-img-top").unwrap();
    let stats_sel = Selector::parse(".stats > div").unwrap();
    let link_sel = Selector::parse("a[href^='/Map/Detail/']").unwrap();
    let overlay_desc_sel = Selector::parse(".overlay p").unwrap();
    let stat_val_sel = Selector::parse("div:last-child").unwrap();

    for card in doc.select(&card_sel) {
        let name = card
            .select(&title_sel)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        if name.is_empty() {
            continue;
        }

        let card_text: String = card
            .select(&text_sel)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .unwrap_or_default();
        let author = if card_text.starts_with("by ") {
            let without_by = &card_text[3..];
            if let Some(on_pos) = without_by.rfind(" on") {
                without_by[..on_pos].trim().to_string()
            } else {
                without_by.trim().to_string()
            }
        } else {
            card_text.trim().to_string()
        };

        let thumbnail = card
            .select(&img_sel)
            .next()
            .and_then(|e| e.value().attr("src"))
            .map(|s| {
                if s.starts_with('h') {
                    s.to_string()
                } else {
                    format!("https://hub.coigame.com{}", s)
                }
            });

        let url = card
            .select(&link_sel)
            .next()
            .and_then(|e| e.value().attr("href"))
            .map(|s| format!("https://hub.coigame.com{}", s))
            .unwrap_or_default();

        if url.is_empty() {
            continue;
        }

        let id = url.rsplit('/').next().unwrap_or_default().to_string();
        if id.is_empty() {
            continue;
        }

        let description = card
            .select(&overlay_desc_sel)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        let mut downloads = 0i64;
        let mut favorites = 0i64;
        let mut comment_count = 0i64;
        let mut approval_pct = -1i32;
        for (i, stat_div) in card.select(&stats_sel).enumerate() {
            let val: String = stat_div
                .select(&stat_val_sel)
                .next()
                .map(|e| e.text().collect::<String>().trim().to_string())
                .unwrap_or_default();
            match i {
                0 => downloads = val.replace(',', "").parse::<i64>().unwrap_or(0),
                1 => favorites = val.replace(',', "").parse::<i64>().unwrap_or(0),
                2 => comment_count = val.replace(',', "").parse::<i64>().unwrap_or(0),
                3 => {
                    approval_pct = val
                        .trim_end_matches('%')
                        .trim()
                        .parse::<i32>()
                        .unwrap_or(-1)
                }
                _ => {}
            }
        }

        let now = Utc::now().to_rfc3339();
        maps.push(MapItem {
            id,
            name,
            author,
            description,
            thumbnail,
            downloads,
            favorites,
            comment_count,
            approval_pct,
            updated_at: None,
            url,
            is_downloaded: false,
            last_scraped_at: Some(now),
        });
    }

    maps
}

async fn fetch_page(
    client: &reqwest::Client,
    order_by: &str,
    time_range: &str,
) -> Result<Vec<MapItem>, String> {
    let url = format!(
        "https://hub.coigame.com/Maps/Search?orderBy={}&timeRange={}",
        order_by, time_range
    );

    let resp = client
        .get(&url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let body = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read body: {}", e))?;

    Ok(parse_map_cards(&body))
}

pub async fn scrape_all_maps() -> Result<Vec<MapItem>, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;

    let mut seen: HashMap<String, MapItem> = HashMap::new();

    for order_by in ORDER_BY {
        for time_range in TIME_RANGE {
            match fetch_page(&client, order_by, time_range).await {
                Ok(maps) => {
                    for m in maps {
                        seen.entry(m.id.clone()).or_insert(m);
                    }
                }
                Err(e) => {
                    eprintln!("[map_scraper] {}/{}: {}", order_by, time_range, e);
                }
            }
        }
    }

    Ok(seen.into_values().collect())
}

fn rewrite_urls(html: &str) -> String {
    html.replace("src=\"/", "src=\"https://hub.coigame.com/")
        .replace(
            "data-full-src=\"/",
            "data-full-src=\"https://hub.coigame.com/",
        )
        .replace("href=\"/", "href=\"https://hub.coigame.com/")
}

pub async fn scrape_map_details(client: &reqwest::Client, url: &str) -> Result<MapDetails, String> {
    let resp = client
        .get(url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let body = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read body: {}", e))?;

    let doc = Html::parse_document(&body);

    let name_sel = Selector::parse("h1").unwrap();
    let name = doc
        .select(&name_sel)
        .next()
        .map(|e| e.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    let desc_sel = Selector::parse(".description").unwrap();
    let description_html = doc
        .select(&desc_sel)
        .next()
        .map(|e| rewrite_urls(&e.html()))
        .unwrap_or_default();

    let mut screenshots: Vec<String> = Vec::new();
    let gallery_re = Regex::new(r#"medium:\s*'([^']+)'"#).unwrap();
    for cap in gallery_re.captures_iter(&body) {
        let src = cap[1].to_string();
        let abs = if src.starts_with('h') {
            src
        } else {
            format!("https://hub.coigame.com{}", src)
        };
        if !screenshots.contains(&abs) {
            screenshots.push(abs);
        }
    }

    if screenshots.is_empty() {
        if let Some(desc_el) = doc.select(&desc_sel).next() {
            let img_sel = Selector::parse("img").unwrap();
            for img in desc_el.select(&img_sel) {
                if let Some(src) = img.value().attr("src") {
                    let abs_src = if src.starts_with('h') {
                        src.to_string()
                    } else {
                        format!("https://hub.coigame.com{}", src)
                    };
                    if !screenshots.contains(&abs_src) {
                        screenshots.push(abs_src);
                    }
                }
            }
        }
    }

    if screenshots.is_empty() {
        let og_image_sel = Selector::parse(r#"meta[property="og:image"]"#).unwrap();
        if let Some(el) = doc.select(&og_image_sel).next() {
            if let Some(content) = el.value().attr("content") {
                let abs = if content.starts_with('h') {
                    content.to_string()
                } else {
                    format!("https://hub.coigame.com{}", content)
                };
                if !screenshots.contains(&abs) {
                    screenshots.push(abs);
                }
            }
        }
    }

    let meta_col_sel = Selector::parse(".meta .col").unwrap();
    let div_sel = Selector::parse("div").unwrap();
    let strong_sel = Selector::parse("strong").unwrap();
    let author_link_sel = Selector::parse("a").unwrap();

    let mut author = String::new();
    let mut downloads: i64 = 0;
    let mut approval_pct: i32 = -1;
    let mut vote_count: i64 = 0;
    let mut favorites: i64 = 0;
    let mut updated_at: Option<String> = None;
    let mut created_at: Option<String> = None;

    for col in doc.select(&meta_col_sel) {
        let label: String = col
            .select(&strong_sel)
            .next()
            .map(|s| s.text().collect::<String>().trim().to_string())
            .unwrap_or_default();
        match label.as_str() {
            "Author" => {
                author = col
                    .select(&author_link_sel)
                    .next()
                    .map(|a| a.text().collect::<String>().trim().to_string())
                    .unwrap_or_default();
            }
            "Downloads" => {
                let val = col
                    .select(&div_sel)
                    .next()
                    .map(|d| d.text().collect::<String>().trim().to_string())
                    .unwrap_or_default();
                downloads = val.replace(',', "").parse().unwrap_or(0);
            }
            "Votes Score" => {
                let val = col
                    .select(&div_sel)
                    .next()
                    .map(|d| d.text().collect::<String>().trim().to_string())
                    .unwrap_or_default();
                approval_pct = val.trim_end_matches('%').parse().unwrap_or(-1);
            }
            "Votes" => {
                let val = col
                    .select(&div_sel)
                    .next()
                    .map(|d| d.text().collect::<String>().trim().to_string())
                    .unwrap_or_default();
                vote_count = val.replace(',', "").parse().unwrap_or(0);
            }
            "Favorited" => {
                let val = col
                    .select(&div_sel)
                    .next()
                    .map(|d| d.text().collect::<String>().trim().to_string())
                    .unwrap_or_default();
                favorites = val.replace(',', "").parse().unwrap_or(0);
            }
            "Updated" => {
                let val = col
                    .select(&div_sel)
                    .next()
                    .map(|d| d.text().collect::<String>().trim().to_string())
                    .unwrap_or_default();
                if !val.is_empty() {
                    updated_at = Some(val);
                }
            }
            "Created" => {
                let val = col
                    .select(&div_sel)
                    .next()
                    .map(|d| d.text().collect::<String>().trim().to_string())
                    .unwrap_or_default();
                if !val.is_empty() {
                    created_at = Some(val);
                }
            }
            _ => {}
        }
    }

    let dl_sel = Selector::parse("a[href^='/Map/DownloadMap/']").unwrap();
    let download_url = {
        doc.select(&dl_sel)
            .next()
            .and_then(|e| e.value().attr("href"))
            .map(|s| format!("https://hub.coigame.com{}", s))
    };

    let map_size = {
        let table_wrapper_sel = Selector::parse(".table-responsive").unwrap();
        let thead_th_sel = Selector::parse("thead th").unwrap();
        let td_sel = Selector::parse("td").unwrap();
        let mut size: Option<String> = None;
        for table in doc.select(&table_wrapper_sel) {
            let header: String = table
                .select(&thead_th_sel)
                .flat_map(|e| e.text().collect::<Vec<_>>())
                .collect();
            if header.contains("Map Details") {
                let cells: Vec<String> = table
                    .select(&td_sel)
                    .map(|e| e.text().collect::<String>().trim().to_string())
                    .collect();
                let mut i = 0;
                while i + 1 < cells.len() {
                    if cells[i] == "Map size:" {
                        size = Some(cells[i + 1].clone());
                        break;
                    }
                    i += 2;
                }
                break;
            }
        }
        size
    };

    let mut resources = Vec::new();
    let resource_table_sel = Selector::parse(".table-responsive table tbody tr").unwrap();
    let table_wrapper_sel = Selector::parse(".table-responsive").unwrap();
    let thead_th_sel = Selector::parse("thead th").unwrap();
    let td_sel = Selector::parse("td").unwrap();
    let resource_tables = doc.select(&table_wrapper_sel);
    let mut found_resource_table = false;
    for table in resource_tables {
        let header = table.select(&thead_th_sel);
        let header_text: String = header.flat_map(|e| e.text().collect::<Vec<_>>()).collect();
        if header_text.contains("Total resources") {
            found_resource_table = true;
            for row in table.select(&resource_table_sel) {
                let cells: Vec<String> = row
                    .select(&td_sel)
                    .map(|e| e.text().collect::<String>().trim().to_string())
                    .collect();
                if cells.len() >= 2 {
                    resources.push(MapResource {
                        name: cells[0].clone(),
                        amount: cells[1].clone(),
                    });
                }
            }
            break;
        }
    }
    if !found_resource_table {
        let resource_rows = doc.select(&resource_table_sel);
        let rows: Vec<_> = resource_rows.collect();
        if rows.len() >= 2 {
            let first_cells: Vec<String> = rows[0]
                .select(&td_sel)
                .map(|e| e.text().collect::<String>().trim().to_string())
                .collect();
            if first_cells.len() == 2 && first_cells[0] != "Map size:" {
                for row in &rows {
                    let cells: Vec<String> = row
                        .select(&td_sel)
                        .map(|e| e.text().collect::<String>().trim().to_string())
                        .collect();
                    if cells.len() >= 2 {
                        resources.push(MapResource {
                            name: cells[0].clone(),
                            amount: cells[1].clone(),
                        });
                    }
                }
            }
        }
    }

    let mut versions = Vec::new();
    let version_rows_sel = Selector::parse("tr.version-row").unwrap();
    for row in doc.select(&version_rows_sel) {
        let cells: Vec<String> = row
            .select(&td_sel)
            .map(|e| e.text().collect::<String>().trim().to_string())
            .collect();
        let dl_link = row
            .select(&dl_sel)
            .next()
            .and_then(|e| e.value().attr("href"))
            .map(|s| format!("https://hub.coigame.com{}", s));
        if cells.len() >= 4 {
            let version = cells[0].trim().to_string();
            let release_date = cells[2].clone();
            let dls = cells[3].replace(',', "").parse::<i64>().unwrap_or(0);
            let is_current = cells[0].contains("(CURRENT)");
            versions.push(MapVersion {
                version: version.clone(),
                download_url: dl_link.unwrap_or_default(),
                release_date,
                downloads: dls,
                is_current,
            });
        }
    }

    let mut starting_locations = Vec::new();
    let mut current_difficulty = String::new();

    let starting_heading = Selector::parse("h2").unwrap();
    let mut in_starting = false;
    for h2 in doc.select(&starting_heading) {
        let h2_text = h2.text().collect::<String>();
        if h2_text.contains("Starting locations") {
            in_starting = true;
            continue;
        }
        if in_starting && (h2_text.contains("Description") || h2_text.contains("Earlier Versions"))
        {
            break;
        }
        if !in_starting {
            continue;
        }
    }

    if in_starting {
        let starting_container_sel = Selector::parse(".darkerGreyBg").unwrap();
        for container in doc.select(&starting_container_sel) {
            // Determine whether this container follows an <h2> that contains "Starting locations"
            let is_starting = {
                let container_html = container.html();
                if let Some(pos) = body.find(&container_html) {
                    if let Some(h2_start) = body[..pos].rfind("<h2") {
                        if let Some(h2_end_rel) = body[h2_start..].find("</h2>") {
                            let h2_slice = &body[h2_start..h2_start + h2_end_rel + 4];
                            h2_slice.contains("Starting locations")
                        } else {
                            false
                        }
                    } else {
                        false
                    }
                } else {
                    false
                }
            };
            if !is_starting {
                continue;
            }
            let _bold_sel = Selector::parse("p[style*='font-weight:bold;'], p > strong").unwrap();
            let p_sel = Selector::parse("p").unwrap();
            for (_i, p_el) in container.select(&p_sel).enumerate() {
                let p_text = p_el.text().collect::<String>().trim().to_string();
                if p_text.is_empty() {
                    continue;
                }
                let style = p_el.value().attr("style").unwrap_or("");
                if style.contains("font-weight:bold")
                    || p_text.chars().next().map_or(false, |c| c.is_ascii_digit())
                {
                    current_difficulty = p_text.clone();
                } else if !current_difficulty.is_empty() && !p_text.starts_with("Default") {
                    starting_locations.push(MapStartingLocation {
                        difficulty: current_difficulty.clone(),
                        description: p_text,
                    });
                }
            }
        }
    }

    let mut comments = Vec::new();
    let comment_sel = Selector::parse(".comment").unwrap();
    let comment_author_sel = Selector::parse(".author_meta a.fw-bolder").unwrap();
    let comment_text_sel = Selector::parse(".comment_text").unwrap();
    let comment_time_sel = Selector::parse(".time-ago").unwrap();
    for comment_el in doc.select(&comment_sel) {
        let author = comment_el
            .select(&comment_author_sel)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .unwrap_or_default();
        let author_url = comment_el
            .select(&comment_author_sel)
            .next()
            .and_then(|e| e.value().attr("href"))
            .map(|s| format!("https://hub.coigame.com{}", s))
            .unwrap_or_default();
        let text = comment_el
            .select(&comment_text_sel)
            .next()
            .map(|e| e.inner_html())
            .unwrap_or_default();
        let created_ago = comment_el
            .select(&comment_time_sel)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .unwrap_or_default();
        if !author.is_empty() {
            comments.push(MapComment {
                author,
                author_url,
                text,
                created_ago,
            });
        }
    }

    let thumbnail = screenshots.first().cloned();
    let id = url.rsplit('/').next().unwrap_or_default().to_string();

    Ok(MapDetails {
        id,
        name,
        author,
        description_html,
        thumbnail,
        screenshots,
        downloads,
        favorites,
        approval_pct,
        vote_count,
        updated_at,
        created_at,
        url: url.to_string(),
        download_url,
        map_size,
        resources,
        versions,
        starting_locations,
        comments,
    })
}
