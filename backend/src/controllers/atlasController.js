import { readData, isParentOf } from '../data/store.js';

function canAccessStudent(actor, targetUserId) {
  if (!actor) return false;
  if (actor.role === 'admin') return true;
  if (actor.role === 'student') return actor.id === targetUserId;
  if (actor.role === 'parent') {
    const data = readData();
    return isParentOf(data, actor.id, targetUserId);
  }
  return false;
}

export function askAtlas(req, res) {
  const data = readData();
  const question = req.body.question?.trim();

  if (!question) return res.status(400).json({ message: 'Escribe una pregunta para Atlas IA' });

  const targetUserId = req.body.userId || req.user?.id;
  if (!targetUserId || !canAccessStudent(req.user, targetUserId)) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  const student = data.users.find((user) => user.id === targetUserId);
  if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

  const attendance = data.attendance.filter((record) => record.userId === student.id);
  const present = attendance.filter((record) => record.status === 'present').length;
  const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
  const streak = data.streaks.find((item) => item.userId === student.id);
  const nextLevel = data.levels.find((level) => level.minXp > (student.totalXp || 0));

  return res.json({
    answer: `${student.firstName} tiene ${(student.totalXp || 0)} XP, nivel ${student.currentLevel}, asistencia de ${attendanceRate}% y racha actual de ${streak?.currentCount || 0} dias. ${nextLevel ? `Le faltan ${nextLevel.minXp - (student.totalXp || 0)} XP para el nivel ${nextLevel.name}.` : 'Ya alcanzo el nivel maximo configurado.'}`,
    suggestions: [
      'Registrar asistencia en las proximas sesiones',
      'Revisar estudiantes con baja continuidad',
      'Crear retos cortos para ganar XP'
    ],
    source: 'datos-academicos',
    audience: 'estudiante'
  });
}
