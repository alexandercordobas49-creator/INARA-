import { pool } from '../config/database.js';
import FamilyRepository from '../repositories/FamilyRepository.js';

function publicStudent(user, includeGlobalProgress = true) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    totalXp: includeGlobalProgress ? user.total_xp : null,
    currentLevel: includeGlobalProgress ? user.current_level : null
  };
}

async function getDashboard(studentId, instructorId = null) {
  const attendanceQuery = instructorId
    ? `
        SELECT ar.status, ar.session_date, ar.course_id
        FROM attendance_records ar
        JOIN courses c ON c.id = ar.course_id
        JOIN course_students cs
          ON cs.course_id = ar.course_id
         AND cs.student_id = ar.user_id
         AND cs.status = 'active'
        WHERE ar.user_id = $1 AND c.instructor_id = $2
        ORDER BY ar.session_date DESC
      `
    : `
        SELECT status, session_date, course_id
        FROM attendance_records
        WHERE user_id = $1
        ORDER BY session_date DESC
      `;
  const attendanceParams = instructorId ? [studentId, instructorId] : [studentId];

  const [attendanceResult, achievementsResult, streaksResult, xpEventsResult, levelResult, currentLevelResult] = await Promise.all([
    pool.query(attendanceQuery, attendanceParams),
    instructorId ? Promise.resolve({ rows: [] }) : pool.query(
      `
        SELECT ua.id, ua.earned_at, a.id AS achievement_id, a.code, a.name, a.description, a.xp_reward
        FROM user_achievements ua
        JOIN achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = $1
        ORDER BY ua.earned_at DESC
      `,
      [studentId]
    ),
    pool.query(
      `
        SELECT id, course_id, current_count, best_count, last_activity_date, updated_at
        FROM streaks
        WHERE user_id = $1
        ${instructorId ? `AND course_id IN (
          SELECT c.id
          FROM courses c
          JOIN course_students cs ON cs.course_id = c.id
          WHERE c.instructor_id = $2
            AND cs.student_id = $1
            AND cs.status = 'active'
        )` : ''}
        ORDER BY updated_at DESC
      `,
      attendanceParams
    ),
    instructorId ? Promise.resolve({ rows: [] }) : pool.query(
      `
        SELECT id, points, source, description, created_at
        FROM xp_events
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 6
      `,
      [studentId]
    ),
    instructorId ? Promise.resolve({ rows: [] }) : pool.query(
      `
        SELECT level_number, name, min_xp
        FROM levels
        WHERE min_xp > (SELECT total_xp FROM users WHERE id = $1)
        ORDER BY min_xp
        LIMIT 1
      `,
      [studentId]
    ),
    instructorId ? Promise.resolve({ rows: [] }) : pool.query(
      `
        SELECT min_xp
        FROM levels
        WHERE level_number = (SELECT current_level FROM users WHERE id = $1)
      `,
      [studentId]
    )
  ]);

  const attendance = attendanceResult.rows;
  const streakRows = streaksResult.rows;
  const attendanceSummary = {
    total: attendance.length,
    present: attendance.filter((record) => record.status === 'present').length,
    late: attendance.filter((record) => record.status === 'late').length,
    absent: attendance.filter((record) => record.status === 'absent').length
  };

  return {
    attendanceSummary,
    achievements: achievementsResult.rows.map((row) => ({
      id: row.id,
      earnedAt: row.earned_at,
      achievement: {
        id: row.achievement_id,
        code: row.code,
        name: row.name,
        description: row.description,
        xpReward: row.xp_reward
      }
    })),
    streak: streakRows.length ? {
      id: streakRows[0].id,
      courseId: streakRows[0].course_id,
      currentCount: streakRows[0].current_count,
      bestCount: streakRows[0].best_count,
      lastActivityDate: streakRows[0].last_activity_date,
      updatedAt: streakRows[0].updated_at
    } : null,
    xpEvents: xpEventsResult.rows.map((row) => ({
      id: row.id,
      points: row.points,
      source: row.source,
      description: row.description,
      createdAt: row.created_at
    })),
    nextLevel: levelResult.rows[0] ? {
      levelNumber: levelResult.rows[0].level_number,
      name: levelResult.rows[0].name,
      minXp: levelResult.rows[0].min_xp
    } : null,
    currentLevelMinXp: instructorId ? null : (Number(currentLevelResult.rows[0]?.min_xp) || 0)
  };
}

