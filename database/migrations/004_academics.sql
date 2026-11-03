-- 004_academics.sql
-- Dərs cədvəli, qiymətlər, davamiyyət

CREATE TABLE IF NOT EXISTS lessons (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  school_year_id INT UNSIGNED NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL COMMENT '1=Bazar ertəsi ... 7=Bazar',
  period TINYINT UNSIGNED NOT NULL COMMENT 'dərs nömrəsi (1-8)',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE CASCADE,
  UNIQUE KEY uq_lessons_class_period (class_id, day_of_week, period, school_year_id),
  KEY idx_lessons_teacher_day (teacher_id, day_of_week),
  KEY idx_lessons_class_day (class_id, day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cədvəl konflikt yoxlaması üçün view (eyni müəllim eyni zamanda iki sinifdə)
CREATE OR REPLACE VIEW schedule_conflicts AS
SELECT
  l1.id AS lesson_a_id,
  l2.id AS lesson_b_id,
  l1.teacher_id,
  l1.day_of_week,
  l1.period,
  c1.name AS class_a,
  c2.name AS class_b
FROM lessons l1
JOIN lessons l2
  ON l1.teacher_id = l2.teacher_id
 AND l1.day_of_week = l2.day_of_week
 AND l1.period = l2.period
 AND l1.school_year_id = l2.school_year_id
 AND l1.id < l2.id
JOIN classes c1 ON c1.id = l1.class_id
JOIN classes c2 ON c2.id = l2.class_id;

CREATE TABLE IF NOT EXISTS grades (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  class_id INT UNSIGNED NOT NULL,
  grade_type ENUM('test','ish','imtahan','texmin','project','homework') NOT NULL DEFAULT 'ish',
  grade_value DECIMAL(4,2) NOT NULL COMMENT 'qiymət',
  date DATE NOT NULL,
  note VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  KEY idx_grades_student (student_id),
  KEY idx_grades_subject (subject_id),
  KEY idx_grades_date (date),
  KEY idx_grades_teacher (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  lesson_id INT UNSIGNED,
  class_id INT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  status ENUM('present','late','excused','unexcused') NOT NULL DEFAULT 'present',
  marked_by INT UNSIGNED NOT NULL COMMENT 'müəllim / sinif rəhbəri user_id',
  note VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_attendance_student_date (student_id, date),
  KEY idx_attendance_class_date (class_id, date),
  KEY idx_attendance_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
