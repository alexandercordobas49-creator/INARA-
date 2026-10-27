import { publicUser, readData, isParentOf } from '../data/store.js';
import { pool } from '../config/database.js';

export async function studentDashboard(req, res) {
  try {
    const studentResult = await pool.query(
      `SELECT id, first_name, last_name, email, role, total_xp, current_level, created_at
       FROM users WHERE id = $1`,
      [req.params.userId]
    );
    const student = studentResult.rows[0];

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    if (req.user.role === 'student' && req.user.id !== student.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    if (req.user.role === 'parent') {
      const relation = await pool.query(
        'SELECT 1 FROM parent_relations WHERE parent_id = $1 AND child_id = $2 LIMIT 1',
        [req.user.id, student.id]
      );
      if (!relation.rowCount) return res.status(403).json({ message: 'No autorizado' });
    }

    const [attendanceResult, achievementsResult, xpResult, streakResult, levelsResult] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'present')::int AS present,
           COUNT(*) FILTER (WHERE status = 'late')::int AS late,
           COUNT(*) FILTER (WHERE status = 'absent')::int AS absent,
           COUNT(*) FILTER (WHERE status = 'excused')::int AS excused
         FROM attendance_records WHERE user_id = $1`,
        [student.id]
      ),
      pool.query(
        `SELECT ua.id, ua.earned_at, json_build_object(
           'name', a.name, 'description', a.description, 'xpReward', a.xp_reward
         ) AS achievement
         FROM user_achievements ua
         JOIN achievements a ON a.id = ua.achievement_id
         WHERE ua.user_id = $1 ORDER BY ua.earned_at DESC LIMIT 6`,
        [student.id]
      ),
      pool.query(
        `SELECT id, points, source, description, created_at
         FROM xp_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 6`,
        [student.id]
      ),
      pool.query(
        `SELECT COALESCE(MAX(current_count), 0)::int AS current_count,
                COALESCE(MAX(best_count), 0)::int AS best_count,
                MAX(last_activity_date) AS last_activity_date
         FROM streaks WHERE user_id = $1`,
        [student.id]
      ),
      pool.query(
        'SELECT level_number, name, min_xp FROM levels ORDER BY min_xp',
        []
      )
    ]);

    const historyResult = await pool.query(
      `SELECT ar.id, ar.session_date, ar.status, ar.notes, c.name AS course_name
       FROM attendance_records ar
       JOIN courses c ON c.id = ar.course_id
       WHERE ar.user_id = $1
       ORDER BY ar.session_date DESC, c.name
       LIMIT 60`,
      [student.id]
    );
    const attendanceSummary = attendanceResult.rows[0];
    const streak = streakResult.rows[0];
    const currentLevel = Number(student.current_level || 1);
    const nextLevel = levelsResult.rows.find((level) => Number(level.min_xp) > Number(student.total_xp)) || null;

    return res.json({
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        role: student.role,
        created_at: student.created_at
      },
      attendanceSummary,
      xp: {
        total: Number(student.total_xp || 0),
        currentLevel,
        nextLevel,
        progressToNextLevel: nextLevel
          ? Math.min(100, Math.round((Number(student.total_xp) / Number(nextLevel.min_xp)) * 100))
          : 100
      },
      streak,
      achievements: achievementsResult.rows,
      xpEvents: xpResult.rows,
      attendanceHistory: historyResult.rows
    });
  } catch (error) {
    console.error('Error construyendo dashboard del estudiante:', error);
    return res.status(500).json({ message: 'No se pudo cargar el panel del estudiante' });
  }
}

export function parentChildren(req, res) {
  const data = readData();
  const parent = data.users.find((u) => u.id === req.params.parentId);
  if (!parent) return res.status(404).json({ message: 'Padre no encontrado' });
  if (req.user.role === 'parent' && req.user.id !== parent.id) {
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
  if (req.user.role === 'parent' && req.user.id !== parent.id) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  const student = data.users.find((u) => u.id === req.params.childId);
  if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

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
