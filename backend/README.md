# INARA Backend

Este directorio contiene la API de backend de INARA, incluida la autenticación, los endpoints de asistencia y gestión de usuarios.

## Variables de entorno

Copia `backend/.env.example` a `.env` y define los valores antes de iniciar el backend en desarrollo o producción.

```bash
cp backend/.env.example backend/.env
```

Variables clave:

```env
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inara
DB_USER=postgres
DB_PASSWORD=changeme
JWT_SECRET=generar_un_secreto_de_32_caracteres_o_mas
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
EMAIL_FROM="INARA <no-reply@inara.local>"
```

La variable `JWT_SECRET` es obligatoria en producción y debe tener al menos 32 caracteres. No se debe utilizar el valor por defecto ni conservar secretos en el repositorio.

## Rutas principales

- `GET /api/health` — Verifica que el servicio esté activo.
- `POST /api/auth/login` — Inicia sesión con `{ email, password }`.
- `POST /api/auth/register` — Registra únicamente estudiantes, ignorando roles privilegiados enviados por el cliente.
- `POST /api/auth/forgot` — Solicita restablecimiento de contraseña con `{ email }`.
- `POST /api/auth/reset` — Restablece la contraseña con `{ email, token, password }`.

## Recuperación de contraseñas

El flujo de recuperación usa tokens aleatorios cargados en PostgreSQL con hash SHA-256, expiración y un solo uso. Si no se configura el servicio SMTP, el backend responde con un mensaje genérico y no simula que el correo fue enviado.

## Base de datos y pruebas

El backend usa `dotenv` para cargar la configuración desde `.env`. Para pruebas, usa una base separada:

```env
DB_HOST_TEST=localhost
DB_PORT_TEST=5432
DB_NAME_TEST=inara_test
DB_USER_TEST=postgres
DB_PASSWORD_TEST=changeme
NODE_ENV=test
RUN_DB_TESTS=1
```

### Crear base de datos de prueba

```bash
cd backend
npm run setup:test-db
```

Asegúrate de tener instalados `createdb` y `psql` en tu entorno de PostgreSQL.

## Ejecutar pruebas

```bash
cd backend
npm test
```

Pruebas con base de datos de pruebas:

```bash
cd backend
NODE_ENV=test RUN_DB_TESTS=1 npm test
```

## Iniciar el backend

```bash
cd backend
npm install
npm run dev
```

## Iniciar el frontend

```bash
cd frontend
npm install
npm run dev
```

## Notas adicionales

- El archivo `src/config/database.js` usa variables con sufijo `_TEST` cuando `NODE_ENV=test`.
- El script `backend/scripts/setup_test_db.js` aplica `database/schema.sql` a la base de datos configurada.
- No se debe explotar información interna en errores ni devolver tokens de recuperación en respuestas de producción.
- Para una base existente, aplica las migraciones de `database/schema/` en orden. `010_attendance_xp_awarded.sql` agrega la protección de XP por asistencia y marca como premiadas las asistencias previas presentes/tardías. `011_auth_sessions_password_reset.sql` prepara las tablas de sesiones y recuperación de contraseña y agrega el rol `parent`.
- La creación de asistencia requiere una matrícula activa en `course_students`. El esquema principal crea esta tabla; si una base previa aún no la tiene, aplica `database/schema/007_course_students.sql`.
