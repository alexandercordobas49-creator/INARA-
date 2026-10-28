# INARA — PostgreSQL single source of truth

Esta carpeta contiene el esquema y las migraciones de PostgreSQL de INARA.

## Instalación limpia

Para desarrollo local/demo, desde la raíz del repositorio, en `psql` conectado
a una base vacía:

```sql
\i 'database/schema.sql'
\i 'database/schema/011_dropout_prevention.sql'
\i 'database/012_intervention_types.sql'
\i 'database/013_notification_read_state.sql'
\i 'database/014_password_reset_tokens.sql'
\i 'database/015_course_students_contract.sql'
```

Para una base vacía de producción, usa en su lugar el bootstrap reproducible
sin rutas demo:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f database/016_inara_initial_schema.sql
```

El bootstrap crea el esquema completo y los catálogos base de niveles/logros,
pero no crea usuarios, cursos ni rutas de competencia de ejemplo. Usa solo una
base `public` vacía o una instalación completa del mismo bootstrap; no lo uses
para reparar automáticamente un esquema parcial o legacy.

## Migración de una base existente

Si la base ya fue creada con `schema.sql` y los módulos anteriores:

```sql
\i 'database/010_postgresql_single_source.sql'
\i 'database/schema/011_dropout_prevention.sql'
\i 'database/012_intervention_types.sql'
\i 'database/013_notification_read_state.sql'
\i 'database/014_password_reset_tokens.sql'
\i 'database/015_course_students_contract.sql'
```

La migración agrega:

- rol `parent`
- relaciones padre-estudiante
- notificaciones
- rutas de competencias
- progreso de competencias
- evidencias
- logros base y rutas demo

La migración 011 agrega el flujo de prevención del abandono:

- evaluaciones históricas en `student_risk`
- recomendaciones enlazadas en `recommendations`
- intervenciones docentes en `interventions`, con estado, recomendación asociada y próxima fecha de seguimiento

La migración 014 crea `password_reset_tokens` para almacenar hashes de tokens de restablecimiento de un solo uso y con vencimiento.

El bootstrap 016 instala el mismo contrato de tablas para una base de producción
nueva, incluye `is_read` y `password_reset_tokens`, y omite deliberadamente las
rutas demo insertadas por `schema.sql`.

## Verificación

```sql
\dt
SELECT typname, enum_range(NULL::user_role) FROM pg_type WHERE typname = 'user_role';
SELECT COUNT(*) AS users FROM users;
SELECT COUNT(*) AS attendance FROM attendance_records;
SELECT COUNT(*) AS achievements FROM achievements;
SELECT COUNT(*) AS parent_relations FROM parent_relations;
SELECT COUNT(*) AS notifications FROM notifications;
SELECT COUNT(*) AS competency_routes FROM competency_routes;
SELECT COUNT(*) AS competency_progress FROM user_competency_progress;
SELECT COUNT(*) AS evidences FROM evidences;
SELECT COUNT(*) AS risk_evaluations FROM student_risk;
SELECT COUNT(*) AS recommendations FROM recommendations;
SELECT COUNT(*) AS interventions FROM interventions;
```

El backend ya no debe depender de `backend/src/data/database.json` ni de `backend/src/data/store.js`.

## Compatibilidad y seguridad operacional

La migración `database/schema/007_course_students.sql` define la relación
legacy con las columnas `status` y `enrolled_at`. El esquema consolidado y el
backend actual esperan `enrollment_status` y `created_at`. La migración 015
renombra esas columnas solo cuando existe el formato legacy y el nombre nuevo
no existe; si encuentra ambos formatos, se detiene para revisión manual y no
borra columnas ni datos.

`schema.sql` es un bootstrap para una base nueva: sus `CREATE TYPE`/`CREATE
TABLE` no son idempotentes y también inserta filas iniciales en `levels`,
`achievements` y `competency_routes`. No lo vuelvas a ejecutar sobre una base
existente. Las migraciones no se ejecutan al iniciar el backend. Antes de
aplicar cualquier SQL en Neon, confirma el branch/base objetivo, revisa el
esquema actual, respalda o crea una rama de prueba y aprueba explícitamente el
plan y sus efectos.

La base `neondb` de la rama Neon `production` ya recibió
`016_inara_initial_schema.sql` en una transacción. La comprobación posterior
confirmó todas las columnas requeridas y `/api/health` respondió `200`. No se
insertaron usuarios, cursos ni rutas demo.

La API limita lecturas de asistencia, dashboard, XP, logros, matrículas y
cursos por rol: administradores pueden consultar globalmente; docentes quedan
limitados a sus cursos activos; estudiantes a sus propios datos; y padres a
estudiantes relacionados. Las escrituras docentes de asistencia/matrícula
requieren cursos asignados y matrícula activa cuando corresponda.

## Motor y demostracion

El motor oficial calcula un score de 0 a 100 con estas ponderaciones: asistencia 30%, XP 20%, engagement 20%, racha 15% y progreso de competencias 15%. Cada factor aumenta cuando la señal indica menor continuidad. Los niveles son `low` (0-34), `medium` (35-59), `high` (60-79) y `critical` (80-100).

Cada evaluacion crea una fila historica en `student_risk`. La recomendacion `SYSTEM` activa del mismo tipo se reutiliza y se enlaza a la evaluacion mas reciente, evitando duplicados. Los cambios de asistencia y los eventos creados por `XPService.addXP` ejecutan automaticamente una nueva evaluacion.

Para demostrar el ciclo: registra asistencia desde `POST /api/attendance`, agrega XP mediante el servicio existente, consulta `GET /api/risk/students`, ejecuta `POST /api/alerts/run` como administrador, registra una intervencion con `POST /api/risk/interventions` y vuelve a evaluar con `POST /api/risk/evaluate/:studentId`. El historial queda disponible en `GET /api/risk/:studentId`.
