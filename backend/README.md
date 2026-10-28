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

### Despliegue en Vercel

El repositorio es un monorepo con dos aplicaciones. Crea dos proyectos Vercel
desde el mismo repositorio y usa el mismo branch de Git:

1. Backend: Root Directory `backend`. Vercel detecta la aplicación Express
   exportada por `src/app.js`. Define `DATABASE_URL`, `JWT_SECRET` y
   `CORS_ORIGINS` como variables privadas. `CORS_ORIGINS` debe contener el
   origen exacto del frontend, por ejemplo `https://tu-frontend.vercel.app`
   (sin `/api`); separa orígenes con comas. Añade `TRUST_PROXY_HOPS=1` solo si
   el servicio se publica detrás de exactamente un proxy confiable; Vercel
   activa automáticamente un salto de proxy confiable.
2. Frontend: Root Directory `frontend`, Framework Preset Vite y Output
   Directory `dist`. Define `VITE_API_URL` con la URL del backend y el prefijo
   `/api`, por ejemplo `https://tu-backend.vercel.app/api`. Es una URL pública,
   no una credencial.
3. Despliega primero el backend, configura después el frontend y prueba
   `https://tu-backend.vercel.app/api/health` y los flujos con usuarios
   legítimos. Los dominios de ejemplo deben sustituirse por las URLs reales.

En desarrollo, CORS permite `localhost:5173`; en producción solo permite los
orígenes enumerados en `CORS_ORIGINS`. El middleware limita autenticación a 10
intentos por 15 minutos y recuperación de contraseña a 5 por hora. El límite
en memoria es por instancia; para un límite global consistente entre varias
instancias, configura una regla WAF Rate Limiting de Vercel para las rutas
`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot` y
`/api/auth/reset`:
[documentación oficial de Vercel](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).

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
