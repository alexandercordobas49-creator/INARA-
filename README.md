# INARA

Proyecto completo para abrir directamente en VS Code.

## Requisitos

- Node.js 20 o superior
- VS Code

## Como usar

1. Abre la carpeta `INARA` en VS Code.
2. Abre la terminal integrada.
3. Ejecuta:

```bash
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:4000
```

## Usuarios demo

Todos usan la contrasena:

```text
demo123
```

- Estudiante: `valeria@INARA.test`
- Docente: `marco@INARA.test`
- Administrador: `admin@INARA.test`

## Modulos funcionales

1. Login y registro
2. Roles: estudiante, docente y administrador
3. Sistema de asistencia
4. Dashboard del estudiante
5. XP y niveles
6. Logros y rachas
7. Atlas IA local

## Persistencia

El backend utiliza PostgreSQL. Configura `DATABASE_URL` en `backend/.env`
para desarrollo local; el backend acepta también las variables heredadas
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`. No coloques
credenciales de base de datos en variables `VITE_*` ni en el frontend.

## PostgreSQL

El diseno SQL esta en:

```text
database/schema.sql
```

La aplicación no aplica el esquema automáticamente. Revisa las instrucciones
y el impacto de cada migración en `database/README.md` antes de ejecutarla.
