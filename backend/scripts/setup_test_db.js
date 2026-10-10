import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, '../..');
const testDatabase = process.env.DB_NAME_TEST;
const testUser = process.env.DB_USER_TEST;
const testHost = process.env.DB_HOST_TEST || 'localhost';
const testPort = Number(process.env.DB_PORT_TEST || 5432);
const testPassword = process.env.DB_PASSWORD_TEST;

if (!testDatabase || !/^[a-z0-9_]*_test$/i.test(testDatabase)) {
  throw new Error('Define DB_NAME_TEST con sufijo _test; no se permite usar una base de datos de desarrollo.');
}
if (!testUser || !Number.isInteger(testPort) || testPort < 1 || testPort > 65535) {
  throw new Error('Define DB_USER_TEST y un DB_PORT_TEST válido.');
}

const connectionConfig = {
  host: testHost,
  port: testPort,
  user: testUser,
  password: testPassword
};
const adminPool = new Pool({ ...connectionConfig, database: 'postgres' });
let testPool;

const migrations = [
  ['007_course_students.sql', path.join(repositoryRoot, 'database', 'schema', '007_course_students.sql')],
  ['008_student_risk.sql', path.join(repositoryRoot, 'database', 'schema', '008_student_risk.sql')],
  ['009_recommendations.sql', path.join(repositoryRoot, 'database', '009_recommendations.sql')],
  ['010_attendance_xp_awarded.sql', path.join(repositoryRoot, 'database', 'schema', '010_attendance_xp_awarded.sql')],
  ['011_auth_sessions_password_reset.sql', path.join(repositoryRoot, 'database', 'schema', '011_auth_sessions_password_reset.sql')],
  ['012_json_backed_application_data.sql', path.join(repositoryRoot, 'database', 'schema', '012_json_backed_application_data.sql')],
  ['013_case_insensitive_user_email.sql', path.join(repositoryRoot, 'database', 'schema', '013_case_insensitive_user_email.sql')]
];

async function main() {
  const admin = await adminPool.connect();
  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [testDatabase]);
    if (!exists.rows.length) {
      const safeIdentifier = `"${testDatabase.replaceAll('"', '""')}"`;
      await admin.query(`CREATE DATABASE ${safeIdentifier}`);
    }
  } finally {
    admin.release();
  }

  testPool = new Pool({ ...connectionConfig, database: testDatabase });
  const client = await testPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS inara_schema_migrations (
        migration_name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const base = await client.query(
      'SELECT 1 FROM inara_schema_migrations WHERE migration_name = $1',
      ['schema.sql']
    );

    if (!base.rows.length) {
      const existingTables = await client.query(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            AND table_name <> 'inara_schema_migrations'
          LIMIT 1
        `
      );
      if (existingTables.rows.length) {
        throw new Error('La base de pruebas ya contiene tablas sin registro del esquema; no se modificó. Usa una DB_NAME_TEST vacía.');
      }

      const schema = await fs.readFile(path.join(repositoryRoot, 'database', 'schema.sql'), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(schema);
        await client.query(
          'INSERT INTO inara_schema_migrations (migration_name) VALUES ($1)',
          ['schema.sql']
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    for (const [name, migrationPath] of migrations) {
      const alreadyApplied = await client.query(
        'SELECT 1 FROM inara_schema_migrations WHERE migration_name = $1',
        [name]
      );
      if (alreadyApplied.rows.length) continue;

      const sql = await fs.readFile(migrationPath, 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO inara_schema_migrations (migration_name) VALUES ($1)',
          [name]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${name} failed; transaction rolled back: ${error.message}`, { cause: error });
      }
    }

    console.log(`Test database ${testDatabase} is initialized.`);
  } finally {
    client.release();
    await testPool.end();
  }
}

try {
  await main();
} finally {
  await adminPool.end();
}
