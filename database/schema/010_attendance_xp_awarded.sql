ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS xp_awarded BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE attendance_records
SET xp_awarded = TRUE
WHERE status IN ('present', 'late')
  AND xp_awarded = FALSE;
