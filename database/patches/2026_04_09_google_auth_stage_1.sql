-- Patch for existing databases created before Google auth support.
-- Run once against your existing Lantern database.

USE LANTERN;

ALTER TABLE `users`
  ADD COLUMN `google_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `password`,
  ADD COLUMN `auth_provider` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local' AFTER `google_id`,
  ADD COLUMN `avatar_url` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `auth_provider`;

ALTER TABLE `users`
  ADD UNIQUE KEY `users_google_id_unique` (`google_id`);
