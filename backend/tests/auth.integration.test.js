import request from 'supertest';
import { afterEach, describe, it, expect, vi } from 'vitest';
import app from '../src/app.js';
import { pool } from '../src/config/database.js';
import { signToken } from '../src/middleware/authMiddleware.js';

describe('Auth routes (integration smoke)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('GET /api/health reports the server, database, and schema separately', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({
      rows: [{ schema_available: true }]
    });

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.server).toBe('running');
    expect(res.body.database).toBe('connected');
    expect(res.body.schema).toBe('available');
  });

  it('GET /api/health returns 503 when the application schema is missing', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({
      rows: [{ schema_available: false }]
    });

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.server).toBe('running');
    expect(res.body.database).toBe('connected');
    expect(res.body.schema).toBe('unavailable');
  });

  it('GET /api/health hides database error details', async () => {
    vi.spyOn(pool, 'query').mockRejectedValue(
      Object.assign(new Error('sensitive connection detail'), { code: 'ECONNREFUSED' })
    );

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.database).toBe('unavailable');
    expect(JSON.stringify(res.body)).not.toContain('sensitive connection detail');
  });

  it('allows configured local frontend origins but omits CORS headers for unknown origins', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({
      rows: [{ schema_available: true }]
    });

    const allowed = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    const blocked = await request(app)
      .get('/api/health')
      .set('Origin', 'https://untrusted.example');

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('prevents students from reading another student’s attendance', async () => {
    vi.stubEnv('JWT_SECRET', 'test-secret-with-at-least-thirty-two-characters');
    vi.spyOn(pool, 'query').mockResolvedValue({
      rows: [{
        id: 'student-1',
        first_name: 'Test',
        last_name: 'Student',
        email: 'student@example.test',
        role: 'student',
        total_xp: 0,
        current_level: 1,
        created_at: new Date()
      }]
    });
    const token = signToken({ id: 'student-1', role: 'student' });

    const res = await request(app)
      .get('/api/attendance?userId=student-2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('No autorizado');
  });

  it('POST /api/auth/login without body returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Faltan campos/);
  });

  it('POST /api/auth/register without body returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Faltan campos/);
  });

  it('POST /api/auth/forgot without body returns 400', async () => {
    const res = await request(app).post('/api/auth/forgot').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Faltan campos/);
  });

  it('rate limits repeated authentication requests', async () => {
    let lastResponse;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      lastResponse = await request(app).post('/api/auth/login').send({});
    }

    expect(lastResponse.status).toBe(429);
    expect(lastResponse.body.message).toMatch(/Demasiadas solicitudes/);
  });
});
