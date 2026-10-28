CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin', 'parent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
    CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'xp_event_type') THEN
    CREATE TYPE xp_event_type AS ENUM ('attendance', 'achievement', 'manual', 'streak');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
    CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_type') THEN
    CREATE TYPE recommendation_type AS ENUM (
      'ACADEMIC', 'ATTENDANCE', 'RISK', 'ATLAS', 'ACHIEVEMENT',
      'XP', 'COURSE', 'MOTIVATION', 'SYSTEM'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_priority') THEN
    CREATE TYPE recommendation_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_source') THEN
    CREATE TYPE recommendation_source AS ENUM ('SYSTEM', 'ATLAS', 'TEACHER', 'ADMIN', 'AI');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  phone VARCHAR(40),
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  status attendance_status NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id, session_date)
);

CREATE TABLE IF NOT EXISTS levels (
  level_number INTEGER PRIMARY KEY CHECK (level_number >= 1),
  name VARCHAR(80) NOT NULL,
  min_xp INTEGER NOT NULL UNIQUE CHECK (min_xp >= 0)
);

CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source xp_event_type NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0)
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
  best_count INTEGER NOT NULL DEFAULT 0 CHECK (best_count >= 0),
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS parent_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, child_id),
  CHECK (parent_id <> child_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_email VARCHAR(160),
  to_phone VARCHAR(40),
  level VARCHAR(20) NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  delivery_info JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS competency_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  description TEXT,
  icon VARCHAR(40),
  missions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_competency_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES competency_routes(id) ON DELETE CASCADE,
  completed_missions JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, route_id)
);

CREATE TABLE IF NOT EXISTS evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id UUID NOT NULL REFERENCES user_competency_progress(id) ON DELETE CASCADE,
  mission_id VARCHAR(120) NOT NULL,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_risk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  level risk_level NOT NULL DEFAULT 'low',
  attendance_score INTEGER NOT NULL DEFAULT 0 CHECK (attendance_score BETWEEN 0 AND 100),
  xp_score INTEGER NOT NULL DEFAULT 0 CHECK (xp_score BETWEEN 0 AND 100),
  engagement_score INTEGER NOT NULL DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 100),
  streak_score INTEGER NOT NULL DEFAULT 0 CHECK (streak_score BETWEEN 0 AND 100),
  main_reason TEXT,
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendations (
  recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recommendation_type recommendation_type NOT NULL,
  priority recommendation_priority NOT NULL,
  source recommendation_source NOT NULL,
  title VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  related_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  related_risk_id UUID REFERENCES student_risk(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_applied BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  risk_id UUID REFERENCES student_risk(id) ON DELETE SET NULL,
  recommendation_id UUID REFERENCES recommendations(recommendation_id) ON DELETE SET NULL,
  action_type VARCHAR(40) NOT NULL CHECK (
    action_type IN ('CONTACT', 'MEETING', 'ACADEMIC_SUPPORT', 'MOTIVATION', 'PARENT_CONTACT', 'FOLLOW_UP', 'OTHER')
  ),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
  follow_up_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_user_created ON xp_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_parent_relations_parent ON parent_relations(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_relations_child ON parent_relations(child_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_competency_progress_user ON user_competency_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_evidences_progress ON evidences(progress_id);
CREATE INDEX IF NOT EXISTS idx_student_risk_student_created ON student_risk(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_risk_open_level ON student_risk(level, status) WHERE status <> 'resolved';
CREATE INDEX IF NOT EXISTS idx_recommendations_student_created ON recommendations(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_risk ON recommendations(related_risk_id);
CREATE INDEX IF NOT EXISTS idx_interventions_student_created ON interventions(student_id, created_at DESC);

INSERT INTO levels (level_number, name, min_xp) VALUES
  (1, 'Inicial', 0),
  (2, 'Aprendiz', 500),
  (3, 'Constante', 1200),
  (4, 'Avanzado', 2500),
  (5, 'Experto', 5000)
ON CONFLICT (level_number) DO NOTHING;

INSERT INTO achievements (code, name, description, xp_reward) VALUES
  ('first-attendance', 'Primera asistencia', 'Registro su primera asistencia.', 100),
  ('streak-5', 'Cinco dias constantes', 'Alcanzo una racha de cinco dias.', 250),
  ('level-3', 'Nivel constante', 'Alcanzo el nivel 3.', 150)
ON CONFLICT (code) DO NOTHING;
