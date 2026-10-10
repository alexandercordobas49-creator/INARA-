import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn()
}));

vi.mock('../src/config/database.js', () => ({
  pool: { query: mocks.query }
}));

import AttendanceRepository from '../src/repositories/AttendanceRepository.js';

describe('AttendanceRepository instructor scope', () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it('filters student attendance to courses owned by the instructor', async () => {
    mocks.query.mockResolvedValue({ rows: [{ id: 'record-1', course_id: 'course-1' }] });

    const rows = await AttendanceRepository.findByStudentAndInstructor('student-1', 'instructor-1');

    expect(rows).toEqual([{ id: 'record-1', course_id: 'course-1' }]);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('c.instructor_id = $2'),
      ['student-1', 'instructor-1']
    );
    expect(mocks.query.mock.calls[0][0]).toMatch(/cs\.status = 'active'/);
  });
});