export async function studentDashboard(req, res) {
  try {
    const requestedStudentId = req.params.userId;
    if (typeof requestedStudentId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedStudentId)) {
      return res.status(400).json({ message: 'Identificador de estudiante inválido' });
    }
    const studentId = requestedStudentId.toLowerCase();

    let instructorId = null;
    if (req.user.role === 'student' && req.user.id.toLowerCase() !== studentId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    if (req.user.role === 'parent' &&
        !(await FamilyRepository.isParentOf(req.user.id, studentId))) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    if (req.user.role === 'instructor') {
      const assignment = await pool.query(
        `
          SELECT 1
          FROM courses c
          JOIN course_students cs ON cs.course_id = c.id
          JOIN users u ON u.id = cs.student_id AND u.role = 'student'
          WHERE c.instructor_id = $1
            AND cs.student_id = $2
            AND cs.status = 'active'
          LIMIT 1
        `,
        [req.user.id, studentId]
      );
      if (!assignment.rows.length) {
        return res.status(403).json({ message: 'No autorizado' });
      }
      instructorId = req.user.id;
    } else if (!['student', 'parent', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const studentResult = await pool.query(
      `SELECT id, first_name, last_name, role,
        ${req.user.role === 'instructor' ? 'NULL::integer AS total_xp, NULL::integer AS current_level' : 'total_xp, current_level'}
        FROM users
        WHERE id = $1
      `,
      [studentId]
    );
    const student = studentResult.rows[0];
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    const details = await getDashboard(student.id, instructorId);
    const includeGlobalProgress = !instructorId;
    return res.json({
      student: publicStudent(student, includeGlobalProgress),
      ...details,
      xp: {
        total: includeGlobalProgress ? student.total_xp : null,
        currentLevel: includeGlobalProgress ? student.current_level : null,
        currentLevelMinXp: includeGlobalProgress ? details.currentLevelMinXp : null,
        nextLevel: includeGlobalProgress ? details.nextLevel : null
      }
    });
  } catch (error) {
    console.error('Unable to load student dashboard:', error.message);
    return res.status(500).json({ message: 'Error obteniendo el panel del estudiante' });
  }
}

export async function parentChildren(req, res) {
  try {
    const parentId = req.params.parentId;
    if (req.user.role !== 'admin' && (req.user.role !== 'parent' || req.user.id !== parentId)) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const parentResult = await pool.query(
      'SELECT id, first_name, last_name, role FROM users WHERE id = $1',
      [parentId]
    );
    const parent = parentResult.rows[0];
    if (!parent || parent.role !== 'parent') {
      return res.status(404).json({ message: 'Familiar no encontrado' });
    }

    const children = await FamilyRepository.findChildren(parent.id);
    return res.json({
      parent: { id: parent.id, firstName: parent.first_name, lastName: parent.last_name },
      children: children.map(publicStudent)
    });
  } catch (error) {
    console.error('Unable to load family children:', error.message);
    return res.status(500).json({ message: 'Error obteniendo estudiantes vinculados' });
  }
}

export async function parentView(req, res) {
  try {
    const { parentId, childId } = req.params;
    if (req.user.role !== 'admin' && (req.user.role !== 'parent' || req.user.id !== parentId)) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const [parentResult, studentResult] = await Promise.all([
      pool.query('SELECT id, role FROM users WHERE id = $1', [parentId]),
      pool.query(
        'SELECT id, first_name, last_name, role, total_xp, current_level FROM users WHERE id = $1',
        [childId]
      )
    ]);
    const parent = parentResult.rows[0];
    const student = studentResult.rows[0];
    if (!parent || parent.role !== 'parent') {
      return res.status(404).json({ message: 'Familiar no encontrado' });
    }
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    if (!(await FamilyRepository.isParentOf(parent.id, student.id))) {
      return res.status(403).json({ message: 'Acceso denegado: estudiante no vinculado' });
    }

    const details = await getDashboard(student.id);
    const alerts = [];
    if (details.attendanceSummary.absent >= 3) alerts.push({ level: 'high', message: 'Alto riesgo por ausencias frecuentes' });
    if ((details.streak?.currentCount || 0) <= 1) alerts.push({ level: 'medium', message: 'Baja actividad reciente' });
    if (student.total_xp < 200) alerts.push({ level: 'low', message: 'Progreso bajo en XP' });

    return res.json({
      student: publicStudent(student),
      attendanceSummary: details.attendanceSummary,
      xp: {
        total: student.total_xp,
        currentLevel: student.current_level,
        nextLevel: details.nextLevel
      },
      streak: details.streak || { currentCount: 0 },
      achievements: details.achievements,
      xpEvents: details.xpEvents,
      alerts
    });
  } catch (error) {
    console.error('Unable to load family student view:', error.message);
    return res.status(500).json({ message: 'Error obteniendo seguimiento del estudiante' });
  }
}
