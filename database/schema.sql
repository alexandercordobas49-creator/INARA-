CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin', 'parent');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE xp_event_type AS ENUM ('attendance', 'achievement', 'manual', 'streak');

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
  enrollment_status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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

CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
  best_count INTEGER NOT NULL DEFAULT 0 CHECK (best_count >= 0),
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

CREATE TABLE parent_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, child_id),
  CHECK (parent_id <> child_id)
);

CREATE TABLE notifications (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE TABLE competency_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  description TEXT,
  icon VARCHAR(40),
  missions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_competency_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES competency_routes(id) ON DELETE CASCADE,
  completed_missions JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, route_id)
);

CREATE TABLE evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id UUID NOT NULL REFERENCES user_competency_progress(id) ON DELETE CASCADE,
  mission_id VARCHAR(120) NOT NULL,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_xp_user_created ON xp_events(user_id, created_at DESC);
CREATE INDEX idx_streaks_user ON streaks(user_id);
CREATE INDEX idx_parent_relations_parent ON parent_relations(parent_id);
CREATE INDEX idx_parent_relations_child ON parent_relations(child_id);
CREATE INDEX idx_notifications_user_created ON notifications(to_user_id, created_at DESC);
CREATE INDEX idx_competency_progress_user ON user_competency_progress(user_id);
CREATE INDEX idx_evidences_progress ON evidences(progress_id);

INSERT INTO levels (level_number, name, min_xp) VALUES
  (1, 'Inicial', 0),
  (2, 'Aprendiz', 500),
  (3, 'Constante', 1200),
  (4, 'Avanzado', 2500),
  (5, 'Experto', 5000);

INSERT INTO achievements (code, name, description, xp_reward) VALUES
  ('first-attendance', 'Primera asistencia', 'Registro su primera asistencia.', 100),
  ('streak-5', 'Cinco dias constantes', 'Alcanzo una racha de cinco dias.', 250),
  ('level-3', 'Nivel constante', 'Alcanzo el nivel 3.', 150);

INSERT INTO competency_routes (name, description, icon, missions) VALUES
  ('Mecánica Automotriz', 'Rutas prácticas para dominar el taller mecánico en INATEC.', '🔧',
   '[{"id":"mission-1","title":"Inspección de motor","description":"Revisa y documenta el estado del motor en una ficha técnica.","xp":120,"category":"Taller","evidenceType":"photo"},{"id":"mission-2","title":"Cambio de aceite","description":"Realiza el cambio de aceite y registra los pasos en un informe.","xp":150,"category":"Proceso","evidenceType":"document"},{"id":"mission-3","title":"Ajuste de frenos","description":"Ajusta los frenos y comprueba su funcionamiento de forma segura.","xp":180,"category":"Seguridad","evidenceType":"photo"}]'::jsonb),
  ('Tecnologías de la Información', 'Rutas para fortalecer informática, redes y soporte técnico.', '💻',
   '[{"id":"mission-4","title":"Instalación de red local","description":"Configura una red local y documenta la topología.","xp":130,"category":"Redes","evidenceType":"document"},{"id":"mission-5","title":"Seguridad informática básica","description":"Aplica medidas de seguridad en un equipo y registra los resultados.","xp":140,"category":"Seguridad","evidenceType":"document"},{"id":"mission-6","title":"Soporte técnico","description":"Resuelve un problema técnico y documenta el proceso.","xp":110,"category":"Soporte","evidenceType":"document"}]'::jsonb);
