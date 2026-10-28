import { pool } from '../config/database.js';
import { canAccessStudent } from '../middleware/accessControl.js';

export async function achievementSummary(req, res) {
  try {
    const { userId } = req.params;

    if (!(await canAccessStudent(req.user, userId))) {
      return res.status(403).json({
        message: 'No autorizado'
      });
    }

    const userResult = await pool.query(
      `
      SELECT id, role
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (!userResult.rows[0] || userResult.rows[0].role !== 'student') {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    const [
      achievements,
      earnedAchievements,
      streaks
    ] = await Promise.all([
      pool.query(`
        SELECT
          id,
          code,
          name,
          description,
          xp_reward AS "xpReward"
        FROM achievements
        WHERE code NOT IN ('first-attendance', 'streak-5', 'pilot-20')
        ORDER BY name
      `),

      pool.query(`
        SELECT
          ua.id,
          ua.user_id AS "userId",
          ua.achievement_id AS "achievementId",
          ua.earned_at AS "earnedAt",
          a.code,
          a.name,
          a.description,
          a.xp_reward AS "xpReward"
        FROM user_achievements ua
        JOIN achievements a
          ON a.id = ua.achievement_id
        WHERE ua.user_id = $1
          AND a.code NOT IN ('first-attendance', 'streak-5', 'pilot-20')
        ORDER BY ua.earned_at DESC
      `, [userId]),

      pool.query(`
        SELECT
          id,
          user_id AS "userId",
          course_id AS "courseId",
          best_count AS "bestCount",
          last_activity_date AS "lastActivityDate",
          updated_at AS "updatedAt"
        FROM streaks s
        WHERE user_id = $1
          AND EXISTS (
            SELECT 1 FROM attendance_records ar
            WHERE ar.user_id = s.user_id AND ar.course_id = s.course_id
              AND COALESCE(ar.notes, '') NOT ILIKE '%demostrativo%'
              AND COALESCE(ar.notes, '') NOT ILIKE '%ejemplo%'
              AND COALESCE(ar.notes, '') NOT ILIKE '%seguimiento formativo%'
              AND COALESCE(ar.notes, '') NOT ILIKE '%escenario piloto%'
          )
        ORDER BY updated_at DESC
      `, [userId])
    ]);

    return res.json({
      achievements: achievements.rows,
      earnedAchievements: earnedAchievements.rows,
      streaks: streaks.rows
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: 'Error obteniendo logros'
    });
  }
}
