-- Normalize the legacy course_students column names without dropping data.
-- If both old and new names exist, stop for a manual data-preserving review.

DO $$
DECLARE
  has_status BOOLEAN;
  has_enrollment_status BOOLEAN;
  has_enrolled_at BOOLEAN;
  has_created_at BOOLEAN;
BEGIN
  IF to_regclass('public.course_students') IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_students'
      AND column_name = 'status'
  ) INTO has_status;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_students'
      AND column_name = 'enrollment_status'
  ) INTO has_enrollment_status;

  IF has_status AND has_enrollment_status THEN
    RAISE EXCEPTION 'course_students has both status and enrollment_status; reconcile values before migration';
  ELSIF has_status THEN
    ALTER TABLE public.course_students RENAME COLUMN status TO enrollment_status;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_students'
      AND column_name = 'enrolled_at'
  ) INTO has_enrolled_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_students'
      AND column_name = 'created_at'
  ) INTO has_created_at;

  IF has_enrolled_at AND has_created_at THEN
    RAISE EXCEPTION 'course_students has both enrolled_at and created_at; reconcile values before migration';
  ELSIF has_enrolled_at THEN
    ALTER TABLE public.course_students RENAME COLUMN enrolled_at TO created_at;
  END IF;
END $$;
