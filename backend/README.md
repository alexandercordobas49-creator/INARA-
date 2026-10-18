# INARA Backend

API REST de INARA construida con Express y PostgreSQL.

## Rutas principales

- `GET /api/health` — comprueba que la API esté activa.
- `GET /api/health/db` — comprueba la conexión con PostgreSQL.
- `POST /api/auth/login` — inicia sesión con `{ email, password }`.
- `POST /api/auth/register` — crea una cuenta de estudiante con `{ firstName, lastName, email, password }`.
- `POST /api/auth/forgot` — solicita un enlace de recuperación.
- `POST /api/auth/reset` — cambia la contraseña con `{ email, token, password }`; el token debe ser válido, no vencido y de un solo uso.

El registro público no permite crear roles de docente, tutor o administrador. Esos roles se asignan desde administración.

## Variables de entorno

Copia `.env.example` a `.env` y configura `DATABASE_URL` y un `JWT_SECRET` aleatorio de al menos 32 caracteres. Para producción, define también `FRONTEND_URL` y SMTP (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`). No subas `.env` ni credenciales a Git.

## Base de datos

Para una base nueva, aplica `database/schema.sql` desde la raíz del repositorio. Para una base existente, crea un respaldo y aplica las migraciones pendientes en orden, incluida `database/010_postgresql_single_source.sql`.

La recuperación guarda solo el hash del token; los enlaces expiran a los 30 minutos y se invalidan después de usarse. En desarrollo, si SMTP no está configurado, el endpoint puede devolver un token de prueba. En producción nunca devuelve el token en la respuesta.

## Pruebas

Pruebas unitarias e integración básica:

```bash
npm test
```

Las pruebas de integración que escriben en la base requieren una base PostgreSQL separada y estas variables:

```env
DB_HOST_TEST=localhost
DB_PORT_TEST=5432
DB_NAME_TEST=inara_test
DB_USER_TEST=postgres
DB_PASSWORD_TEST=secret
NODE_ENV=test
RUN_DB_TESTS=1
```

No ejecutes pruebas de escritura contra la base de producción.
