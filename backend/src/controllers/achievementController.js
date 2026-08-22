import { pool } from '../config/database.js';

export async function achievementSummary(req, res) {
  try {
    const { userId } = req.params;

    const [achievements, earnedAchievements, streaks] = await Promise.all([
      pool.query(`
        SELECT id, code, name, description, xp_reward AS "xpReward"
        FROM achievements
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
        JOIN achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = $1
        ORDER BY ua.earned_at DESC
      `, [userId]),
      pool.query(`
        SELECT
          id,
          user_id AS "userId",
          course_id AS "courseId",
          current_count AS "currentCount",
          best_count AS "bestCount",
          last_activity_date AS "lastActivityDate",
          updated_at AS "updatedAt"
        FROM streaks
        WHERE user_id = $1
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
    return res.status(500).json({ message: 'Error obteniendo logros' });
  }
}
