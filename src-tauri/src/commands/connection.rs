use tauri::State;
use crate::db::{self, DbState};
use crate::debug::DebugState;
use crate::debug_sql;

#[tauri::command]
pub async fn connect_db(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    debug: State<'_, DebugState>,
    host: String,
    port: u16,
    user: String,
    password: String,
    database: String,
) -> Result<(), String> {
    let pool = db::connect(&host, port, &user, &password, &database).await?;

    // Ensure the editor's own feature tables exist. These are additive, custom
    // tables (creature_model_tags / gameobject_model_tags), not part of the
    // AzerothCore schema; `CREATE TABLE IF NOT EXISTS` makes this idempotent.
    // A failure here (e.g. missing CREATE privilege) is logged but must not
    // block the connection — the rest of the editor still works.
    for (name, sql) in db::FEATURE_SCHEMA {
        let result = debug_sql!(app, debug, *sql,
            sqlx::query(*sql).execute(&pool).await
        );
        match result {
            Ok(_) => log::info!("Ensured feature table `{}`", name),
            Err(e) => log::warn!("Could not ensure feature table `{}`: {}", name, e),
        }
    }

    let mut db = state.pool.write().await;
    *db = Some(pool);

    log::info!("Connected to MySQL {}@{}:{}/{}", user, host, port, database);
    Ok(())
}

#[tauri::command]
pub async fn disconnect_db(state: State<'_, DbState>) -> Result<(), String> {
    let mut db = state.pool.write().await;
    if let Some(pool) = db.take() {
        pool.close().await;
        log::info!("Disconnected from MySQL");
    }
    Ok(())
}
