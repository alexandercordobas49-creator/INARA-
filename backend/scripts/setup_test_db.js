import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const dbName = process.env.DB_NAME_TEST || process.env.DB_NAME;
const dbUser = process.env.DB_USER_TEST || process.env.DB_USER;
const dbHost = process.env.DB_HOST_TEST || process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT_TEST || process.env.DB_PORT || '5432';
const dbPassword = process.env.DB_PASSWORD_TEST || process.env.DB_PASSWORD;

if (!dbName || !dbUser) {
  console.error('Faltan variables DB_NAME_TEST/DB_USER_TEST o DB_NAME/DB_USER en .env');
  process.exit(1);
}

const env = {
  ...process.env,
  PGPASSWORD: dbPassword || '',
};

const sqlPath = path.resolve(process.cwd(), '..', 'database', 'schema.sql');

try {
  console.log(`Creando base de datos de prueba: ${dbName}`);
  execSync(`createdb -h ${dbHost} -p ${dbPort} -U ${dbUser} ${dbName}`, { env, stdio: 'inherit' });
} catch (error) {
  if (error.status === 1) {
    console.log('La base de datos ya existe, continuo con el esquema...');
  } else {
    console.error('Error creando la base de datos:', error.message);
    process.exit(1);
  }
}

try {
  console.log(`Aplicando esquema desde ${sqlPath}`);
  execSync(`psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${sqlPath}"`, { env, stdio: 'inherit' });
  console.log('Esquema aplicado correctamente.');
} catch (error) {
  console.error('Error aplicando el esquema:', error.message);
  process.exit(1);
}
