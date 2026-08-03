# INARA Backend

Este directorio contiene la API de backend de INARA, incluida la autenticación, los endpoints de asistencia y gestión de usuarios.

## Rutas principales

- `GET /api/health` — Verifica que el servicio esté activo.
- `POST /api/auth/login` — Inicia sesión con `{ email, password }`.
- `POST /api/auth/register` — Registra un usuario con `{ firstName, lastName, email, password, role }`.
- `POST /api/auth/forgot` — Solicita restablecimiento de contraseña con `{ email }`.
- `POST /api/auth/reset` — Restablece la contraseña con `{ email, token, password }`.

> Nota: actualmente el endpoint `/auth/reset` acepta cualquier token en modo de desarrollo; en producción debe implementarse verificación de token expirado.

## Configuración de la base de datos de prueba

El backend usa `dotenv` para cargar la configuración de la base de datos desde `.env`.

Variables recomendadas para pruebas:

```env
DB_HOST_TEST=localhost
DB_PORT_TEST=5432
DB_NAME_TEST=inara_test
DB_USER_TEST=postgres
DB_PASSWORD_TEST=secret
NODE_ENV=test
RUN_DB_TESTS=1
```

### Crear base de datos de prueba

Hay un script de ayuda que crea la base de datos de prueba y aplica el esquema SQL:

```bash
cd backend
npm run setup:test-db
```

Asegúrate de tener instalados `createdb` y `psql` en tu entorno de PostgreSQL.

## Ejecutar pruebas

Pruebas unitarias e integración básica:

```bash
cd backend
npm test
```

Pruebas de integración que usan la base de datos de prueba:

```bash
cd backend
NODE_ENV=test RUN_DB_TESTS=1 npm test
```

## Notas adicionales

- El archivo `src/config/database.js` usa variables con sufijo `_TEST` cuando `NODE_ENV=test`.
- El script `backend/scripts/setup_test_db.js` aplica `database/schema.sql` a la base de datos configurada.
- Si deseas pruebas completas de `login/register`, asegúrate de ejecutar el entorno de pruebas sobre una base de datos separada para no afectar datos de desarrollo.
