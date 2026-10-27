import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import app from '../src/app.js';
import { pool } from '../src/config/database.js';
import { saveResetToken } from '../src/repositories/UserRepository.js';

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
  const testPassword = 'Test1234!';
  let client;
  let registeredUser;

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
      .send({ firstName: 'Test', lastName: 'User', email: testEmail, password: testPassword, role: 'admin' });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeTruthy();
    expect(registerRes.body.user.role).toBe('student');
    registeredUser = await client.query('SELECT id FROM users WHERE email=$1', [testEmail]);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();

    const forgotRes = await request(app)
      .post('/api/auth/forgot')
      .send({ email: testEmail });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.token).toBeUndefined();
  });

  it('requires a valid, unexpired, one-time reset token', async () => {
    const userId = registeredUser.rows[0].id;
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const expiredTokenHash = crypto.createHash('sha256').update(expiredToken).digest('hex');
    await saveResetToken(userId, expiredTokenHash, new Date(Date.now() - 60_000));

    const expiredRes = await request(app)
      .post('/api/auth/reset')
      .send({ email: testEmail, token: expiredToken, password: 'Changed123!' });
    expect(expiredRes.status).toBe(400);

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    await saveResetToken(userId, resetTokenHash, new Date(Date.now() + 60_000));

    const invalidRes = await request(app)
      .post('/api/auth/reset')
      .send({ email: testEmail, token: 'invalid-token', password: 'Changed123!' });
    expect(invalidRes.status).toBe(400);

    const resetRes = await request(app)
      .post('/api/auth/reset')
      .send({ email: testEmail, token: resetToken, password: 'Changed123!' });
    expect(resetRes.status).toBe(200);

    const replayRes = await request(app)
      .post('/api/auth/reset')
      .send({ email: testEmail, token: resetToken, password: 'Changed123!' });
    expect(replayRes.status).toBe(400);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'Changed123!' });
    expect(loginRes.status).toBe(200);
  });
});
