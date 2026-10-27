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
    SELECT
      current_database() AS database_name,
      current_schema() AS schema_name,
      ARRAY(
        SELECT required.table_name
        FROM unnest(ARRAY[
          'users',
          'courses',
          'course_students',
          'attendance_records',
          'levels',
          'achievements',
          'user_achievements',
          'streaks',
          'xp_events',
          'student_risk',
          'recommendations',
          'interventions',
          'parent_relations',
          'notifications',
          'competency_routes',
          'user_competency_progress',
          'evidences',
          'password_reset_tokens'
        ]::text[]) AS required(table_name)
        WHERE to_regclass(format('public.%I', required.table_name)) IS NULL
      ) AS missing_tables
  `);

  const row = result.rows[0];
  const missingTables = row?.missing_tables ?? [];

  return {
    databaseConnected: true,
    databaseName: row?.database_name ?? null,
    schemaName: row?.schema_name ?? null,
    missingTables,
    schemaAvailable: missingTables.length === 0
  };
}

export async function connectDatabase() {
  try {
    const status = await checkDatabase();
    if (!status.schemaAvailable) {
      const error = new Error("The required INARA database schema is not available.");
      error.code = "INARA_SCHEMA_MISSING";
      error.missingTables = status.missingTables;
      error.databaseName = status.databaseName;
      error.schemaName = status.schemaName;
      throw error;
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
    if (error.missingTables?.length) {
      console.error(`Connected database: ${error.databaseName ?? "unknown"}; schema: ${error.schemaName ?? "unknown"}.`);
      console.error(`Missing INARA tables: ${error.missingTables.join(", ")}`);
    }
    throw error;
  }
}
