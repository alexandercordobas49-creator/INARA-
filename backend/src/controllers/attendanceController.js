import { attendanceStatuses } from '../models/Attendance.js';
import AttendanceRepository from '../repositories/AttendanceRepository.js';
import { pool } from '../config/database.js';
import { isParentOf, readData } from '../data/store.js';

async function canAccessStudentAttendance(actor, targetUserId) {
  if (actor.role === 'admin') {
    return true;
  }

  if (actor.role === 'student') {
    return actor.id === targetUserId;
  }

  if (actor.role === 'parent') {
    const data = readData();
    return isParentOf(data, actor.id, targetUserId);
  }

  if (actor.role === 'instructor') {
    const courseCheck = await pool.query(
      `
        SELECT 1
        FROM course_students cs
        JOIN courses c ON c.id = cs.course_id
        WHERE cs.student_id = $1
          AND cs.status = 'active'
          AND c.instructor_id = $2
        LIMIT 1
      `,
      [targetUserId, actor.id]
    );

    return courseCheck.rows.length > 0;
  }

  return false;
}

export async function listAttendance(req, res) {
  try {
    const { userId } = req.query;

    if (req.user.role !== 'admin' && !userId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    if (userId && !(await canAccessStudentAttendance(req.user, String(userId)))) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const records = userId
      ? req.user.role === 'instructor'
        ? await AttendanceRepository.findByStudentAndInstructor(String(userId), req.user.id)
        : await AttendanceRepository.findByStudent(String(userId))
      : await AttendanceRepository.findAll();

    return res.json(records);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error obteniendo asistencias'
    });
  }
}



export async function saveAttendance(req, res) {

  try {

    const {
      userId,
      courseId,
      sessionDate,
      status,
      notes = ''
    } = req.body;


    if (!userId || !courseId || !sessionDate || !status) {

      return res.status(400).json({
        message: 'Completa estudiante, curso, fecha y estado'
      });

    }


    if (!attendanceStatuses.includes(status)) {

      return res.status(400).json({
        message: 'Estado de asistencia invalido'
      });

    }

    const parsedSessionDate = typeof sessionDate === 'string'
      ? new Date(`${sessionDate}T00:00:00.000Z`)
      : null;
    if (
      typeof sessionDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate) ||
      Number.isNaN(parsedSessionDate.getTime()) ||
      parsedSessionDate.toISOString().slice(0, 10) !== sessionDate
    ) {
      return res.status(400).json({ message: 'Fecha de sesión inválida' });
    }

    if (typeof notes !== 'string' || notes.length > 500) {
      return res.status(400).json({ message: 'Las notas deben ser texto de hasta 500 caracteres' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const enrollmentCheck = await client.query(
        `
          SELECT u.id
          FROM users u
          JOIN course_students cs
            ON cs.student_id = u.id
           AND cs.course_id = $2
           AND cs.status = 'active'
          JOIN courses c ON c.id = cs.course_id
          WHERE u.id = $1
            AND u.role = 'student'
            AND ($3::boolean OR c.instructor_id = $4)
          LIMIT 1
          FOR UPDATE OF cs
        `,
        [userId, courseId, req.user.role === 'admin', req.user.id]
      );

      if (!enrollmentCheck.rows.length) {
        await client.query('ROLLBACK');
        return res.status(403).json({ message: 'No autorizado: estudiante o curso no asignado' });
      }

      const upserted = await client.query(
        `
          INSERT INTO attendance_records
            (user_id, course_id, session_date, status, notes)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, course_id, session_date)
          DO UPDATE SET
            status = EXCLUDED.status,
            notes = EXCLUDED.notes,
            recorded_at = NOW()
          RETURNING *
        `,
        [userId, courseId, sessionDate, status, notes]
      );
      const record = upserted.rows[0];

      if ((status === 'present' || status === 'late') && !record.xp_awarded) {
        const claim = await client.query(
          `
            UPDATE attendance_records
            SET xp_awarded = TRUE
            WHERE id = $1 AND xp_awarded = FALSE
            RETURNING id
          `,
          [record.id]
        );

        if (claim.rows.length) {
          const points = status === 'present' ? 50 : 25;
          await client.query(
            `
              INSERT INTO xp_events (user_id, points, source, description)
              VALUES ($1, $2, 'attendance', 'Asistencia registrada')
            `,
            [userId, points]
          );
          await client.query(
            `
              UPDATE users
              SET total_xp = total_xp + $1
              WHERE id = $2
            `,
            [points, userId]
          );
          await client.query(
            `
              UPDATE users
              SET current_level = (
                SELECT level_number
                FROM levels
                WHERE min_xp <= users.total_xp
                ORDER BY min_xp DESC
                LIMIT 1
              )
              WHERE id = $1
            `,
            [userId]
          );
          record.xp_awarded = true;
        }
      }

      await client.query('COMMIT');
      return res.status(201).json(record);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }


  } catch(error) {
    console.error(error);
    return res.status(500).json({
      message:'Error guardando asistencia'
    });


  }

}