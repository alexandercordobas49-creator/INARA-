-- Normalize intervention types while preserving existing records.

ALTER TABLE interventions
  DROP CONSTRAINT IF EXISTS interventions_action_type_check;

UPDATE interventions
SET action_type = CASE action_type
  WHEN 'contacted' THEN 'CONTACT'
  WHEN 'meeting' THEN 'MEETING'
  WHEN 'academic_guidance' THEN 'ACADEMIC_SUPPORT'
  WHEN 'pending' THEN 'FOLLOW_UP'
  WHEN 'other' THEN 'OTHER'
  ELSE action_type
END;

ALTER TABLE interventions
  ADD CONSTRAINT interventions_action_type_check
  CHECK (action_type IN ('CONTACT', 'MEETING', 'ACADEMIC_SUPPORT', 'MOTIVATION', 'PARENT_CONTACT', 'FOLLOW_UP', 'OTHER'));