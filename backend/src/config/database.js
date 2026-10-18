import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const useTest = process.env.NODE_ENV === "test";

const connectionString = useTest
  ? process.env.DATABASE_URL_TEST
  : process.env.DATABASE_URL;

const testValue = (testKey, normalKey) =>
  useTest ? process.env[testKey] || process.env[normalKey] : process.env[normalKey];

const sslEnabled = process.env.DB_SSL === "true";
const ssl = sslEnabled
  ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
  : undefined;

const poolConfig = connectionString
  ? {
      connectionString,
      ...(ssl ? { ssl } : {}),
    }
  : {
      host: testValue("DB_HOST_TEST", "DB_HOST"),
      port: Number(testValue("DB_PORT_TEST", "DB_PORT") || 5432),
      database: testValue("DB_NAME_TEST", "DB_NAME"),
      user: testValue("DB_USER_TEST", "DB_USER"),
      password: testValue("DB_PASSWORD_TEST", "DB_PASSWORD"),
      ...(ssl ? { ssl } : {}),
    };

export const pool = new Pool({
  ...poolConfig,
  max: Number(process.env.DB_POOL_MAX || 5),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: true,
});

pool.on("error", (error) => {
  console.error("Error inesperado en una conexión inactiva de PostgreSQL:", error.message);
});

export async function connectDatabase() {
  let client;

  try {
    client = await pool.connect();
    await client.query("SELECT 1");
    console.log("✅ INARA conectado a PostgreSQL.");
  } catch (error) {
    console.error("❌ No se pudo conectar a PostgreSQL:", error.message);
    throw error;
  } finally {
    client?.release();
  }
}
