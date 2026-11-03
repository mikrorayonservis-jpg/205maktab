-- 010_people_school.sql
-- Hesabsız müəllim/şagird profilləri, sinif rəhbəri, rəhbərlik, nailiyyətlər, keçidlər, statik səhifələr, fayllar

ALTER TABLE teachers
  MODIFY user_id INT UNSIGNED NULL,
  ADD COLUMN position_az VARCHAR(150) NULL AFTER subject,
  ADD COLUMN education_az VARCHAR(500) NULL AFTER position_az,
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER is_public,
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER sort_order;

ALTER TABLE students
  MODIFY user_id INT UNSIGNED NULL;

ALTER TABLE classes
  ADD COLUMN class_teacher_id INT UNSIGNED NULL AFTER room,
  ADD COLUMN shift TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER class_teacher_id,
  ADD CONSTRAINT fk_classes_class_teacher FOREIGN KEY (class_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS files (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  storage_key VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  visibility ENUM('public','private') NOT NULL DEFAULT 'private',
  purpose VARCHAR(50) NOT NULL COMMENT 'news, gallery, document, homework, submission, avatar, content',
  owner_user_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_files_key (storage_key),
  KEY idx_files_owner (owner_user_id),
  CONSTRAINT fk_files_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leadership (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(200) NOT NULL,
  position_az VARCHAR(200) NOT NULL,
  photo_url VARCHAR(500) NULL,
  bio_az TEXT NULL,
  education_az VARCHAR(500) NULL,
  experience_az VARCHAR(500) NULL,
  message_az TEXT NULL COMMENT 'Rəsmi müraciət',
  reception_hours_az VARCHAR(200) NULL,
  is_director TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leadership_order (is_published, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS achievements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title_az VARCHAR(255) NOT NULL,
  description_az TEXT NULL,
  year_label VARCHAR(20) NULL,
  image_url VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS useful_links (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title_az VARCHAR(200) NOT NULL,
  url VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(100) NOT NULL,
  title_az VARCHAR(255) NOT NULL,
  content_md MEDIUMTEXT NOT NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pages_slug (slug),
  CONSTRAINT fk_pages_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
