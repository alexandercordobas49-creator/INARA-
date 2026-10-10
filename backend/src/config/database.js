import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const useTest = process.env.NODE_ENV === 'test';
const testDatabase = process.env.DB_NAME_TEST || 'inara_test';

if (useTest) {
  if (!/^[a-z0-9_]*_test$/i.test(testDatabase)) {
    throw new Error('NODE_ENV=test requiere DB_NAME_TEST con sufijo _test; no se permite usar la base de desarrollo');
  }
}

export const pool = new Pool({
  host: useTest ? process.env.DB_HOST_TEST : process.env.DB_HOST,
  port: Number(useTest ? process.env.DB_PORT_TEST : process.env.DB_PORT),
  database: useTest ? testDatabase : process.env.DB_NAME,
  user: useTest ? process.env.DB_USER_TEST : process.env.DB_USER,
  password: useTest ? process.env.DB_PASSWORD_TEST : process.env.DB_PASSWORD,
});

export async function connectDatabase() {
  try {
    const client = await pool.connect();

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ PostgreSQL Connected");
    console.log(`📦 Database: ${process.env.NODE_ENV === 'test' ? process.env.DB_NAME_TEST : process.env.DB_NAME}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    client.release();
  } catch (error) {
    console.error("❌ PostgreSQL Connection Error");
    console.error(error.message);
    process.exit(1);
  }
}