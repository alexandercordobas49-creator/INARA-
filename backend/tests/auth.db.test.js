import crypto from 'crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/app.js';
import { pool } from '../src/config/database.js';

const runDbTests = process.env.RUN_DB_TESTS === '1';

describe('Auth DB integration (requires DB)', () => {
  if (!runDbTests) {
    it('skipped - set RUN_DB_TESTS=1 to run DB tests', () => {
      expect(true).toBe(true);
    });
    return;
  }

  const testEmail = 'test_integration@inara.test';
  const otherEmail = 'test_reset@inara.test';
  let client;

  beforeAll(async () => {
    client = await pool.connect();
  });

  afterAll(async () => {
    try {
      await client.query('DELETE FROM users WHERE email = ANY($1)', [[testEmail, otherEmail]]);
      await client.query('DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))', [[testEmail, otherEmail]]);
    } finally {
      client.release();
      await pool.end();
    }
  });

  it('rejects manipulated public roles and stores only student users', async () => {
    await client.query('DELETE FROM users WHERE email=$1', [testEmail]);

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'Test', lastName: 'User', email: testEmail, password: 'Test1234!', role: 'admin' });

    expect(registerRes.status).toBe(403);
    expect(registerRes.body.message).toMatch(/rol privilegiado/i);

    const user = await client.query('SELECT id, role FROM users WHERE email = $1', [testEmail]);
    expect(user.rows).toHaveLength(0);
  });

  it('can register and then login', async () => {
    await client.query('DELETE FROM users WHERE email=$1', [testEmail]);

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'Test', lastName: 'User', email: testEmail, password: 'Test1234!', role: 'student' });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeTruthy();
    expect(registerRes.body.user.role).toBe('student');

    const protectedRes = await request(app)
      .get(`/api/achievements/${registerRes.body.user.id}`)
      .set('Authorization', `Bearer ${registerRes.body.token}`);

    expect(protectedRes.status).toBe(200);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'Test1234!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();
  });

  it('rejects invalid login credentials without revealing account existence', async () => {
    await client.query('DELETE FROM users WHERE email=$1', [testEmail]);

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'Test', lastName: 'User', email: testEmail, password: 'Test1234!' });

    expect(registerRes.status).toBe(201);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPassword123' });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.message).toMatch(/credenciales/i);
  });

  it('rejects expired and already-used reset tokens', async () => {
    await client.query('DELETE FROM users WHERE email=$1', [otherEmail]);
    const userRes = await client.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role)
       VALUES ('Reset', 'User', $1, '$2a$10$T8b1egCuQx8C5s2U5Qw1X.3nI7h7mL2wD8ZyEeijm0cD7ECSiS0yW', 'student')
       RETURNING id, password_hash`,
      [otherEmail]
    );

    const userId = userRes.rows[0].id;
    const originalPasswordHash = userRes.rows[0].password_hash;
    const expiredToken = 'expired-token';
    const expiredTokenHash = crypto.createHash('sha256').update(expiredToken).digest('hex');

    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at, created_at)
       VALUES ($1, $2, NOW() - INTERVAL '1 hour', NULL, NOW())`,
      [userId, expiredTokenHash]
    );

    const expiredRes = await request(app)
      .post('/api/auth/reset')
      .send({ email: otherEmail, token: expiredToken, password: 'NewPassword123' });

    expect(expiredRes.status).toBe(400);
    expect(expiredRes.body.message).toMatch(/token inválido|expirado/i);

    const afterExpired = await client.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    expect(afterExpired.rows[0].password_hash).toBe(originalPasswordHash);

    const usedToken = 'already-used-token';
    const usedTokenHash = crypto.createHash('sha256').update(usedToken).digest('hex');
    await client.query(
      `UPDATE password_reset_tokens
       SET token_hash = $1, expires_at = NOW() + INTERVAL '1 hour', used_at = NOW()
       WHERE user_id = $2`,
      [usedTokenHash, userId]
    );

    const usedRes = await request(app)
      .post('/api/auth/reset')
      .send({ email: otherEmail, token: usedToken, password: 'NewPassword456' });

    expect(usedRes.status).toBe(400);
    expect(usedRes.body.message).toMatch(/token inválido|expirado/i);

    const afterUsed = await client.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    expect(afterUsed.rows[0].password_hash).toBe(originalPasswordHash);
  });

  it('uses a valid reset token once and revokes previous sessions', async () => {
    await client.query('DELETE FROM users WHERE email=$1', [otherEmail]);
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'Reset', lastName: 'User', email: otherEmail, password: 'OldPassword123' });

    expect(registerRes.status).toBe(201);
    const userId = registerRes.body.user.id;
    const resetToken = 'valid-reset-token';
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour', NULL)`,
      [userId, tokenHash]
    );

    const resetRes = await request(app)
      .post('/api/auth/reset')
      .send({ email: otherEmail, token: resetToken, password: 'NewPassword123' });

    expect(resetRes.status).toBe(200);

    const oldTokenRes = await request(app)
      .get(`/api/achievements/${userId}`)
      .set('Authorization', `Bearer ${registerRes.body.token}`);
    expect(oldTokenRes.status).toBe(401);

    const reusedTokenRes = await request(app)
      .post('/api/auth/reset')
      .send({ email: otherEmail, token: resetToken, password: 'AnotherPassword123' });
    expect(reusedTokenRes.status).toBe(400);
  });
});
