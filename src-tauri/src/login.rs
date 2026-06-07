use crate::db::Database;
use reqwest::cookie::{CookieStore, Jar};
use std::sync::Arc;
use url::Url;

const AUTH_COOKIES_KEY: &str = "auth_cookies";
const HUB_DOMAIN: &str = "https://coigame.com";
const LOGIN_PAGE: &str = "https://coigame.com/Account/Login";

pub async fn get_stored_cookies(db: &Database) -> Result<Option<String>, String> {
    db.get_setting(AUTH_COOKIES_KEY)
        .await
        .map_err(|e| e.to_string())
}

pub async fn store_cookies(db: &Database, cookies: &str) -> Result<(), String> {
    db.set_setting(AUTH_COOKIES_KEY, cookies)
        .await
        .map_err(|e| e.to_string())
}

pub async fn clear_cookies(db: &Database) -> Result<(), String> {
    db.set_setting(AUTH_COOKIES_KEY, "")
        .await
        .map_err(|e| e.to_string())
}

pub fn login_url() -> &'static str {
    LOGIN_PAGE
}

pub async fn is_logged_in(db: &Database) -> bool {
    match get_stored_cookies(db).await {
        Ok(Some(c)) => !c.is_empty(),
        _ => false,
    }
}

pub async fn process_magic_link(link: &str) -> Result<String, String> {
    let jar = Arc::new(Jar::default());
    let client = reqwest::Client::builder()
        .user_agent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        )
        .cookie_provider(jar.clone())
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let resp = client
        .get(link)
        .send()
        .await
        .map_err(|e| format!("Failed to access magic link: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Magic link returned HTTP {}",
            resp.status().as_u16()
        ));
    }

    let hub_url = Url::parse(HUB_DOMAIN).map_err(|e| e.to_string())?;

    let cookies = jar
        .cookies(&hub_url)
        .and_then(|hv| hv.to_str().ok().map(|s| s.to_string()))
        .unwrap_or_default();

    if cookies.is_empty() {
        return Err(
            "No cookies received — the magic link may be invalid or expired.".to_string(),
        );
    }

    Ok(cookies)
}

async fn build_auth_client(
    db: &Database,
) -> Result<(reqwest::Client, Arc<Jar>), String> {
    let cookies = get_stored_cookies(db)
        .await?
        .filter(|c| !c.is_empty())
        .ok_or_else(|| "Not logged in".to_string())?;

    let jar = Arc::new(Jar::default());
    let hub_url = Url::parse(HUB_DOMAIN).map_err(|e| e.to_string())?;
    for cookie_str in cookies.split("; ") {
        jar.add_cookie_str(cookie_str, &hub_url);
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")
        .cookie_provider(jar.clone())
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| e.to_string())?;

    Ok((client, jar))
}

pub async fn make_auth_request(
    db: &Database,
    url: &str,
) -> Result<reqwest::Response, String> {
    let (client, _) = build_auth_client(db).await?;
    client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Auth request failed: {}", e))
}

async fn fetch_page_data(client: &reqwest::Client, page_url: &str) -> Result<(String, String), String> {
    let html = client
        .get(page_url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch page: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Failed to read page body: {}", e))?;

    let antiforgery_re = regex::Regex::new(
        r#"<input[^>]*name=["']__RequestVerificationToken["'][^>]*value=["']([^"']+)["']"#,
    )
    .map_err(|e| e.to_string())?;
    let token = antiforgery_re
        .captures(&html)
        .and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
        .ok_or_else(|| "Could not find anti-forgery token on the page".to_string())?;

    let entity_re = regex::Regex::new(
        r#"<input[^>]*id=["']entityId["'][^>]*value=["'](\d+)["']"#,
    )
    .map_err(|e| e.to_string())?;
    let entity_id = entity_re
        .captures(&html)
        .and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
        .ok_or_else(|| "Could not find entity ID on the page".to_string())?;

    Ok((entity_id, token))
}

pub async fn vote_map(db: &Database, map_url: &str, rating: u8) -> Result<(), String> {
    let (client, _) = build_auth_client(db).await?;
    let (entity_id, token) = fetch_page_data(&client, map_url).await?;

    let body = url::form_urlencoded::Serializer::new(String::new())
        .append_pair("id", &entity_id)
        .append_pair("rating", &rating.to_string())
        .append_pair("__RequestVerificationToken", &token)
        .finish();
    let resp = client
        .post(format!("{}/Map/Rate", HUB_DOMAIN))
        .header(reqwest::header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await
        .map_err(|e| format!("Vote request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Vote returned HTTP {}", resp.status().as_u16()));
    }

    Ok(())
}

pub async fn favorite_map(db: &Database, map_url: &str) -> Result<(), String> {
    let (client, _) = build_auth_client(db).await?;
    let (entity_id, token) = fetch_page_data(&client, map_url).await?;

    let body = url::form_urlencoded::Serializer::new(String::new())
        .append_pair("id", &entity_id)
        .append_pair("__RequestVerificationToken", &token)
        .finish();
    let resp = client
        .post(format!("{}/Map/ToggleFavorite", HUB_DOMAIN))
        .header(reqwest::header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await
        .map_err(|e| format!("Favorite request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Favorite returned HTTP {}", resp.status().as_u16()));
    }

    Ok(())
}
