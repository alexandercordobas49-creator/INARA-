# INARA

Plataforma educativa con React/Vite, API Express y PostgreSQL como fuente única de datos.

## Requisitos

- Node.js 20 o superior
- npm
- Una instancia PostgreSQL (local o alojada)

## Desarrollo local

1. Copia `backend/.env.example` a `backend/.env`.
2. Configura `DATABASE_URL` con tu base PostgreSQL y genera un `JWT_SECRET` aleatorio de al menos 32 caracteres.
3. Crea un base de datos vacía llamada `inara` y aplica `database/schema.sql` usando un cliente PostgreSQL, por ejemplo `psql`.
4. Desde la raíz del repositorio ejecuta:

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000
- Comprobación de API: http://localhost:3000/api/health\n- Comprobación de PostgreSQL: http://localhost:3000/api/health/db

No se incluyen cuentas demo precreadas en la configuración PostgreSQL. Registra una cuenta desde la interfaz; el registro público crea una cuenta de estudiante. Los roles de docente, tutor y administrador deben asignarse de forma administrativa.

## Base de datos

PostgreSQL es la única fuente persistente. No se debe depender de archivos JSON para guardar cuentas, cursos, asistencia, XP ni progreso.

- Esquema para una base nueva: `database/schema.sql`
- Migración de consolidación para una base existente: `database/010_postgresql_single_source.sql`, después de las migraciones anteriores indicadas en ese archivo.

No ejecutes el esquema de instalación limpia sobre una base ya inicializada. Antes de migrar una base con información, crea un respaldo.

## Publicación en Vercel

La configuración está en `vercel.json` y define dos servicios en un mismo dominio:

- `frontend`: aplicación Vite, con fallback para rutas de React Router.
- `backend`: API Express, expuesta bajo `/api/*`.

Pasos:

1. Crea una base PostgreSQL administrada (por ejemplo, Neon o Supabase) y copia la cadena de conexión privada/servidor, no una contraseña en el código.
2. En Vercel importa este repositorio y configura el framework del proyecto como **Services**.
3. Añade las variables de entorno al servicio backend en Preview y Production:
   - `DATABASE_URL`: cadena de conexión PostgreSQL con SSL según el proveedor.
   - `JWT_SECRET`: secreto aleatorio de al menos 32 caracteres.
   - `FRONTEND_URL`: URL pública de la aplicación para enlaces de recuperación de contraseña.
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`: necesarios para enviar recuperación de contraseña por correo.
4. Para una base nueva, aplica `database/schema.sql` una sola vez. Para una base existente, ejecuta las migraciones pendientes en orden.
5. Despliega una Preview y comprueba `/api/health`. Debe devolver `ok: true` y `database: "connected"`.
6. Prueba registro, cierre de sesión, inicio de sesión, cursos, asistencia, dashboard, XP, logros, competencias y recuperación de contraseña antes de promover a producción.

La publicación no se considera verificada hasta que Vercel construya ambos servicios, las migraciones estén aplicadas y las pruebas de integración pasen.

## Funciones principales

- Registro e inicio de sesión con contraseñas cifradas y tokens JWT.
- Roles y permisos para estudiantes, docentes, tutores y administradores.
- Cursos, matrículas y asistencia.
- Dashboard, XP, niveles, logros y rachas.
- Atlas IA con datos académicos del estudiante.
- Rutas de competencias, evidencias y seguimiento.
- Alertas y recuperación segura de contraseña.

## Pruebas del backend

```bash
cd backend
npm test
```

Para pruebas que requieren PostgreSQL, configura una base de pruebas independiente y sigue las instrucciones de `backend/README.md`.
