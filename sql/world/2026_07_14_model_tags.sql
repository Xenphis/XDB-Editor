-- ---------------------------------------------------------------------------
-- Model tag search — schema (world database)
-- ---------------------------------------------------------------------------
-- NOTE: You normally do NOT need to run this file by hand. ISC Editor creates
-- both tables automatically (idempotently) right after it connects to the
-- database — see `FEATURE_SCHEMA` in src-tauri/src/db.rs and `connect_db` in
-- src-tauri/src/commands/connection.rs. This file is kept as reference, for
-- manual setup where the connecting user lacks CREATE privilege, and as the
-- template for the DATA patches you add yourself.
--
-- These two tables map a model *display id* to a human label + up to 3 free-form
-- tags. They power the "search a model by tag" feature in the editor. You fill
-- them in over time by hand, via additional SQL patches placed under sql/world/.
--
-- Note: no index is defined on the tag columns on purpose — the search uses
-- `LIKE '%term%'` (leading wildcard), which cannot use a B-tree index. The
-- primary key on displayId is enough; the tables stay small.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `creature_model_tags` (
  `displayId` INT UNSIGNED NOT NULL,
  `name`      VARCHAR(100) NULL DEFAULT NULL,
  `tags01`    VARCHAR(64)  NULL DEFAULT NULL,
  `tags02`    VARCHAR(64)  NULL DEFAULT NULL,
  `tags03`    VARCHAR(64)  NULL DEFAULT NULL,
  PRIMARY KEY (`displayId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `gameobject_model_tags` (
  `displayId` INT UNSIGNED NOT NULL,
  `name`      VARCHAR(100) NULL DEFAULT NULL,
  `tags01`    VARCHAR(64)  NULL DEFAULT NULL,
  `tags02`    VARCHAR(64)  NULL DEFAULT NULL,
  `tags03`    VARCHAR(64)  NULL DEFAULT NULL,
  PRIMARY KEY (`displayId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
