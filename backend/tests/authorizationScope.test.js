import { describe, expect, it, vi } from 'vitest';
import { listNotifications } from '../src/controllers/alertsController.js';
import { studentDashboard } from '../src/controllers/dashboardController.js';
import { pool } from '../src/config/database.js';

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
      user: { id: '00000000-0000-4000-8000-000000000001', role: 'student' },
      query: { userId: '00000000-0000-4000-8000-000000000002' }
    }, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('No autorizado');
  });

  it('does not allow a student to open another student dashboard', async () => {
    const res = createResponse();
    await studentDashboard({
      user: { id: '00000000-0000-4000-8000-000000000002', role: 'student' },
      params: { userId: '00000000-0000-4000-8000-000000000001' }
    }, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('No autorizado');
  });

  it('rejects malformed student dashboard IDs without querying the database', async () => {
    const res = createResponse();
    await studentDashboard({
      user: { id: '00000000-0000-4000-8000-000000000001', role: 'admin' },
      params: { userId: 'not-a-uuid' }
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/identificador/i);
  });

  it('limits instructor dashboards to assigned-course data and omits global XP and achievements', async () => {
    const studentId = '00000000-0000-4000-8000-000000000001';
    const query = vi.spyOn(pool, 'query')
      .mockResolvedValueOnce({ rows: [{ allowed: 1 }] })
      .mockResolvedValueOnce({
        rows: [{
          id: studentId,
          first_name: 'Student',
          last_name: 'Test',
          role: 'student',
          total_xp: null,
          current_level: null
        }]
      })
      .mockResolvedValueOnce({ rows: [{ status: 'present', session_date: '2026-01-01', course_id: 'course-id' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = createResponse();

    try {
      await studentDashboard({
        user: { id: '00000000-0000-4000-8000-000000000002', role: 'instructor' },
        params: { userId: studentId }
      }, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.student.totalXp).toBeNull();
      expect(res.body.xp.total).toBeNull();
      expect(res.body.xpEvents).toEqual([]);
      expect(res.body.achievements).toEqual([]);
      expect(query.mock.calls[3][0]).toMatch(/course_id IN \([\s\S]*cs\.status = 'active'/);
    } finally {
      query.mockRestore();
    }
  });
});
