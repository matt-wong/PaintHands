mod voice;

use serde::Serialize;
use serde_json::Value;

#[derive(Serialize)]
struct ImageResult {
    id: String,
    title: String,
    thumbnail: String,
    url: String,
    creator: String,
    source: String,
    page_url: String,
}

#[derive(Serialize)]
struct SearchResponse {
    results: Vec<ImageResult>,
    errors: Vec<String>,
}

fn text(value: &Value) -> String {
    value.as_str().unwrap_or_default().to_string()
}

// API keys are read from .env here so they never reach the front end
fn api_key(key_var: &str) -> Result<String, String> {
    std::env::var(key_var)
        .ok()
        .map(|key| key.trim().to_string())
        .filter(|key| !key.is_empty())
        .ok_or(format!("{key_var} is not set in .env"))
}

async fn fetch_json(
    endpoint: &str,
    params: &[(&str, &str)],
    authorization: Option<String>,
) -> Result<Value, String> {
    let url = reqwest::Url::parse_with_params(endpoint, params).map_err(|e| e.to_string())?;
    let mut request = reqwest::Client::new().get(url);
    if let Some(authorization) = authorization {
        request = request.header("Authorization", authorization);
    }
    let res = request.send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("returned {}", res.status()));
    }
    res.json().await.map_err(|e| e.to_string())
}

async fn search_unsplash(query: String) -> Result<Vec<ImageResult>, String> {
    let key = api_key("UNSPLASH_ACCESS_KEY")?;
    let data = fetch_json(
        "https://api.unsplash.com/search/photos",
        &[("query", &query), ("per_page", "10")],
        Some(format!("Client-ID {key}")),
    )
    .await?;
    let photos = data["results"].as_array().cloned().unwrap_or_default();
    Ok(photos
        .iter()
        .map(|photo| ImageResult {
            id: format!("unsplash-{}", text(&photo["id"])),
            title: text(&photo["alt_description"]),
            thumbnail: text(&photo["urls"]["small"]),
            url: text(&photo["urls"]["regular"]),
            creator: text(&photo["user"]["name"]),
            source: "Unsplash".into(),
            page_url: text(&photo["links"]["html"]),
        })
        .collect())
}

async fn search_pixabay(query: String) -> Result<Vec<ImageResult>, String> {
    let key = api_key("PIXABAY_API_KEY")?;
    // Pixabay takes its key as a URL parameter rather than a header
    let data = fetch_json(
        "https://pixabay.com/api/",
        &[
            ("key", &key),
            ("q", &query),
            ("image_type", "photo"),
            ("per_page", "10"),
        ],
        None,
    )
    .await?;
    let photos = data["hits"].as_array().cloned().unwrap_or_default();
    Ok(photos
        .iter()
        .map(|photo| ImageResult {
            id: format!("pixabay-{}", photo["id"]),
            title: text(&photo["tags"]),
            thumbnail: text(&photo["webformatURL"]),
            url: text(&photo["largeImageURL"]),
            creator: text(&photo["user"]),
            source: "Pixabay".into(),
            page_url: text(&photo["pageURL"]),
        })
        .collect())
}

#[tauri::command]
async fn search_images(query: String) -> SearchResponse {
    // Run both searches at the same time
    let searches = [
        ("Unsplash", tauri::async_runtime::spawn(search_unsplash(query.clone()))),
        ("Pixabay", tauri::async_runtime::spawn(search_pixabay(query))),
    ];

    let mut lists = Vec::new();
    let mut errors = Vec::new();
    for (name, search) in searches {
        match search.await {
            Ok(Ok(list)) => lists.push(list.into_iter()),
            Ok(Err(e)) => errors.push(format!("{name}: {e}")),
            Err(e) => errors.push(format!("{name}: {e}")),
        }
    }

    // Alternate between the sources: one from each list in turn
    let mut results = Vec::new();
    loop {
        let before = results.len();
        for list in &mut lists {
            results.extend(list.next());
        }
        if results.len() == before {
            break;
        }
    }

    SearchResponse { results, errors }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Loads .env from the project folder (found by searching upwards from src-tauri)
    dotenvy::dotenv().ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![search_images])
        .setup(|app| {
            voice::start(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
