import { pool } from '../config/database.js';
import FamilyRepository from '../repositories/FamilyRepository.js';

async function canAccessStudent(actor, studentId) {
  if (actor.role === 'admin') return true;
  if (actor.role === 'student') return actor.id === studentId;
  if (actor.role === 'parent') {
    return FamilyRepository.isParentOf(actor.id, studentId);
  }
  if (actor.role === 'instructor') {
    const result = await pool.query(
      `
        SELECT 1
        FROM courses c
        JOIN course_students cs ON cs.course_id = c.id
        WHERE c.instructor_id = $1
          AND cs.student_id = $2
          AND cs.status = 'active'
        LIMIT 1
      `,
      [actor.id, studentId]
    );
    return result.rows.length > 0;
  }
  return false;
}

export async function askAtlas(req, res) {
  const question = req.body?.question;
  if (typeof question !== 'string' || !question.trim() || question.length > 1000) {
    return res.status(400).json({ message: 'Escribe una pregunta de hasta 1000 caracteres para Atlas' });
  }

  const studentId = req.body?.userId || req.user.id;
  if (typeof studentId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(studentId)) {
    return res.status(400).json({ message: 'Identificador de estudiante inválido' });
  }
  const normalizedStudentId = studentId.toLowerCase();
  try {
    if (!(await canAccessStudent(req.user, normalizedStudentId))) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const studentResult = await pool.query(
      `SELECT id, first_name, last_name,
        ${req.user.role === 'instructor' ? 'NULL::integer AS total_xp, NULL::integer AS current_level' : 'total_xp, current_level'}
        FROM users
        WHERE id = $1 AND role = 'student'
      `,
      [normalizedStudentId]
    );
    const student = studentResult.rows[0];
    if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

    const attendanceResult = await pool.query(
      req.user.role === 'instructor'
        ? `
            SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE ar.status = 'present')::int AS present
            FROM attendance_records ar
            JOIN courses c ON c.id = ar.course_id
            JOIN course_students cs
              ON cs.course_id = ar.course_id
             AND cs.student_id = ar.user_id
             AND cs.status = 'active'
            WHERE ar.user_id = $1 AND c.instructor_id = $2
          `
        : `
            SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'present')::int AS present
            FROM attendance_records
            WHERE user_id = $1
          `,
      req.user.role === 'instructor' ? [normalizedStudentId, req.user.id] : [normalizedStudentId]
    );
    const streakResult = await pool.query(
      `
        SELECT COALESCE(MAX(current_count), 0)::int AS current_streak
        FROM streaks
        WHERE user_id = $1
        ${req.user.role === 'instructor' ? `AND course_id IN (
          SELECT c.id
          FROM courses c
          JOIN course_students cs ON cs.course_id = c.id
          WHERE c.instructor_id = $2
            AND cs.student_id = $1
            AND cs.status = 'active'
        )` : ''}
      `,
      req.user.role === 'instructor' ? [normalizedStudentId, req.user.id] : [normalizedStudentId]
    );
    const nextLevelResult = await pool.query(
      `
        SELECT name, min_xp
        FROM levels
        WHERE min_xp > $1
        ORDER BY min_xp
        LIMIT 1
      `,
      [student.total_xp]
    );

    const attendance = attendanceResult.rows[0];
    const hasAttendance = attendance.total > 0;
    const attendanceRate = hasAttendance
      ? Math.round((attendance.present / attendance.total) * 100)
      : null;
    const nextLevel = nextLevelResult.rows[0];
    const progressSummary = hasAttendance
      ? `la asistencia registrada en el ámbito consultado es ${attendanceRate}%`
      : 'aún no hay registros de asistencia en el ámbito consultado';
    const levelSummary = req.user.role === 'instructor'
      ? ''
      : nextLevel
      ? `Le faltan ${Math.max(0, nextLevel.min_xp - student.total_xp)} XP para el nivel ${nextLevel.name}.`
      : 'Ya alcanzó el nivel máximo configurado.';

    return res.json({
      answer: req.user.role === 'instructor'
        ? `En los cursos asignados, ${progressSummary} y la racha registrada es de ${streakResult.rows[0].current_streak} días.`
        : `${student.first_name} tiene ${student.total_xp} XP y nivel ${student.current_level}; ${progressSummary} y su racha registrada es de ${streakResult.rows[0].current_streak} días. ${levelSummary}`,
      metrics: {
        totalXp: req.user.role === 'instructor' ? null : student.total_xp,
        currentLevel: req.user.role === 'instructor' ? null : student.current_level,
        currentStreak: streakResult.rows[0].current_streak,
        attendanceRate,
        attendanceCount: attendance.total,
        nextLevel: nextLevel?.name || null
      },
      source: 'postgresql',
      audience: 'estudiante',
      note: 'Respuesta generada a partir de datos registrados; este servicio no procesa el texto de la pregunta ni sustituye el acompañamiento docente.'
    });
  } catch (error) {
    console.error('Unable to answer Atlas request:', error.message);
    return res.status(500).json({ message: 'Atlas no pudo consultar el progreso en este momento' });
  }
}
