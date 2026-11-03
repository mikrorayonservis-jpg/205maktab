-- 011_academics_v2.sql
-- Qiymət növləri (Azərbaycan qiymətləndirmə sistemi), soft delete, dərs üzrə davamiyyət, zəng cədvəli, ev tapşırığı faylları

ALTER TABLE grades
  MODIFY grade_type ENUM('formativ','ksq','bsq','ev','layihe','yekun') NOT NULL DEFAULT 'formativ',
  MODIFY grade_value TINYINT UNSIGNED NOT NULL COMMENT '2-5 şkalası',
  ADD COLUMN school_year_id INT UNSIGNED NULL AFTER class_id,
  ADD COLUMN created_by INT UNSIGNED NULL AFTER note,
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER created_by,
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at,
  ADD KEY idx_grades_class_subject_date (class_id, subject_id, date),
  ADD CONSTRAINT fk_grades_year FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_grades_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_grades_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- period = 0 gündəlik davamiyyət, 1..8 dərs üzrə davamiyyət
ALTER TABLE attendance
  ADD COLUMN period TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER date,
  ADD COLUMN subject_id INT UNSIGNED NULL AFTER period,
  ADD UNIQUE KEY uq_attendance_student_date_period (student_id, date, period),
  ADD CONSTRAINT fk_attendance_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE attendance DROP INDEX uq_attendance_student_date;

CREATE TABLE IF NOT EXISTS bell_times (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  shift TINYINT UNSIGNED NOT NULL DEFAULT 1,
  period TINYINT UNSIGNED NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bell_times (shift, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE homework
  ADD COLUMN school_year_id INT UNSIGNED NULL AFTER teacher_id,
  ADD COLUMN created_by INT UNSIGNED NULL AFTER file_url,
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at,
  ADD CONSTRAINT fk_homework_year FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS homework_files (
  homework_id INT UNSIGNED NOT NULL,
  file_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (homework_id, file_id),
  CONSTRAINT fk_homework_files_hw FOREIGN KEY (homework_id) REFERENCES homework(id) ON DELETE CASCADE,
  CONSTRAINT fk_homework_files_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE homework_submissions
  ADD COLUMN file_id INT UNSIGNED NULL AFTER file_url,
  ADD COLUMN status ENUM('submitted','graded','returned') NOT NULL DEFAULT 'submitted' AFTER file_id,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER graded_at,
  ADD CONSTRAINT fk_submissions_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL;
