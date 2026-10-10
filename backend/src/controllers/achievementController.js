import { pool } from '../config/database.js';
import FamilyRepository from '../repositories/FamilyRepository.js';

async function canAccessUser(actor, targetUserId) {
  const normalizedTargetUserId = targetUserId.toLowerCase();
  if (actor.role === 'admin') return true;
  if (actor.role === 'student') return actor.id.toLowerCase() === normalizedTargetUserId;
  if (actor.role === 'parent') {
    return FamilyRepository.isParentOf(actor.id, normalizedTargetUserId);
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
      [actor.id, normalizedTargetUserId]
    );
    return result.rows.length > 0;
  }
  return false;
}

export async function achievementSummary(req, res) {
  const targetUserId = req.params.userId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId)) {
    return res.status(400).json({ message: 'Identificador de estudiante inválido' });
  }
  const normalizedTargetUserId = targetUserId.toLowerCase();
  try {
    if (!(await canAccessUser(req.user, normalizedTargetUserId))) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const [studentResult, achievements, earned, streaks] = await Promise.all([
      pool.query(
        `SELECT id, ${req.user.role === 'instructor' ? 'NULL::integer AS total_xp' : 'total_xp'}
         FROM users WHERE id = $1 AND role = 'student'`,
        [normalizedTargetUserId]
      ),
      pool.query('SELECT id, code, name, description, xp_reward FROM achievements ORDER BY name'),
      pool.query(
        `
          SELECT ua.id, ua.user_id, ua.achievement_id, ua.earned_at,
            a.code, a.name, a.description, a.xp_reward
          FROM user_achievements ua
          JOIN achievements a ON a.id = ua.achievement_id
          WHERE ua.user_id = $1
          ORDER BY ua.earned_at DESC
        `,
        [normalizedTargetUserId]
      ),
      pool.query(
        `
          SELECT id, user_id, course_id, current_count, best_count, last_activity_date, updated_at
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
          ORDER BY updated_at DESC
        `,
        req.user.role === 'instructor' ? [normalizedTargetUserId, req.user.id] : [normalizedTargetUserId]
      )
    ]);
    if (!studentResult.rows.length) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    return res.json({
      student: {
        id: studentResult.rows[0].id,
        totalXp: studentResult.rows[0].total_xp
      },
      achievements: achievements.rows,
      earnedAchievements: earned.rows,
      streaks: streaks.rows
    });
  } catch (error) {
    console.error('Unable to load achievement summary:', error.message);
    return res.status(500).json({ message: 'Error obteniendo logros' });
  }
}
