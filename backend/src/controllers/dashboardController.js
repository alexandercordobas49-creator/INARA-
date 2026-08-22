import { pool } from '../config/database.js';

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    totalXp: row.total_xp,
    currentLevel: row.current_level,
    createdAt: row.created_at
  };
}

async function isParentOf(parentId, childId) {
  const result = await pool.query(
    'SELECT 1 FROM parent_relations WHERE parent_id=$1 AND child_id=$2',
    [parentId, childId]
  );
  return result.rowCount > 0;
}

async function getStudentDashboard(userId) {
  const studentResult = await pool.query(`
    SELECT id, first_name, last_name, email, role, total_xp, current_level, created_at
    FROM users
    WHERE id=$1
  `, [userId]);
  const student = studentResult.rows[0];
  if (!student) return null;

  const [attendance, achievements, xpEvents, streak, nextLevel] = await Promise.all([
    pool.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status='present')::int AS present,
             COUNT(*) FILTER (WHERE status='late')::int AS late,
             COUNT(*) FILTER (WHERE status='absent')::int AS absent
      FROM attendance_records WHERE user_id=$1
    `, [userId]),
    pool.query(`
      SELECT ua.id, ua.user_id AS "userId", ua.achievement_id AS "achievementId",
             ua.earned_at AS "earnedAt", a.code, a.name, a.description,
             a.xp_reward AS "xpReward"
      FROM user_achievements ua
      JOIN achievements a ON a.id=ua.achievement_id
      WHERE ua.user_id=$1 ORDER BY ua.earned_at DESC
    `, [userId]),
    pool.query(`
      SELECT id, user_id AS "userId", points, source, description, created_at AS "createdAt"
      FROM xp_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 6
    `, [userId]),
    pool.query(`
      SELECT id, user_id AS "userId", course_id AS "courseId",
             current_count AS "currentCount", best_count AS "bestCount",
             last_activity_date AS "lastActivityDate", updated_at AS "updatedAt"
      FROM streaks WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 1
    `, [userId]),
    pool.query(`
      SELECT level_number AS "levelNumber", name, min_xp AS "minXp"
      FROM levels WHERE min_xp > $1 ORDER BY min_xp LIMIT 1
    `, [student.total_xp])
  ]);

  return {
    student: publicUser(student),
    attendanceSummary: attendance.rows[0],
    xp: { total: student.total_xp, currentLevel: student.current_level, nextLevel: nextLevel.rows[0] || null },
    streak: streak.rows[0] || null,
    achievements: achievements.rows,
    xpEvents: xpEvents.rows
  };
}

export async function studentDashboard(req, res) {
  try {
    const student = await pool.query('SELECT id, role FROM users WHERE id=$1', [req.params.userId]);
    const target = student.rows[0];
    if (!target) return res.status(404).json({ message: 'Estudiante no encontrado' });

    if (req.user.role === 'student' && req.user.id !== target.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    if (req.user.role === 'parent' && !(await isParentOf(req.user.id, target.id))) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    return res.json(await getStudentDashboard(target.id));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo dashboard' });
  }
}

export async function parentChildren(req, res) {
  try {
    const parentResult = await pool.query(`
      SELECT id, first_name, last_name, email, role, total_xp, current_level, created_at
      FROM users WHERE id=$1
    `, [req.params.parentId]);
    const parent = parentResult.rows[0];
    if (!parent) return res.status(404).json({ message: 'Padre no encontrado' });
    if (req.user.role === 'parent' && req.user.id !== parent.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const children = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.total_xp, u.current_level, u.created_at
      FROM parent_relations pr
      JOIN users u ON u.id=pr.child_id
      WHERE pr.parent_id=$1
      ORDER BY u.last_name, u.first_name
    `, [parent.id]);

    return res.json({ parent: publicUser(parent), children: children.rows.map(publicUser) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo estudiantes asociados' });
  }
}

export async function parentView(req, res) {
  try {
    const { parentId, childId } = req.params;
    const parent = await pool.query('SELECT id FROM users WHERE id=$1', [parentId]);
    if (!parent.rowCount) return res.status(404).json({ message: 'Padre no encontrado' });
    if (req.user.role === 'parent' && req.user.id !== parentId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    if (!(await isParentOf(parentId, childId))) {
      return res.status(403).json({ message: 'Acceso denegado: no está asociado con ese estudiante' });
    }

    const dashboard = await getStudentDashboard(childId);
    if (!dashboard) return res.status(404).json({ message: 'Estudiante no encontrado' });

    const summary = dashboard.attendanceSummary;
    const streak = dashboard.streak || { currentCount: 0 };
    const alerts = [];
    if (summary.absent >= 3) alerts.push({ level: 'high', message: 'Alto riesgo por ausencias frecuentes' });
    if ((streak.currentCount || 0) <= 1) alerts.push({ level: 'medium', message: 'Baja actividad reciente' });
    if ((dashboard.xp.total || 0) < 200) alerts.push({ level: 'low', message: 'Progreso bajo en XP' });

    return res.json({ ...dashboard, alerts });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo vista familiar' });
  }
}
