import { isParentOf, readData } from '../data/store.js';

function canAccessUser(actor, targetUserId) {
  if (actor.role === 'admin') return true;
  if (actor.role === 'student') return actor.id === targetUserId;
  if (actor.role === 'parent') {
    const data = readData();
    return isParentOf(data, actor.id, targetUserId);
  }
  return false;
}

export function achievementSummary(req, res) {
  const targetUserId = req.params.userId;
  if (!canAccessUser(req.user, targetUserId)) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  const data = readData();
  const earned = data.userAchievements
    .filter((item) => item.userId === targetUserId)
    .map((item) => ({
      ...item,
      achievement: data.achievements.find((achievement) => achievement.id === item.achievementId)
    }));

  return res.json({
    achievements: data.achievements,
    earnedAchievements: earned,
    streaks: data.streaks.filter((streak) => streak.userId === targetUserId)
  });
}
