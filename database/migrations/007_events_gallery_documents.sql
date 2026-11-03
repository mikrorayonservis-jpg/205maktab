-- 007_events_gallery_documents.sql
-- Tədbirlər, qalereya, sənədlər

CREATE TABLE IF NOT EXISTS events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title_az VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  description_az TEXT,
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME,
  location_az VARCHAR(255),
  cover_image VARCHAR(500),
  status ENUM('planned','ongoing','completed','cancelled') NOT NULL DEFAULT 'planned',
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_events_start (start_datetime),
  KEY idx_events_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS galleries (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title_az VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description_az TEXT,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_images (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  gallery_id INT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  caption_az VARCHAR(255),
  alt_text VARCHAR(255),
  taken_at DATE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
  KEY idx_gallery_images_gallery (gallery_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title_az VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  category_az VARCHAR(100) NOT NULL COMMENT 'nizamnamə, tədris_planı, ...',
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INT UNSIGNED,
  uploaded_by INT UNSIGNED NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_documents_category (category_az),
  KEY idx_documents_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
