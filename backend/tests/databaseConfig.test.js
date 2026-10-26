import { describe, expect, it } from 'vitest';
import { createPoolConfig } from '../src/config/database.js';

describe('PostgreSQL pool configuration', () => {
  it('prefers DATABASE_URL and validates Neon TLS certificates', () => {
    const config = createPoolConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://inara:example-password@ep-example.neon.tech/neondb?sslmode=require&channel_binding=require',
      DB_NAME: 'ignored',
      DB_USER: 'ignored'
    });

    expect(config.connectionString).toContain('channel_binding=require');
    expect(config.connectionString).not.toContain('sslmode=');
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(config.max).toBe(5);
    expect(config.connectionTimeoutMillis).toBe(5000);
    expect(config.idleTimeoutMillis).toBe(30000);
  });

  it('uses test-only connection settings without falling back to DATABASE_URL', () => {
    const config = createPoolConfig({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://production:example-password@ep-example.neon.tech/neondb',
      DB_HOST_TEST: '127.0.0.1',
      DB_PORT_TEST: '5544',
      DB_NAME_TEST: 'inara_test',
      DB_USER_TEST: 'test_user',
      DB_PASSWORD_TEST: 'test_password'
    });

    expect(config.connectionString).toBeUndefined();
    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(5544);
    expect(config.database).toBe('inara_test');
    expect(config.user).toBe('test_user');
    expect(config.password).toBe('test_password');
  });

  it('supports the legacy DB_* variables', () => {
    const config = createPoolConfig({
      NODE_ENV: 'development',
      DB_HOST: 'localhost',
      DB_PORT: '5433',
      DB_NAME: 'inara',
      DB_USER: 'inara_user',
      DB_PASSWORD: 'example-password'
    });

    expect(config.host).toBe('localhost');
    expect(config.port).toBe(5433);
    expect(config.database).toBe('inara');
    expect(config.user).toBe('inara_user');
  });

  it('rejects invalid connection URL formats without echoing the URL', () => {
    expect(() => createPoolConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'not-a-database-url'
    })).toThrow('DATABASE_URL must be a valid PostgreSQL connection URL.');
  });
});
