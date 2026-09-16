import { pool } from '../config/database.js';

async function isParentOf(parentId, childId) {
  const result = await pool.query(
    `
    SELECT 1
    FROM parent_relations
    WHERE parent_id = $1
      AND child_id = $2
    LIMIT 1
    `,
    [parentId, childId]
  );

  return result.rowCount > 0;
}

async function canViewUser(req, userId) {
  if (!req.user) return false;

  if (
    req.user.role === 'admin' ||
    req.user.role === 'instructor'
  ) {
    return true;
  }

  if (req.user.role === 'student') {
    return req.user.id === userId;
  }

  if (req.user.role === 'parent') {
    return await isParentOf(req.user.id, userId);
  }

  return false;
}

export async function achievementSummary(req, res) {
  try {
    const { userId } = req.params;

    const allowed = await canViewUser(req, userId);

    if (!allowed) {
      return res.status(403).json({
        message: 'No autorizado'
      });
    }

    const userResult = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (!userResult.rows[0]) {
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

    return res.status(500).json({
      message: 'Error obteniendo logros'
    });
  }
}
