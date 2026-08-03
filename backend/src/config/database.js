import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const useTest = process.env.NODE_ENV === 'test';

export const pool = new Pool({
  host: useTest ? process.env.DB_HOST_TEST || process.env.DB_HOST : process.env.DB_HOST,
  port: Number(useTest ? (process.env.DB_PORT_TEST || process.env.DB_PORT) : process.env.DB_PORT),
  database: useTest ? process.env.DB_NAME_TEST || process.env.DB_NAME : process.env.DB_NAME,
  user: useTest ? process.env.DB_USER_TEST || process.env.DB_USER : process.env.DB_USER,
  password: useTest ? process.env.DB_PASSWORD_TEST || process.env.DB_PASSWORD : process.env.DB_PASSWORD,
});

export async function connectDatabase() {
  try {
    const client = await pool.connect();

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ PostgreSQL Connected");
    console.log(`📦 Database: ${process.env.DB_NAME}`);
    console.log(`👤 User: ${process.env.DB_USER}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    client.release();
  } catch (error) {
    console.error("❌ PostgreSQL Connection Error");
    console.error(error.message);
    process.exit(1);
  }
}