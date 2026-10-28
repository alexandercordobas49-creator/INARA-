import { pool } from '../config/database.js';

export async function canAccessStudent(user, studentId) {
  if (!user || !studentId) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'student') return user.id === studentId;

  if (user.role === 'parent') {
    const result = await pool.query(
      'SELECT 1 FROM parent_relations WHERE parent_id=$1 AND child_id=$2',
      [user.id, studentId]
    );
    return result.rowCount > 0;
  }

  if (user.role === 'instructor') {
    const result = await pool.query(`
      SELECT 1
      FROM course_students cs
      JOIN courses c ON c.id=cs.course_id
      WHERE cs.student_id=$1
        AND c.instructor_id=$2
        AND cs.enrollment_status='active'
      LIMIT 1
    `, [studentId, user.id]);
    return result.rowCount > 0;
  }

  return false;
}

export async function canAccessCourse(user, courseId) {
  if (!user || !courseId) return false;
  if (user.role === 'admin') return true;

  if (user.role === 'instructor') {
    const result = await pool.query(
      'SELECT 1 FROM courses WHERE id=$1 AND instructor_id=$2',
      [courseId, user.id]
    );
    return result.rowCount > 0;
  }

  if (user.role === 'student') {
    const result = await pool.query(`
      SELECT 1 FROM course_students
      WHERE course_id=$1 AND student_id=$2 AND enrollment_status='active'
    `, [courseId, user.id]);
    return result.rowCount > 0;
  }

  if (user.role === 'parent') {
    const result = await pool.query(`
      SELECT 1
      FROM parent_relations pr
      JOIN course_students cs ON cs.student_id=pr.child_id
      WHERE pr.parent_id=$1
        AND cs.course_id=$2
        AND cs.enrollment_status='active'
      LIMIT 1
    `, [user.id, courseId]);
    return result.rowCount > 0;
  }

  return false;
}
