import { describe, expect, it } from 'vitest';
import { listNotifications } from '../src/controllers/alertsController.js';
import { studentDashboard } from '../src/controllers/dashboardController.js';

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

describe('authorization scope', () => {
  it("does not allow a user to request another user's notifications", () => {
    const res = createResponse();
    listNotifications({
      user: { id: 'student-1', role: 'student' },
      query: { userId: 'student-2' }
    }, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('No autorizado');
  });

  it('does not allow a student to open another student dashboard', async () => {
    const res = createResponse();
    await studentDashboard({
      user: { id: 'user-2', role: 'student' },
      params: { userId: 'user-1' }
    }, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('No autorizado');
  });
});
