CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin', 'parent');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE xp_event_type AS ENUM ('attendance', 'achievement', 'manual', 'streak');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'withdrawn', 'suspended');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_email_case_insensitive_idx
  ON users (LOWER(email));

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(40);

CREATE TABLE parent_student_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, student_id),
  CHECK (parent_id <> student_id)
);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE course_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status enrollment_status NOT NULL DEFAULT 'active',
  UNIQUE (course_id, student_id)
);

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  status attendance_status NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  xp_awarded BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, course_id, session_date)
);

CREATE TABLE levels (
  level_number INTEGER PRIMARY KEY CHECK (level_number >= 1),
  name VARCHAR(80) NOT NULL,
  min_xp INTEGER NOT NULL UNIQUE CHECK (min_xp >= 0)
);

CREATE TABLE xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source xp_event_type NOT NULL,
  description TEXT,
  source_legacy_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0)
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

CREATE TABLE competency_routes (
  route_id TEXT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  missions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(missions) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_competency_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id TEXT NOT NULL REFERENCES competency_routes(route_id) ON DELETE CASCADE,
  completed_missions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, route_id)
);

CREATE TABLE competency_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id UUID NOT NULL REFERENCES user_competency_progress(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  evidence_type VARCHAR(40) NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  source_legacy_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  alert_level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  dedupe_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivery_info JSONB,
  UNIQUE (to_user_id, student_id, alert_level, channel, dedupe_date)
);

CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
  best_count INTEGER NOT NULL DEFAULT 0 CHECK (best_count >= 0),
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_legacy_key TEXT,
  UNIQUE (user_id, course_id)
);

CREATE UNIQUE INDEX idx_streaks_legacy_key
  ON streaks(source_legacy_key)
  WHERE source_legacy_key IS NOT NULL;

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_course_students_course ON course_students(course_id);
CREATE INDEX idx_course_students_student ON course_students(student_id);
CREATE INDEX idx_parent_student_relations_parent ON parent_student_relations(parent_id);
CREATE INDEX idx_parent_student_relations_student ON parent_student_relations(student_id);
CREATE INDEX idx_competency_progress_user ON user_competency_progress(user_id);
CREATE INDEX idx_notifications_user_created ON notifications(to_user_id, created_at DESC);
CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_xp_user_created ON xp_events(user_id, created_at DESC);
CREATE INDEX idx_streaks_user ON streaks(user_id);

INSERT INTO levels (level_number, name, min_xp) VALUES
  (1, 'Inicial', 0),
  (2, 'Aprendiz', 500),
  (3, 'Constante', 1200),
  (4, 'Avanzado', 2500),
  (5, 'Experto', 5000);
