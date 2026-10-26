import { afterEach, describe, expect, it, vi } from 'vitest';
import { pool } from '../src/config/database.js';
import { canAccessCourse, canAccessStudent } from '../src/middleware/accessControl.js';

describe('data access scopes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows administrators without a course-membership lookup', async () => {
    const query = vi.spyOn(pool, 'query');

    await expect(canAccessStudent({ id: 'admin-1', role: 'admin' }, 'student-1'))
      .resolves.toBe(true);
    await expect(canAccessCourse({ id: 'admin-1', role: 'admin' }, 'course-1'))
      .resolves.toBe(true);
    expect(query).not.toHaveBeenCalled();
  });

  it('limits students to their own profile and active courses', async () => {
    const query = vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 0 });

    await expect(canAccessStudent({ id: 'student-1', role: 'student' }, 'student-1'))
      .resolves.toBe(true);
    await expect(canAccessStudent({ id: 'student-1', role: 'student' }, 'student-2'))
      .resolves.toBe(false);
    await expect(canAccessCourse({ id: 'student-1', role: 'student' }, 'course-1'))
      .resolves.toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual(['course-1', 'student-1']);
  });

  it('limits instructors to assigned active students and owned courses', async () => {
    const query = vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 1 });
    const teacher = { id: 'teacher-1', role: 'instructor' };

    await expect(canAccessStudent(teacher, 'student-1')).resolves.toBe(true);
    await expect(canAccessCourse(teacher, 'course-1')).resolves.toBe(true);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][1]).toEqual(['student-1', 'teacher-1']);
    expect(query.mock.calls[1][1]).toEqual(['course-1', 'teacher-1']);
  });

  it('limits parents to explicitly linked students and their active courses', async () => {
    const query = vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 0 });
    const parent = { id: 'parent-1', role: 'parent' };

    await expect(canAccessStudent(parent, 'student-1')).resolves.toBe(false);
    await expect(canAccessCourse(parent, 'course-1')).resolves.toBe(false);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][1]).toEqual(['parent-1', 'student-1']);
    expect(query.mock.calls[1][1]).toEqual(['parent-1', 'course-1']);
  });
});
