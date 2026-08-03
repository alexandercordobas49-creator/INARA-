import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app.js';

describe('Auth routes (integration smoke)', () => {
  it('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
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
