import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/app.js';
import { pool } from '../src/config/database.js';

// Run DB tests only if RUN_DB_TESTS=1
const runDbTests = process.env.RUN_DB_TESTS === '1';

describe('Auth DB integration (requires DB) ', () => {
  if (!runDbTests) {
    it('skipped - set RUN_DB_TESTS=1 to run DB tests', () => {
      expect(true).toBe(true);
    });
    return;
  }

  const testEmail = 'test_integration@inara.test';
  let client;

  beforeAll(async () => {
    client = await pool.connect();
  });

  afterAll(async () => {
    try {
      await client.query('DELETE FROM users WHERE email=$1', [testEmail]);
    } finally {
      client.release();
      await pool.end();
    }
  });

  it('can register and then login', async () => {
    // cleanup in case exists
    await client.query('DELETE FROM users WHERE email=$1', [testEmail]);

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'Test', lastName: 'User', email: testEmail, password: 'Test1234!', role: 'student' });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeTruthy();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'Test1234!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();
  });
});
