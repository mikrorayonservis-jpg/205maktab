-- 006_news.sql
-- XəbərKateqoriya, müəllif, xəbər, reviziya

CREATE TABLE IF NOT EXISTS news_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name_az VARCHAR(150) NOT NULL,
  slug VARCHAR(190) NOT NULL UNIQUE,
  description_az TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news_authors (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name_az VARCHAR(150) NOT NULL,
  email VARCHAR(190),
  bio_az TEXT,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_news_authors_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title_az VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  summary_az TEXT,
  content_az TEXT NOT NULL,
  cover_image VARCHAR(500),
  category_id INT UNSIGNED,
  author_id INT UNSIGNED NOT NULL COMMENT 'news_authors.id (byline)',
  created_by INT UNSIGNED NOT NULL COMMENT 'users.id (kim yaraddı)',
  status ENUM('draft','pending','approved','published','archived') NOT NULL DEFAULT 'draft',
  seo_title_az VARCHAR(300),
  seo_description_az TEXT,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  published_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (category_id) REFERENCES news_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (author_id) REFERENCES news_authors(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_news_status (status),
  KEY idx_news_slug (slug),
  KEY idx_news_category (category_id),
  KEY idx_news_published (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news_revisions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  news_id INT UNSIGNED NOT NULL,
  title_az VARCHAR(300),
  content_az TEXT,
  summary_az TEXT,
  change_reason VARCHAR(255),
  changed_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_news_revisions_news (news_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
