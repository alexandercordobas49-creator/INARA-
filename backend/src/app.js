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
import { checkDatabase } from './config/database.js';


const app = express();


app.use(cors());
app.use(express.json());


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


export default app;