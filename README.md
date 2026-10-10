# INARA

Plataforma educativa con cuentas, cursos, asistencia y seguimiento académico basada en PostgreSQL.

## Requisitos

- Node.js 20 o superior
- PostgreSQL

## Configuración

1. Instala las dependencias desde la raíz con `npm install`.
2. Copia `backend/.env.example` a `backend/.env` y configura PostgreSQL y un `JWT_SECRET` aleatorio de al menos 32 caracteres.
3. Crea la base de datos indicada por `DB_NAME` y aplica `database/schema.sql`. Para una base existente, aplica en orden `007_course_students.sql`, `008_student_risk.sql`, `009_recommendations.sql`, `010_attendance_xp_awarded.sql`, `011_auth_sessions_password_reset.sql`, `012_json_backed_application_data.sql` y `013_case_insensitive_user_email.sql`. La migración 009 está en `database/`; las demás, en `database/schema/`.
4. Inicia la plataforma con `npm run dev`.

La interfaz estará disponible en `http://localhost:5173` y la API en el puerto configurado por `PORT` (predeterminado: `4000`). Configura `frontend/.env` con `VITE_API_PROXY_TARGET` si el backend usa otro puerto.

No se distribuyen cuentas demo ni se crean usuarios automáticamente. Registra un estudiante desde la interfaz; las cuentas administrativas/docentes deben crearse y asignarse de forma controlada.

## Verificación

- `npm test --workspace backend`
- `npm run build --workspace frontend`

El backend requiere PostgreSQL configurado. Las pruebas que usan base de datos deben apuntar exclusivamente a una base cuyo nombre termine en `_test`; consulta [backend/README.md](./backend/README.md) para configurar el entorno y ejecutar el importador JSON de manera segura.
