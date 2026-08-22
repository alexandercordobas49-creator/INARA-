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
    return res.status(500).json({ message: 'Error obteniendo asistencias' });
  }
}

export async function saveAttendance(req, res) {
  try {
    const { userId, courseId, sessionDate, status, notes = '' } = req.body;

    if (!userId || !courseId || !sessionDate || !status) {
      return res.status(400).json({ message: 'Completa estudiante, curso, fecha y estado' });
    }
    if (!attendanceStatuses.includes(status)) {
      return res.status(400).json({ message: 'Estado de asistencia invalido' });
    }

    const [userCheck, courseCheck] = await Promise.all([
      pool.query('SELECT id FROM users WHERE id=$1', [userId]),
      pool.query('SELECT id FROM courses WHERE id=$1', [courseId])
    ]);
    if (!userCheck.rowCount || !courseCheck.rowCount) {
      return res.status(404).json({ message: 'Estudiante o curso no encontrado' });
    }

    const existing = await AttendanceRepository.findOne(userId, courseId, sessionDate);
    let record;

    if (existing) {
      record = await AttendanceRepository.update(existing.id, status, notes);
    } else {
      record = await AttendanceRepository.create({ userId, courseId, sessionDate, status, notes });
    }

    // XP is granted only when a record is newly created or changes from a
    // non-credit status to a credit status. Re-saving the same attendance
    // record no longer creates duplicate XP events.
    const wasCredit = existing && (existing.status === 'present' || existing.status === 'late');
    const isCredit = status === 'present' || status === 'late';

    if (isCredit && !wasCredit) {
      const points = status === 'present' ? 50 : 25;
      await XpRepository.create({
        userId,
        points,
        source: 'attendance',
        description: 'Asistencia registrada'
      });
      await XpRepository.updateUserXp(userId, points);
      await XpRepository.updateLevel(userId);
    }

    return res.status(existing ? 200 : 201).json(record);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error guardando asistencia' });
  }
}
