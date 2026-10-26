import request from 'supertest';
import { afterEach, describe, it, expect, vi } from 'vitest';
import app from '../src/app.js';
import { pool } from '../src/config/database.js';

describe('Auth routes (integration smoke)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
});
