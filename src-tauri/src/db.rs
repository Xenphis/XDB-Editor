use sqlx::mysql::MySqlPoolOptions;
use sqlx::MySqlPool;
use std::sync::Arc;
use tokio::sync::RwLock;

// RwLock instead of Mutex: every command only needs a shared read of the
// pool (MySqlPool is itself thread-safe); the write lock is only taken on
// connect/disconnect.
pub struct DbState {
    pub pool: Arc<RwLock<Option<MySqlPool>>>,
}

/// Additive, editor-owned feature tables that are NOT part of the AzerothCore /
/// TrinityCore schema. They are created automatically (idempotently) right after
/// a successful connection — see `connect_db` — so the model-search feature works
/// out of the box. The tag data itself is filled in manually by the user.
pub const FEATURE_SCHEMA: &[(&str, &str)] = &[
    (
        "creature_model_tags",
        "CREATE TABLE IF NOT EXISTS `creature_model_tags` (\
           `displayId` INT UNSIGNED NOT NULL, \
           `name` VARCHAR(100) NULL DEFAULT NULL, \
           `tags01` VARCHAR(64) NULL DEFAULT NULL, \
           `tags02` VARCHAR(64) NULL DEFAULT NULL, \
           `tags03` VARCHAR(64) NULL DEFAULT NULL, \
           PRIMARY KEY (`displayId`)\
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci",
    ),
    (
        "gameobject_model_tags",
        "CREATE TABLE IF NOT EXISTS `gameobject_model_tags` (\
           `displayId` INT UNSIGNED NOT NULL, \
           `name` VARCHAR(100) NULL DEFAULT NULL, \
           `tags01` VARCHAR(64) NULL DEFAULT NULL, \
           `tags02` VARCHAR(64) NULL DEFAULT NULL, \
           `tags03` VARCHAR(64) NULL DEFAULT NULL, \
           PRIMARY KEY (`displayId`)\
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci",
    ),
];

impl DbState {
    pub fn new() -> Self {
        Self {
            pool: Arc::new(RwLock::new(None)),
        }
    }
}

pub async fn connect(
    host: &str,
    port: u16,
    user: &str,
    password: &str,
    database: &str,
) -> Result<MySqlPool, String> {
    let url = format!(
        "mysql://{}:{}@{}:{}/{}",
        user, password, host, port, database
    );

    log::info!("Connecting to: mysql://{}:***@{}:{}/{}", user, host, port, database);

    MySqlPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(&url)
        .await
        .map_err(|e| format!("Failed to connect to database: {}", e))
}
