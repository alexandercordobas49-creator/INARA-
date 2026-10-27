import { attendanceStatuses } from '../models/Attendance.js';
import AttendanceRepository from '../repositories/AttendanceRepository.js';
import XpRepository from '../repositories/XpRepository.js';
import { pool } from '../config/database.js';


export async function listAttendance(req, res) {

  try {
    const { userId } = req.query;
    const records = userId
      ? await AttendanceRepository.findByStudent(userId)
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


    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id=$1',
      [userId]
    );


    const courseCheck = await pool.query(
      'SELECT id FROM courses WHERE id=$1',
      [courseId]
    );


    if (!userCheck.rows.length || !courseCheck.rows.length) {

      return res.status(404).json({
        message: 'Estudiante o curso no encontrado'
      });

    }



    const existing =
      await AttendanceRepository.findOne(
        userId,
        courseId,
        sessionDate
      );



    let record;


    if (existing) {

      record =
        await AttendanceRepository.update(
          existing.id,
          status,
          notes
        );

    } else {

      record =
        await AttendanceRepository.create({
          userId,
          courseId,
          sessionDate,
          status,
          notes
        });

    }



    // Sistema de experiencia INARA

    if (status === 'present' || status === 'late') {

      const points = status === 'present'
        ? 50
        : 25;


      await XpRepository.create({
        userId,
        points,
        source: 'attendance',
        description: 'Asistencia registrada'
      });


      await XpRepository.updateUserXp(
        userId,
        points
      );


      await XpRepository.updateLevel(
        userId
      );

    }



    // Recalcular racha por sesiones de este curso, no por días naturales.
    const recentSessions = await pool.query(
      `SELECT session_date, status
       FROM attendance_records
       WHERE user_id = $1 AND course_id = $2
       ORDER BY session_date DESC`,
      [userId, courseId]
    );
    let currentCount = 0;
    for (const session of recentSessions.rows) {
      if (session.status !== 'present' && session.status !== 'late') break;
      currentCount += 1;
    }
    let run = 0;
    let bestCount = 0;
    for (const session of [...recentSessions.rows].reverse()) {
      if (session.status === 'present' || session.status === 'late') {
        run += 1;
        bestCount = Math.max(bestCount, run);
      } else {
        run = 0;
      }
    }
    await pool.query(
      `INSERT INTO streaks (user_id, course_id, current_count, best_count, last_activity_date, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, course_id) DO UPDATE SET
         current_count = EXCLUDED.current_count,
         best_count = GREATEST(streaks.best_count, EXCLUDED.best_count),
         last_activity_date = EXCLUDED.last_activity_date,
         updated_at = NOW()`,
      [userId, courseId, currentCount, bestCount, recentSessions.rows[0]?.session_date ?? null]
    );

    return res.status(201).json(record);


  } catch(error) {


    console.error(error);


    return res.status(500).json({
      message:'Error guardando asistencia'
    });


  }

}