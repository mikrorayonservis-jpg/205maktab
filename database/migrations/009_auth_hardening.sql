-- 009_auth_hardening.sql
-- İstifadəçi profili sahələri, server sessiyaları, e-poçt təsdiqi, giriş cəhdləri, rate limit, dəvət kodları

ALTER TABLE users
  ADD COLUMN first_name VARCHAR(100) NULL AFTER email,
  ADD COLUMN last_name VARCHAR(100) NULL AFTER first_name,
  ADD COLUMN phone_private VARCHAR(30) NULL AFTER last_name,
  ADD COLUMN avatar_url VARCHAR(500) NULL AFTER phone_private,
  ADD COLUMN email_verified_at TIMESTAMP NULL DEFAULT NULL AFTER email_verified,
  ADD COLUMN failed_login_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER email_verified_at,
  ADD COLUMN locked_until TIMESTAMP NULL DEFAULT NULL AFTER failed_login_count,
  ADD COLUMN password_changed_at TIMESTAMP NULL DEFAULT NULL AFTER locked_until,
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password_changed_at;

ALTER TABLE sessions
  ADD COLUMN ip_address VARCHAR(45) NULL AFTER expires_at,
  ADD COLUMN user_agent VARCHAR(400) NULL AFTER ip_address,
  ADD COLUMN last_seen_at TIMESTAMP NULL DEFAULT NULL AFTER user_agent,
  ADD COLUMN revoked_at TIMESTAMP NULL DEFAULT NULL AFTER last_seen_at,
  ADD KEY idx_sessions_expires (expires_at);

ALTER TABLE password_resets
  ADD COLUMN used_at TIMESTAMP NULL DEFAULT NULL AFTER used,
  ADD COLUMN ip_address VARCHAR(45) NULL AFTER used_at;

CREATE TABLE IF NOT EXISTS email_verifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_verifications_token (token_hash),
  KEY idx_email_verifications_user (user_id),
  CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  user_id INT UNSIGNED NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(400) NULL,
  success TINYINT(1) NOT NULL,
  reason VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_login_attempts_email (email, created_at),
  KEY idx_login_attempts_ip (ip_address, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key VARCHAR(191) NOT NULL,
  window_start DATETIME NOT NULL,
  hits INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invitations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code_hash CHAR(64) NOT NULL,
  code_hint VARCHAR(8) NOT NULL COMMENT 'Kodun son 4 simvolu (admin üçün)',
  role_code VARCHAR(50) NOT NULL,
  email VARCHAR(190) NULL COMMENT 'Doldurularsa yalnız bu e-poçt istifadə edə bilər',
  student_id INT UNSIGNED NULL COMMENT 'student: hesab bağlanacaq şagird; parent: uşaq',
  teacher_id INT UNSIGNED NULL,
  relation_type VARCHAR(50) NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL DEFAULT NULL,
  used_by INT UNSIGNED NULL,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invitations_code (code_hash),
  KEY idx_invitations_student (student_id),
  CONSTRAINT fk_invitations_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_invitations_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_invitations_used_by FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_invitations_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
