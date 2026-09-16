-- INARA v2.0: persistent dropout-prevention workflow

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
    CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_type') THEN
    CREATE TYPE recommendation_type AS ENUM (
      'ACADEMIC', 'ATTENDANCE', 'RISK', 'ATLAS', 'ACHIEVEMENT', 'XP', 'COURSE', 'MOTIVATION', 'SYSTEM'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_priority') THEN
    CREATE TYPE recommendation_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_source') THEN
    CREATE TYPE recommendation_source AS ENUM ('SYSTEM', 'ATLAS', 'TEACHER', 'ADMIN', 'AI');
  END IF;
END $$;

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

ALTER TABLE student_risk ADD COLUMN IF NOT EXISTS factors JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE student_risk ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open';
ALTER TABLE student_risk ADD COLUMN IF NOT EXISTS last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_student_risk_student_created
  ON student_risk(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_risk_open_level
  ON student_risk(level, status) WHERE status <> 'resolved';

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

CREATE INDEX IF NOT EXISTS idx_recommendations_student_created
  ON recommendations(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_risk
  ON recommendations(related_risk_id);

CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  risk_id UUID REFERENCES student_risk(id) ON DELETE SET NULL,
  action_type VARCHAR(40) NOT NULL CHECK (action_type IN ('contacted', 'meeting', 'academic_guidance', 'pending', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interventions_student_created
  ON interventions(student_id, created_at DESC);
