use tauri::http::header::{ACCESS_CONTROL_ALLOW_ORIGIN, CONTENT_TYPE};
use tauri::http::{Request, Response};

/// Root of the Wowhead asset CDN. The branch (e.g. `modelviewer/wrath/`) is part
/// of the path supplied by the frontend, so this proxy isn't tied to one branch.
const WOW_CDN_BASE: &str = "https://wow.zamimg.com/";

/// Proxy a single model-viewer asset request to the Wowhead CDN.
///
/// The webview can't read these cross-origin assets directly (CORS blocks the
/// viewer's data XHRs), so the `wowcdn://` custom scheme routes them through
/// here. We fetch server-side and return the bytes with a permissive CORS
/// header so the viewer's requests succeed.
pub async fn proxy_request(request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let uri = request.uri();
    let path = uri.path().trim_start_matches('/');
    let mut url = format!("{WOW_CDN_BASE}{path}");
    if let Some(query) = uri.query() {
        url.push('?');
        url.push_str(query);
    }

    match reqwest::get(&url).await {
        Ok(resp) => {
            let status = resp.status().as_u16();
            let content_type = resp
                .headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .unwrap_or("application/octet-stream")
                .to_string();
            let body = resp.bytes().await.map(|b| b.to_vec()).unwrap_or_default();

            Response::builder()
                .status(status)
                .header(CONTENT_TYPE, content_type)
                .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .body(body)
                .unwrap_or_else(|_| error_response())
        }
        Err(err) => {
            log::warn!("model proxy failed for {url}: {err}");
            error_response()
        }
    }
}

fn error_response() -> Response<Vec<u8>> {
    Response::builder()
        .status(502)
        .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(Vec::new())
        .unwrap()
}
