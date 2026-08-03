import { describe, it, expect } from 'vitest';
import { validateBody } from '../src/middleware/validationMiddleware.js';

describe('validationMiddleware', () => {
  it('returns 400 when required fields are missing', async () => {
    const mw = validateBody(['email', 'password']);
    const req = { body: { email: 'a@b.com' } };
    let statusArg = null;
    let jsonArg = null;
    const res = {
      status(s) {
        statusArg = s;
        return this;
      },
      json(obj) {
        jsonArg = obj;
      }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await mw(req, res, next);

    expect(statusArg).toBe(400);
    expect(jsonArg).toBeTruthy();
    expect(jsonArg.message).toMatch(/Faltan campos/);
    expect(nextCalled).toBe(false);
  });

  it('calls next when all fields are present', async () => {
    const mw = validateBody(['email']);
    const req = { body: { email: 'x@x.com' } };
    let nextCalled = false;
    await mw(req, {}, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});
