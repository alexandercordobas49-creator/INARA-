# INARA Backend

Este directorio contiene la API de backend de INARA, incluida la autenticación, los endpoints de asistencia y gestión de usuarios.

## Rutas principales

- `GET /api/health` — Verifica que el servicio esté activo.
- `POST /api/auth/login` — Inicia sesión con `{ email, password }`.
- `POST /api/auth/register` — Registra un usuario con `{ firstName, lastName, email, password, role }`.
- `POST /api/auth/forgot` — Solicita restablecimiento de contraseña con `{ email }`.
- `POST /api/auth/reset` — Restablece la contraseña con `{ email, token, password }`.

El endpoint `/api/health` diferencia entre el servidor en ejecución, la
conexión de PostgreSQL y la disponibilidad del esquema requerido.

## Conexión PostgreSQL y Neon

El backend prioriza `DATABASE_URL`. En local, copia `backend/.env.example` a
`backend/.env` solo si aún no existe y configura allí el URL pooled de Neon
para tráfico normal. No reemplaces un `.env` existente. No imprimas ni
compartas el URL: incluye credenciales. Para instalaciones existentes también
se aceptan `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`.

En producción el pool usa TLS con validación de certificados. Para Neon se
recomienda el URL pooled de la rama y base de datos correctas. Configura
`DATABASE_URL` como variable privada en la configuración del servicio backend
de Vercel; no uses el prefijo `VITE_` ni la añadas al frontend.

Este repositorio no contiene `vercel.json` ni una función Vercel bajo `api/`.
La configuración de build/rutas debe coincidir con la arquitectura elegida
(backend separado o API en el mismo proyecto); no se ha desplegado ni validado
una ruta `/api/*` en Vercel desde este repositorio.

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

Si usas `DATABASE_URL_TEST`, debe apuntar a una base de datos desechable y
aislada. En modo test el pool no reutiliza `DATABASE_URL` para evitar conectar
accidentalmente a producción.

### Crear base de datos de prueba

Hay un script de ayuda que crea la base de datos de prueba y aplica el esquema SQL:

```bash
cd backend
npm run setup:test-db
```

Asegúrate de tener instalados `createdb` y `psql` y de que las variables
`*_TEST` apunten exclusivamente a una base de datos local aislada. Este script
requiere `DB_NAME_TEST` y `DB_USER_TEST`, solo permite localhost y aplica el
esquema con parada al primer error. Úsalo únicamente con una base de pruebas
nueva/vacía; nunca lo ejecutes contra Neon o producción.

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
- Las pruebas con base de datos requieren `RUN_DB_TESTS=1`; ejecútalas solo contra una base aislada.
- La aplicación no ejecuta migraciones al arrancar. Revisa `database/README.md` y obtén aprobación antes de modificar el esquema de una base persistente.
