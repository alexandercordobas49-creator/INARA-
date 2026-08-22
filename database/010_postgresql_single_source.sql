-- INARA PostgreSQL single-source migration
-- Run after database/schema.sql and modules 007-009.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'parent';

CREATE TABLE IF NOT EXISTS parent_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, child_id),
  CHECK (parent_id <> child_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_relations_parent ON parent_relations(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_relations_child ON parent_relations(child_id);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(to_user_id, created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_competency_progress_user ON user_competency_progress(user_id);

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

CREATE INDEX IF NOT EXISTS idx_evidences_progress ON evidences(progress_id);

INSERT INTO achievements (code, name, description, xp_reward)
VALUES
  ('first-attendance', 'Primera asistencia', 'Registro su primera asistencia.', 100),
  ('streak-5', 'Cinco dias constantes', 'Alcanzo una racha de cinco dias.', 250),
  ('level-3', 'Nivel constante', 'Alcanzo el nivel 3.', 150)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_routes (name, description, icon, missions)
SELECT 'Mecánica Automotriz',
       'Rutas prácticas para dominar el taller mecánico en INATEC.',
       '🔧',
       '[
         {"id":"mission-1","title":"Inspección de motor","description":"Revisa y documenta el estado del motor en una ficha técnica.","xp":120,"category":"Taller","evidenceType":"photo"},
         {"id":"mission-2","title":"Cambio de aceite","description":"Realiza el cambio de aceite y registra los pasos en un informe.","xp":150,"category":"Proceso","evidenceType":"document"},
         {"id":"mission-3","title":"Ajuste de frenos","description":"Ajusta los frenos y comprueba su funcionamiento de forma segura.","xp":180,"category":"Seguridad","evidenceType":"photo"}
       ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competency_routes WHERE name = 'Mecánica Automotriz');

INSERT INTO competency_routes (name, description, icon, missions)
SELECT 'Tecnologías de la Información',
       'Rutas para fortalecer informática, redes y soporte técnico.',
       '💻',
       '[
         {"id":"mission-4","title":"Instalación de red local","description":"Configura una red local y documenta la topología.","xp":130,"category":"Redes","evidenceType":"document"},
         {"id":"mission-5","title":"Seguridad informática básica","description":"Aplica medidas de seguridad en un equipo y registra los resultados.","xp":140,"category":"Seguridad","evidenceType":"document"},
         {"id":"mission-6","title":"Soporte técnico","description":"Resuelve un problema técnico y documenta el proceso.","xp":110,"category":"Soporte","evidenceType":"document"}
       ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM competency_routes WHERE name = 'Tecnologías de la Información');
