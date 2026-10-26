import { attendanceStatuses } from '../models/Attendance.js';
import AttendanceRepository from '../repositories/AttendanceRepository.js';
import XpRepository from '../repositories/XpRepository.js';
import { pool } from '../config/database.js';
import { evaluateStudentRisk } from '../services/riskService.js';
import { canAccessStudent } from '../middleware/accessControl.js';

export async function listAttendance(req, res) {
  try {
    const { userId } = req.query;
    if (userId && !(await canAccessStudent(req.user, userId))) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    let records;
    if (req.user.role === 'admin') {
      records = userId
        ? await AttendanceRepository.findByStudent(userId)
        : await AttendanceRepository.findAll();
    } else if (req.user.role === 'instructor') {
      records = await AttendanceRepository.findByInstructor(req.user.id, userId);
    } else if (req.user.role === 'parent') {
      records = await AttendanceRepository.findByParent(req.user.id, userId);
    } else if (req.user.role === 'student') {
      records = await AttendanceRepository.findByStudent(req.user.id);
    } else {
      return res.status(403).json({ message: 'No autorizado' });
    }
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

    const enrollment = await pool.query(`
      SELECT u.id
      FROM users u
      JOIN course_students cs ON cs.student_id = u.id
      JOIN courses c ON c.id = cs.course_id
      WHERE u.id = $1
        AND u.role = 'student'
        AND c.id = $2
        AND cs.enrollment_status = 'active'
        AND ($3 = 'admin' OR c.instructor_id = $4)
    `, [userId, courseId, req.user.role, req.user.id]);
    if (!enrollment.rowCount) {
      return res.status(403).json({ message: 'El estudiante no tiene una matrícula activa en un curso autorizado.' });
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

    await evaluateStudentRisk(userId);

    return res.status(existing ? 200 : 201).json(record);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error guardando asistencia' });
  }
}
