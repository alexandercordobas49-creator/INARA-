import cors from 'cors';
import express from 'express';

import achievementRoutes from './routes/achievementRoutes.js';
import atlasRoutes from './routes/atlasRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';
import xpRoutes from './routes/xpRoutes.js';
import alertsRoutes from './routes/alertsRoutes.js';
import competencyRoutes from './routes/competencyRoutes.js';
import courseStudentRoutes from './routes/courseStudentRoutes.js';
import riskRoutes from './routes/riskRoutes.js';
import { checkDatabase, pool } from './config/database.js';

const app = express();

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set(
  configuredOrigins.length
    ? configuredOrigins
    : process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:5173', 'http://127.0.0.1:5173']
);

const configuredProxyHops = process.env.TRUST_PROXY_HOPS;
const trustProxyHops = process.env.VERCEL === '1'
  ? 1
  : configuredProxyHops
    ? Number(configuredProxyHops)
    : 0;

if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
}

app.set('trust proxy', trustProxyHops || false);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  maxAge: 600
}));
app.use(express.json({ limit: '1mb' }));


// Ruta principal de la API
app.get('/', (req, res) => {
  res.json({
    name: 'INARA API',
    version: '2.0',
    status: 'running'
  });
});


// Readiness check: reports database connectivity and required schema separately.
app.get('/api/health', async (req, res) => {
  try {
    const { databaseConnected, schemaAvailable } = await checkDatabase();
    const ready = databaseConnected && schemaAvailable;

    return res.status(ready ? 200 : 503).json({
      ok: ready,
      service: 'INARA API',
      server: 'running',
      database: databaseConnected ? 'connected' : 'unavailable',
      schema: schemaAvailable ? 'available' : 'unavailable'
    });
  } catch (error) {
    console.error(
      `Database health check failed${error.code ? ` (${error.code})` : ''}.`
    );
    return res.status(503).json({
      ok: false,
      service: 'INARA API',
      server: 'running',
      database: 'unavailable',
      schema: 'unknown'
    });
  }
});


// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/course-students', courseStudentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/xp', xpRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/atlas', atlasRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/competency', competencyRoutes);
app.use('/api/risk', riskRoutes);

// Public summary for the interactive INATEC map. Only centers registered in
// the database are counted; a department with zero records is not evidence
// that it has no INATEC center.
app.get('/api/technological-centers/summary', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        department,
        COUNT(*)::int AS total,
        json_agg(
          json_build_object(
            'name', name,
            'municipality', municipality,
            'description', description,
            'address', address,
            'latitude', latitude,
            'longitude', longitude,
            'programs', programs,
            'website', website,
            'dataSourceUrl', data_source_url,
            'verifiedAt', verified_at
          ) ORDER BY name
        ) AS centers
      FROM public.technological_centers
      WHERE is_active = true
      GROUP BY department
      ORDER BY department
    `);
    const registeredCenters = result.rows.reduce((total, department) => total + department.total, 0);
    return res.json({
      source: 'INARA PostgreSQL · technological_centers',
      dataStatus: 'database_records',
      registeredCenters,
      officialDirectoryTotal: 74,
      officialSourceUrl: 'https://www.tecnacional.edu.ni/centros-tecnologicos/',
      departments: result.rows
    });
  } catch (error) {
    console.error('Unable to load technological center summary.', error.code || '');
    return res.status(500).json({ message: 'No se pudo cargar el directorio de centros tecnológicos.' });
  }
});


// Live platform metrics: only real accounts and records without demo markers.
app.get('/api/platform/metrics', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users
          WHERE role = 'student' AND LOWER(email) NOT LIKE '%.demo') AS students,
        (SELECT COUNT(*)::int FROM technological_centers WHERE is_active = true) AS centers,
        (SELECT COUNT(DISTINCT c.id)::int
          FROM courses c
          JOIN course_students cs ON cs.course_id = c.id AND cs.enrollment_status = 'active'
          JOIN users u ON u.id = cs.student_id
          WHERE u.role = 'student' AND LOWER(u.email) NOT LIKE '%.demo') AS courses,
        (SELECT COALESCE(SUM(x.points), 0)::int
          FROM xp_events x JOIN users u ON u.id = x.user_id
          WHERE u.role = 'student' AND LOWER(u.email) NOT LIKE '%.demo'
            AND COALESCE(x.description, '') NOT ILIKE '%piloto%'
            AND COALESCE(x.description, '') NOT ILIKE '%escenario%') AS xp,
        (SELECT COUNT(*)::int
          FROM attendance_records ar JOIN users u ON u.id = ar.user_id
          WHERE u.role = 'student' AND LOWER(u.email) NOT LIKE '%.demo'
            AND COALESCE(ar.notes, '') NOT ILIKE '%demostrativo%'
            AND COALESCE(ar.notes, '') NOT ILIKE '%ejemplo%'
            AND COALESCE(ar.notes, '') NOT ILIKE '%seguimiento formativo%'
            AND COALESCE(ar.notes, '') NOT ILIKE '%escenario piloto%') AS attendance_records,
        (SELECT CASE WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(COUNT(*) FILTER (WHERE ar.status IN ('present', 'late')) * 100.0 / COUNT(*))::int END
          FROM attendance_records ar JOIN users u ON u.id = ar.user_id
          WHERE u.role = 'student' AND LOWER(u.email) NOT LIKE '%.demo'
            AND COALESCE(ar.notes, '') NOT ILIKE '%demostrativo%'
            AND COALESCE(ar.notes, '') NOT ILIKE '%ejemplo%'
            AND COALESCE(ar.notes, '') NOT ILIKE '%seguimiento formativo%'
            AND COALESCE(ar.notes, '') NOT ILIKE '%escenario piloto%') AS attendance_rate
    `);
    const metrics = result.rows[0];
    return res.json({
      source: 'PostgreSQL · cuentas y registros reales; cuentas .demo y registros de prueba excluidos',
      metrics: [
        { icon: '👨‍🎓', label: 'Estudiantes registrados', value: metrics.students },
        { icon: '🏫', label: 'Centros tecnológicos registrados', value: metrics.centers },
        { icon: '📚', label: 'Cursos con matrícula real', value: metrics.courses },
        { icon: '⭐', label: 'XP de actividad real', value: metrics.xp },
        { icon: '📝', label: 'Asistencias reales', value: metrics.attendance_records },
        { icon: '📈', label: 'Asistencia efectiva', value: metrics.attendance_rate, suffix: '%' }
      ]
    });
  } catch (error) {
    console.error('Unable to load live platform metrics.', error.code || '');
    return res.status(500).json({ message: 'No se pudieron cargar las métricas reales.' });
  }
});


export default app;