import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const dbName = process.env.DB_NAME_TEST;
const dbUser = process.env.DB_USER_TEST;
const dbHost = process.env.DB_HOST_TEST || 'localhost';
const dbPort = process.env.DB_PORT_TEST || '5432';
const dbPassword = process.env.DB_PASSWORD_TEST;

if (!dbName || !dbUser) {
  console.error('Define DB_NAME_TEST y DB_USER_TEST en backend/.env antes de preparar la base de pruebas.');
  process.exit(1);
}

if (!['localhost', '127.0.0.1', '::1'].includes(dbHost)) {
  console.error('El setup de pruebas solo permite PostgreSQL local; no se conectará a hosts remotos.');
  process.exit(1);
}

if (!/^\d+$/.test(dbPort) || Number(dbPort) < 1 || Number(dbPort) > 65535) {
  console.error('DB_PORT_TEST debe ser un puerto válido.');
  process.exit(1);
}

const env = {
  ...process.env,
  PGPASSWORD: dbPassword || '',
};

const sqlPath = path.resolve(process.cwd(), '..', 'database', 'schema.sql');
const riskMigrationPath = path.resolve(process.cwd(), '..', 'database', 'schema', '011_dropout_prevention.sql');
const interventionMigrationPath = path.resolve(process.cwd(), '..', 'database', '012_intervention_types.sql');
const notificationMigrationPath = path.resolve(process.cwd(), '..', 'database', '013_notification_read_state.sql');
const passwordResetMigrationPath = path.resolve(process.cwd(), '..', 'database', '014_password_reset_tokens.sql');

try {
  console.log(`Creando base de datos de prueba: ${dbName}`);
  execFileSync('createdb', [
    '--if-not-exists',
    '-h', dbHost,
    '-p', dbPort,
    '-U', dbUser,
    dbName
  ], { env, stdio: 'inherit' });
} catch (error) {
  console.error('No se pudo crear o comprobar la base de datos local de pruebas.');
  process.exit(1);
}

try {
  console.log(`Aplicando esquema desde ${sqlPath}`);
  const psqlArgs = ['-h', dbHost, '-p', dbPort, '-U', dbUser, '-d', dbName, '-v', 'ON_ERROR_STOP=1', '-f'];
  execFileSync('psql', [...psqlArgs, sqlPath], { env, stdio: 'inherit' });
  execFileSync('psql', [...psqlArgs, riskMigrationPath], { env, stdio: 'inherit' });
  execFileSync('psql', [...psqlArgs, interventionMigrationPath], { env, stdio: 'inherit' });
  execFileSync('psql', [...psqlArgs, notificationMigrationPath], { env, stdio: 'inherit' });
  execFileSync('psql', [...psqlArgs, passwordResetMigrationPath], { env, stdio: 'inherit' });
  console.log('Esquema y migraciones aplicados correctamente.');
} catch {
  console.error('Error aplicando el esquema a la base de pruebas local.');
  process.exit(1);
}
