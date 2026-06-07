use crate::models::Blueprint;
use chrono::Utc;
use regex::Regex;
use scraper::{Html, Selector};
use std::collections::HashMap;

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct BlueprintDetails {
    pub id: String,
    pub name: String,
    pub author: String,
    pub description_html: String,
    pub thumbnail: Option<String>,
    pub screenshots: Vec<String>,
    pub blueprint_data: Option<String>,
    pub downloads: i64,
    pub favorites: i64,
    pub approval_pct: i32,
    pub updated_at: Option<String>,
    pub url: String,
}

// Todas as combinações disponíveis no site
const ORDER_BY: &[&str] = &[
    "popularity",
    "score",
    "latest",
    "updated",
    "downloads",
    "favorites",
];
const TIME_RANGE: &[&str] = &["all-time", "past-week", "past-month", "past-year"];

fn parse_blueprint_cards(html: &str) -> Vec<Blueprint> {
    let doc = Html::parse_document(html);
    let mut blueprints = Vec::new();

    let card_sel = Selector::parse(".thumbnails .card").unwrap();
    let title_sel = Selector::parse("h5.card-title").unwrap();
    let text_sel = Selector::parse(".card-text").unwrap();
    let time_sel = Selector::parse("span.time").unwrap();
    let img_sel = Selector::parse("img.card-img-top").unwrap();
    let stats_sel = Selector::parse(".stats > div").unwrap();
    let link_sel = Selector::parse("a[href^='/Blueprint/Detail/']").unwrap();
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

        // "by AuthorName on " → "AuthorName"
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

        let updated_at = card
            .select(&time_sel)
            .next()
            .and_then(|e| e.value().attr("data-utc-date"))
            .map(|s| s.to_string());

        let thumbnail = card
            .select(&img_sel)
            .next()
            .and_then(|e| e.value().attr("src"))
            .map(|s| {
                if s.starts_with("http") {
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

        // Stats: 4 divs — downloads, favorites, comments, approval%
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
        blueprints.push(Blueprint {
            id,
            name,
            author,
            description,
            thumbnail,
            downloads,
            favorites,
            comment_count,
            approval_pct,
            updated_at,
            url,
            is_downloaded: false,
            last_scraped_at: Some(now),
        });
    }

    blueprints
}

async fn fetch_page(
    client: &reqwest::Client,
    order_by: &str,
    time_range: &str,
) -> Result<Vec<Blueprint>, String> {
    let url = format!(
        "https://hub.coigame.com/Blueprints/Search?orderBy={}&timeRange={}",
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

    Ok(parse_blueprint_cards(&body))
}

/// Itera todas as combinações orderBy × timeRange para coletar o máximo de
/// blueprints únicos possível. O site não suporta paginação via ?page=N.
pub async fn scrape_all_blueprints() -> Result<Vec<Blueprint>, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;

    let mut seen: HashMap<String, Blueprint> = HashMap::new();

    for order_by in ORDER_BY {
        for time_range in TIME_RANGE {
            match fetch_page(&client, order_by, time_range).await {
                Ok(blueprints) => {
                    for bp in blueprints {
                        seen.entry(bp.id.clone()).or_insert(bp);
                    }
                }
                Err(e) => {
                    eprintln!("[blueprint_scraper] {}/{}: {}", order_by, time_range, e);
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

/// Extrai os detalhes de um blueprint individual (página de detalhes).
pub async fn scrape_blueprint_details(
    client: &reqwest::Client,
    url: &str,
) -> Result<BlueprintDetails, String> {
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

    // Nome do blueprint
    let name_sel = Selector::parse("h1").unwrap();
    let name = doc
        .select(&name_sel)
        .next()
        .map(|e| e.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    // Descrição HTML completa
    let desc_sel = Selector::parse(".description").unwrap();
    let description_html = doc
        .select(&desc_sel)
        .next()
        .map(|e| rewrite_urls(&e.html()))
        .unwrap_or_default();

    // Gallery images from JS imagesArray (hub carousel)
    let mut screenshots: Vec<String> = Vec::new();
    let gallery_re = Regex::new(r#"medium:\s*'([^']+)'"#).unwrap();
    for cap in gallery_re.captures_iter(&body) {
        let src = cap[1].to_string();
        let abs = if src.starts_with("http") {
            src
        } else {
            format!("https://hub.coigame.com{}", src)
        };
        if !screenshots.contains(&abs) {
            screenshots.push(abs);
        }
    }

    // Fallback: extrai <img> da descrição
    if screenshots.is_empty() {
        if let Some(desc_el) = doc.select(&desc_sel).next() {
            let img_sel = Selector::parse("img").unwrap();
            for img in desc_el.select(&img_sel) {
                if let Some(src) = img.value().attr("src") {
                    let abs_src = if src.starts_with("http") {
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

    // Fallback: og:image
    if screenshots.is_empty() {
        let og_image_sel = Selector::parse(r#"meta[property="og:image"]"#).unwrap();
        if let Some(el) = doc.select(&og_image_sel).next() {
            if let Some(content) = el.value().attr("content") {
                let abs = if content.starts_with("http") {
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

    // Meta: author, downloads, approval_pct, favorites
    let meta_col_sel = Selector::parse(".meta .col").unwrap();
    let div_sel = Selector::parse("div").unwrap();
    let strong_sel = Selector::parse("strong").unwrap();
    let author_link_sel = Selector::parse("a").unwrap();

    let mut author = String::new();
    let mut downloads: i64 = 0;
    let mut approval_pct: i32 = -1;
    let mut favorites: i64 = 0;
    let mut updated_at: Option<String> = None;

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
            _ => {}
        }
    }

    // Blueprint data (base64 do primeiro hidden div)
    let blueprint_data = {
        let data_re = Regex::new(r#"data-blueprint-data="([^"]+)""#).unwrap();
        data_re.captures(&body).map(|cap| cap[1].to_string())
    };

    // Thumbnail do card (ou primeira screenshot)
    let thumbnail = screenshots.first().cloned();

    // ID da URL
    let id = url.rsplit('/').next().unwrap_or_default().to_string();

    Ok(BlueprintDetails {
        id,
        name,
        author,
        description_html,
        thumbnail,
        screenshots,
        blueprint_data,
        downloads,
        favorites,
        approval_pct,
        updated_at,
        url: url.to_string(),
    })
}
