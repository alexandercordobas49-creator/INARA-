import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

export function createPoolConfig(env = process.env) {
  const useTest = env.NODE_ENV === "test";
  const connectionString = useTest
    ? env.DATABASE_URL_TEST
    : env.DATABASE_URL;
  const sharedOptions = {
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 30_000,
    idle_in_transaction_session_timeout: 10_000
  };

  if (connectionString) {
    let url;
    try {
      url = new URL(connectionString);
    } catch {
      throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
    }

    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      throw new Error("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
    }

    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
    const useSsl = env.NODE_ENV === "production" ||
      url.hostname.endsWith(".neon.tech") ||
      Boolean(sslMode && sslMode !== "disable");

    if (useSsl) {
      // pg's sslmode=require disables certificate verification; configure TLS explicitly instead.
      url.searchParams.delete("sslmode");
    }

    return {
      ...sharedOptions,
      connectionString: url.toString(),
      ...(useSsl ? { ssl: { rejectUnauthorized: true } } : {})
    };
  }

  const getLegacyValue = (key) =>
    useTest ? env[`${key}_TEST`] || env[key] : env[key];
  const portValue = getLegacyValue("DB_PORT");
  const port = portValue ? Number(portValue) : 5432;

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("DB_PORT must be an integer between 1 and 65535.");
  }

  return {
    ...sharedOptions,
    host: getLegacyValue("DB_HOST"),
    port,
    database: getLegacyValue("DB_NAME"),
    user: getLegacyValue("DB_USER"),
    password: getLegacyValue("DB_PASSWORD"),
    ...(env.NODE_ENV === "production"
      ? { ssl: { rejectUnauthorized: true } }
      : {})
  };
}

export const pool = new Pool(createPoolConfig());

pool.on("error", (error) => {
  console.error(
    `Unexpected PostgreSQL pool error${error.code ? ` (${error.code})` : ""}.`
  );
});

export async function checkDatabase() {
  const result = await pool.query(`
    SELECT current_database(), current_schema(), NOW(),
      (
        to_regclass('public.users') IS NOT NULL AND
        to_regclass('public.courses') IS NOT NULL AND
        to_regclass('public.course_students') IS NOT NULL AND
        to_regclass('public.attendance_records') IS NOT NULL AND
        to_regclass('public.levels') IS NOT NULL AND
        to_regclass('public.achievements') IS NOT NULL AND
        to_regclass('public.user_achievements') IS NOT NULL AND
        to_regclass('public.streaks') IS NOT NULL AND
        to_regclass('public.xp_events') IS NOT NULL AND
        to_regclass('public.student_risk') IS NOT NULL AND
        to_regclass('public.recommendations') IS NOT NULL AND
        to_regclass('public.interventions') IS NOT NULL AND
        to_regclass('public.parent_relations') IS NOT NULL AND
        to_regclass('public.notifications') IS NOT NULL AND
        to_regclass('public.competency_routes') IS NOT NULL AND
        to_regclass('public.user_competency_progress') IS NOT NULL AND
        to_regclass('public.evidences') IS NOT NULL AND
        to_regclass('public.password_reset_tokens') IS NOT NULL
      ) AS schema_available
  `);

  return {
    databaseConnected: true,
    schemaAvailable: result.rows[0]?.schema_available === true
  };
}

export async function connectDatabase() {
  try {
    const status = await checkDatabase();
    if (!status.schemaAvailable) {
      throw new Error("The required INARA database schema is not available.");
    }

    console.log("PostgreSQL connected; INARA schema is available.");
    return status;
  } catch (error) {
    const code = error.code && error.code !== "INARA_SCHEMA_MISSING"
      ? ` (${error.code})`
      : "";
    console.error(
      `PostgreSQL connection or INARA schema check failed${code}. Verify DATABASE_URL or DB_* settings and review the required migrations.`
    );
    throw error;
  }
}
