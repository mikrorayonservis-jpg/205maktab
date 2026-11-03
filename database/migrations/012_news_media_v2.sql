-- 012_news_media_v2.sql
-- Redaksiya iş axını, razılıq bayraqları, qalereya videoları, sənəd təsviri, bildiriş keçidləri

ALTER TABLE news
  MODIFY author_id INT UNSIGNED NULL,
  ADD COLUMN byline_az VARCHAR(200) NULL AFTER author_id,
  ADD COLUMN cover_alt_az VARCHAR(255) NULL AFTER cover_image,
  ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN contains_minors TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured,
  ADD COLUMN consent_confirmed TINYINT(1) NOT NULL DEFAULT 0 AFTER contains_minors,
  ADD COLUMN review_note TEXT NULL AFTER consent_confirmed,
  ADD COLUMN submitted_at TIMESTAMP NULL DEFAULT NULL AFTER review_note,
  ADD COLUMN approved_by INT UNSIGNED NULL AFTER submitted_at,
  ADD COLUMN published_by INT UNSIGNED NULL AFTER approved_by,
  ADD COLUMN gallery_id INT UNSIGNED NULL AFTER published_by,
  ADD KEY idx_news_public (status, deleted_at, published_at),
  ADD CONSTRAINT fk_news_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_news_published_by FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_news_gallery FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE SET NULL;

ALTER TABLE news_revisions
  ADD COLUMN action VARCHAR(40) NOT NULL DEFAULT 'edit' AFTER news_id,
  ADD COLUMN status_from VARCHAR(20) NULL AFTER action,
  ADD COLUMN status_to VARCHAR(20) NULL AFTER status_from;

ALTER TABLE events
  ADD COLUMN participants_az TEXT NULL AFTER location_az,
  ADD COLUMN gallery_id INT UNSIGNED NULL AFTER cover_image,
  ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 1 AFTER status,
  ADD CONSTRAINT fk_events_gallery FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE SET NULL;

ALTER TABLE galleries
  ADD COLUMN category_az VARCHAR(100) NULL AFTER description_az,
  ADD COLUMN cover_image VARCHAR(500) NULL AFTER category_az,
  ADD COLUMN event_date DATE NULL AFTER cover_image,
  ADD COLUMN contains_minors TINYINT(1) NOT NULL DEFAULT 0 AFTER event_date,
  ADD COLUMN consent_confirmed TINYINT(1) NOT NULL DEFAULT 0 AFTER contains_minors,
  ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 0 AFTER consent_confirmed,
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at,
  ADD KEY idx_galleries_public (is_published, event_date);

ALTER TABLE gallery_images
  ADD COLUMN file_id INT UNSIGNED NULL AFTER image_url,
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER taken_at,
  ADD CONSTRAINT fk_gallery_images_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS gallery_videos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  gallery_id INT UNSIGNED NOT NULL,
  title_az VARCHAR(255) NULL,
  provider ENUM('youtube','vimeo') NOT NULL,
  video_id VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gallery_videos_gallery (gallery_id),
  CONSTRAINT fk_gallery_videos_gallery FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE documents
  ADD COLUMN description_az TEXT NULL AFTER category_az,
  ADD COLUMN file_id INT UNSIGNED NULL AFTER file_url,
  ADD COLUMN published_on DATE NULL AFTER is_public,
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at,
  ADD CONSTRAINT fk_documents_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL;

ALTER TABLE notifications
  ADD COLUMN link_url VARCHAR(500) NULL AFTER type,
  ADD COLUMN entity_type VARCHAR(50) NULL AFTER link_url,
  ADD COLUMN entity_id INT UNSIGNED NULL AFTER entity_type,
  ADD KEY idx_notifications_dedupe (user_id, entity_type, entity_id, type);

ALTER TABLE audit_logs
  MODIFY entity_id BIGINT UNSIGNED NULL;

ALTER TABLE site_settings
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER description_az;
