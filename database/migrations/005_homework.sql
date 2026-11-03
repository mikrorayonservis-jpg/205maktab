-- 005_homework.sql
-- Ev tapşırıqları və təqdimatlar

CREATE TABLE IF NOT EXISTS homework (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  subject_id INT UNSIGNED NOT NULL,
  class_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  due_date DATE NOT NULL,
  file_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  KEY idx_homework_class (class_id),
  KEY idx_homework_due (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS homework_submissions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  homework_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  answer_text TEXT,
  file_url VARCHAR(500),
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  grade DECIMAL(4,2),
  feedback TEXT,
  graded_by INT UNSIGNED,
  graded_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (homework_id) REFERENCES homework(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES teachers(id) ON DELETE SET NULL,
  UNIQUE KEY uq_submissions_homework_student (homework_id, student_id),
  KEY idx_submissions_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
