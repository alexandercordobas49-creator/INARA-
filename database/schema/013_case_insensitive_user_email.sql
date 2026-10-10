DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    GROUP BY LOWER(email)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate user emails ignoring case; resolve them before applying migration 013';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_case_insensitive_idx
  ON users (LOWER(email));
