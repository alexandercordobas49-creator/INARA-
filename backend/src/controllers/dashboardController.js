import { publicUser, readData, isParentOf } from '../data/store.js';
import { pool } from '../config/database.js';

export async function studentDashboard(req, res) {
  const data = readData();
  const student = data.users.find((user) => user.id === req.params.userId);

  if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

  let instructorCourseIds = null;
  if (req.user.role === 'student' && req.user.id !== student.id) {
    return res.status(403).json({ message: 'No autorizado' });
  }
  if (req.user.role === 'parent' && !isParentOf(data, req.user.id, student.id)) {
    return res.status(403).json({ message: 'No autorizado' });
  }
  if (req.user.role === 'instructor') {
    try {
      const assignment = await pool.query(
        `
          SELECT DISTINCT c.id
          FROM courses c
          JOIN course_students cs ON cs.course_id = c.id
          WHERE c.instructor_id = $1
            AND cs.student_id = $2
            AND cs.status = 'active'
        `,
        [req.user.id, student.id]
      );

      if (!assignment.rows.length) {
        return res.status(403).json({ message: 'No autorizado' });
      }
      instructorCourseIds = new Set(assignment.rows.map((row) => row.id));
    } catch (error) {
      console.error('Error verificando la asignación del docente:', error);
      return res.status(500).json({ message: 'No se pudo verificar el acceso al estudiante' });
    }
  } else if (!['student', 'parent', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  const attendance = data.attendance.filter((record) =>
    record.userId === student.id &&
    (!instructorCourseIds || instructorCourseIds.has(record.courseId))
  );
  const achievements = data.userAchievements
    .filter((item) => item.userId === student.id)
    .map((item) => ({
      ...item,
      achievement: data.achievements.find((achievement) => achievement.id === item.achievementId)
    }));

  return res.json({
    student: publicUser(student),
    attendanceSummary: {
      total: attendance.length,
      present: attendance.filter((record) => record.status === 'present').length,
      late: attendance.filter((record) => record.status === 'late').length,
      absent: attendance.filter((record) => record.status === 'absent').length
    },
    xp: {
      total: student.totalXp,
      currentLevel: student.currentLevel,
      nextLevel: data.levels.find((level) => level.minXp > student.totalXp)
    },
    streak: data.streaks.find((streak) => streak.userId === student.id),
    achievements,
    xpEvents: data.xpEvents.filter((event) => event.userId === student.id).slice(0, 6)
  });
}

export function parentChildren(req, res) {
  const data = readData();
  const parent = data.users.find((u) => u.id === req.params.parentId);
  if (!parent) return res.status(404).json({ message: 'Padre no encontrado' });
  if (parent.role !== 'parent') return res.status(403).json({ message: 'No autorizado' });
  if (req.user.role === 'parent' && req.user.id !== parent.id) {
    return res.status(403).json({ message: 'No autorizado' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'parent') {
    return res.status(403).json({ message: 'No autorizado' });
  }

  const relations = (data.parentRelations || []).filter((r) => r.parentId === parent.id);
  const children = relations
    .map((rel) => data.users.find((u) => u.id === rel.childId))
    .filter(Boolean)
    .map((u) => publicUser(u));

  return res.json({ parent: publicUser(parent), children });
}

export function parentView(req, res) {
  const data = readData();
  const parent = data.users.find((u) => u.id === req.params.parentId);
  if (!parent) return res.status(404).json({ message: 'Padre no encontrado' });
  if (parent.role !== 'parent') return res.status(403).json({ message: 'No autorizado' });
  if (req.user.role === 'parent' && req.user.id !== parent.id) {
    return res.status(403).json({ message: 'No autorizado' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'parent') {
    return res.status(403).json({ message: 'No autorizado' });
  }

  const student = data.users.find((u) => u.id === req.params.childId);
  if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });
  if (student.role !== 'student') return res.status(403).json({ message: 'No autorizado' });

  // verify relation exists
  const relation = (data.parentRelations || []).find((r) => r.parentId === parent.id && r.childId === student.id);
  if (!relation) return res.status(403).json({ message: 'Acceso denegado: no está asociado con ese estudiante' });

  const attendance = data.attendance.filter((record) => record.userId === student.id);
  const achievements = data.userAchievements
    .filter((item) => item.userId === student.id)
    .map((item) => ({
      ...item,
      achievement: data.achievements.find((a) => a.id === item.achievementId)
    }));

  const attendanceSummary = {
    total: attendance.length,
    present: attendance.filter((r) => r.status === 'present').length,
    late: attendance.filter((r) => r.status === 'late').length,
    absent: attendance.filter((r) => r.status === 'absent').length
  };

  const streak = data.streaks.find((s) => s.userId === student.id) || { currentCount: 0 };

  // risk detection heuristics
  const alerts = [];
  if (attendanceSummary.absent >= 3) alerts.push({ level: 'high', message: 'Alto riesgo por ausencias frecuentes' });
  if ((streak.currentCount || 0) <= 1) alerts.push({ level: 'medium', message: 'Baja actividad reciente' });
  if ((student.totalXp || 0) < 200) alerts.push({ level: 'low', message: 'Progreso bajo en XP' });

  return res.json({
    student: publicUser(student),
    attendanceSummary,
    xp: {
      total: student.totalXp,
      currentLevel: student.currentLevel,
      nextLevel: data.levels.find((level) => level.minXp > student.totalXp)
    },
    streak,
    achievements,
    xpEvents: data.xpEvents.filter((e) => e.userId === student.id).slice(0, 6),
    alerts
  });
}
