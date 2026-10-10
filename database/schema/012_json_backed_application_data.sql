ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(40);

CREATE TABLE IF NOT EXISTS parent_student_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, student_id),
  CHECK (parent_id <> student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_student_relations_parent
  ON parent_student_relations(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_relations_student
  ON parent_student_relations(student_id);

CREATE TABLE IF NOT EXISTS competency_routes (
  route_id TEXT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  missions JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(missions) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_competency_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id TEXT NOT NULL REFERENCES competency_routes(route_id) ON DELETE CASCADE,
  completed_missions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, route_id)
);

CREATE TABLE IF NOT EXISTS competency_evidence (
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

ALTER TABLE competency_evidence
  ADD COLUMN IF NOT EXISTS source_legacy_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_competency_evidence_legacy_key
  ON competency_evidence(source_legacy_key)
  WHERE source_legacy_key IS NOT NULL;

ALTER TABLE xp_events
  ADD COLUMN IF NOT EXISTS source_legacy_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_events_legacy_key
  ON xp_events(source_legacy_key)
  WHERE source_legacy_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS notifications (
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

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_competency_progress_user
  ON user_competency_progress(user_id);

ALTER TABLE streaks
  ADD COLUMN IF NOT EXISTS source_legacy_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_streaks_legacy_key
  ON streaks(source_legacy_key)
  WHERE source_legacy_key IS NOT NULL;
