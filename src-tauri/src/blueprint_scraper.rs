use crate::models::Blueprint;
use chrono::Utc;
use scraper::{Html, Selector};

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

    for card in doc.select(&card_sel) {
        let name = card
            .select(&title_sel)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        let card_text: String = card
            .select(&text_sel)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .unwrap_or_default();
        let author = if card_text.starts_with("by ") {
            card_text[3..].to_string()
        } else {
            card_text
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

        let id = url
            .rsplit('/')
            .next()
            .unwrap_or_default()
            .to_string();

        let description = card
            .select(&overlay_desc_sel)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        let mut downloads = 0i64;
        let mut favorites = 0i64;
        let mut approval_pct = -1i32;

        for (i, stat_div) in card.select(&stats_sel).enumerate() {
            let val: String = stat_div
                .select(&Selector::parse("div:last-child").unwrap())
                .next()
                .map(|e| e.text().collect::<String>().trim().to_string())
                .unwrap_or_default();
            match i {
                0 => downloads = val.parse().unwrap_or(0),
                1 => favorites = val.parse().unwrap_or(0),
                2 => {} // rating stars, skip
                3 => approval_pct = val.trim_end_matches('%').parse().unwrap_or(-1),
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
            approval_pct,
            updated_at,
            url,
            is_downloaded: false,
            last_scraped_at: Some(now),
        });
    }

    blueprints
}

pub async fn scrape_blueprints_page(
    client: &reqwest::Client,
    page: u32,
) -> Result<Vec<Blueprint>, String> {
    let url = format!(
        "https://hub.coigame.com/Blueprints/Search?page={}&orderBy=updated&timeRange=all-time",
        page
    );

    let resp = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let body = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read body: {}", e))?;

    Ok(parse_blueprint_cards(&body))
}

pub async fn scrape_all_blueprints() -> Result<Vec<Blueprint>, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;

    let mut all = Vec::new();
    let page1 = scrape_blueprints_page(&client, 1).await?;
    all.extend(page1);

    let mut page = 2;
    loop {
        let results = scrape_blueprints_page(&client, page).await?;
        if results.is_empty() {
            break;
        }
        let len = results.len();
        all.extend(results);
        if len < 20 {
            break;
        }
        page += 1;
    }

    Ok(all)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_fetch_blueprints_page() {
        let client = reqwest::Client::new();
        let result = scrape_blueprints_page(&client, 1).await;
        assert!(result.is_ok(), "Failed to fetch blueprints: {:?}", result.err());
        let blueprints = result.unwrap();
        assert!(!blueprints.is_empty(), "Expected at least one blueprint");
        println!("Fetched {} blueprints", blueprints.len());
        for bp in &blueprints[..3] {
            println!("  - {} by {} (id={})", bp.name, bp.author, bp.id);
        }
    }
}
