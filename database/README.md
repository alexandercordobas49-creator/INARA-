# INARA — PostgreSQL single source of truth

Esta carpeta contiene el esquema y las migraciones de PostgreSQL de INARA.

## Instalación limpia

Desde `psql` conectado a la base `inara`:

```sql
\i 'C:/Users/Usuario/Documents/GitHub/INA-Track/database/schema.sql'
```

## Migración de una base existente

Si la base ya fue creada con `schema.sql` y los módulos anteriores:

```sql
\i 'C:/Users/Usuario/Documents/GitHub/INA-Track/database/010_postgresql_single_source.sql'
```

La migración agrega:

- rol `parent`
- relaciones padre-estudiante
- notificaciones
- rutas de competencias
- progreso de competencias
- evidencias
- logros base y rutas demo

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
```

El backend ya no debe depender de `backend/src/data/database.json` ni de `backend/src/data/store.js`.
