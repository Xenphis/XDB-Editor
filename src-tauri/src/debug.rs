use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use serde::Serialize;
use tauri::{Emitter, State};

pub struct DebugState {
    pub enabled: AtomicBool,
}

impl DebugState {
    pub fn new() -> Self {
        Self {
            enabled: AtomicBool::new(false),
        }
    }
}

#[derive(Clone, Serialize)]
pub struct SqlDebugEvent {
    pub timestamp: u64,
    pub query_type: String,
    pub sql: String,
    pub execution_time_ms: u64,
    pub success: bool,
}

pub fn extract_query_type(sql: &str) -> String {
    sql.trim()
        .split_whitespace()
        .next()
        .unwrap_or("UNKNOWN")
        .to_uppercase()
}

fn format_param_for_sql(debug_str: &str) -> String {
    let s = debug_str.trim();
    if s == "None" {
        return "NULL".to_string();
    }
    if let Some(inner) = s.strip_prefix("Some(").and_then(|v| v.strip_suffix(')')) {
        return format_param_for_sql(inner);
    }
    if s.starts_with('"') && s.ends_with('"') && s.len() >= 2 {
        let inner = &s[1..s.len() - 1];
        return format!("'{}'", inner);
    }
    s.to_string()
}

pub fn resolve_sql(template: &str, params: &[String]) -> String {
    let mut result = String::with_capacity(template.len() + params.iter().map(|p| p.len()).sum::<usize>());
    let mut param_iter = params.iter();
    for ch in template.chars() {
        if ch == '?' {
            if let Some(param) = param_iter.next() {
                result.push_str(&format_param_for_sql(param));
            } else {
                result.push('?');
            }
        } else {
            result.push(ch);
        }
    }
    result
}

pub fn maybe_emit_sql_log(
    app: &tauri::AppHandle,
    debug: &DebugState,
    sql: &str,
    params: &[String],
    duration: Duration,
    success: bool,
) {
    if !debug.enabled.load(Ordering::Relaxed) {
        return;
    }

    let resolved = resolve_sql(sql, params);

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let event = SqlDebugEvent {
        timestamp,
        query_type: extract_query_type(sql),
        sql: resolved,
        execution_time_ms: duration.as_millis() as u64,
        success,
    };

    let _ = app.emit("sql-debug-log", event);
}

#[macro_export]
macro_rules! debug_sql {
    ($app:expr, $debug:expr, $sql:expr, $query:expr $(, $param:expr)* $(,)?) => {{
        let _sql_debug_start = std::time::Instant::now();
        let _sql_debug_result = { $query };
        let _sql_debug_params: Vec<String> = vec![$(format!("{:?}", &$param)),*];
        $crate::debug::maybe_emit_sql_log(
            &$app,
            &$debug,
            $sql,
            &_sql_debug_params,
            _sql_debug_start.elapsed(),
            _sql_debug_result.is_ok(),
        );
        _sql_debug_result
    }};
}

#[tauri::command]
pub fn set_debug_mode(debug: State<'_, DebugState>, enabled: bool) {
    debug.enabled.store(enabled, Ordering::Relaxed);
    log::info!("SQL Debug mode: {}", if enabled { "ON" } else { "OFF" });
}

#[tauri::command]
pub fn get_debug_mode(debug: State<'_, DebugState>) -> bool {
    debug.enabled.load(Ordering::Relaxed)
}
