import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

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

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Inténtalo de nuevo más tarde.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot', authLimiter);
app.use('/api/auth/reset', authLimiter);

app.get('/', (req, res) => {
  res.json({
    name: 'INARA API',
    version: '2.0',
    status: 'running'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'INARA API'
  });
});

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

app.use((err, req, res, next) => {
  if (err && err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ message: 'Origen no permitido' });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ message: 'Error interno del servidor' });
});

export default app;