import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
  findAll: vi.fn(),
  findByStudent: vi.fn(),
  findByStudentAndInstructor: vi.fn(),
  release: vi.fn()
}));

vi.mock('../src/config/database.js', () => ({
  pool: {
    connect: mocks.connect,
    query: mocks.query
  }
}));

vi.mock('../src/repositories/AttendanceRepository.js', () => ({
  default: {
    findAll: mocks.findAll,
    findByStudent: mocks.findByStudent,
    findByStudentAndInstructor: mocks.findByStudentAndInstructor
  }
}));

import { saveAttendance } from '../src/controllers/attendanceController.js';

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

function makeRequest(role = 'instructor') {
  return {
    user: { id: '00000000-0000-4000-8000-000000000002', role },
    body: {
      userId: '00000000-0000-4000-8000-000000000001',
      courseId: '00000000-0000-4000-8000-000000000003',
      sessionDate: '2026-10-10',
      status: 'present',
      notes: ''
    }
  };
}

describe('attendance security and XP integrity', () => {
  beforeEach(() => {
    mocks.connect.mockReset();
    mocks.query.mockReset();
    mocks.findAll.mockReset();
    mocks.findByStudent.mockReset();
    mocks.findByStudentAndInstructor.mockReset();
    mocks.release.mockReset();
  });

  it('rejects attendance for a student not actively enrolled in the owned course', async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    mocks.connect.mockResolvedValue({
      query: clientQuery,
      release: mocks.release
    });

    const res = createResponse();
    await saveAttendance(makeRequest(), res);

    expect(res.statusCode).toBe(403);
    expect(clientQuery.mock.calls[1][0]).toMatch(/cs\.status\s*=\s*'active'/);
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(clientQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO xp_events'))).toBe(false);
    expect(mocks.release).toHaveBeenCalledOnce();
  });

  it('rejects malformed UUIDs before acquiring a database connection', async () => {
    const req = makeRequest();
    req.body.userId = 'not-a-uuid';
    const res = createResponse();

    await saveAttendance(req, res);

    expect(res.statusCode).toBe(400);
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('does not award XP again when an attendance record was already rewarded', async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'student-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'attendance-1', xp_awarded: true }] })
      .mockResolvedValueOnce({ rows: [] });
    mocks.connect.mockResolvedValue({
      query: clientQuery,
      release: mocks.release
    });

    const res = createResponse();
    await saveAttendance(makeRequest('admin'), res);

    expect(res.statusCode).toBe(201);
    expect(clientQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO xp_events'))).toBe(false);
    expect(clientQuery).toHaveBeenLastCalledWith('COMMIT');
    expect(mocks.release).toHaveBeenCalledOnce();
  });

  it('awards XP once, in the attendance transaction, for the first qualifying record', async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'student-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'attendance-1', xp_awarded: false }] })
      .mockResolvedValueOnce({ rows: [{ id: 'attendance-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    mocks.connect.mockResolvedValue({
      query: clientQuery,
      release: mocks.release
    });

    const res = createResponse();
    await saveAttendance(makeRequest('admin'), res);

    expect(res.statusCode).toBe(201);
    expect(clientQuery.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO xp_events'))).toHaveLength(1);
    expect(clientQuery).toHaveBeenLastCalledWith('COMMIT');
    expect(mocks.release).toHaveBeenCalledOnce();
  });
});
