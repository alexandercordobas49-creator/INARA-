import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storePath = path.join(backendDir, 'src', 'data', 'database.json');
const apply = process.argv.includes('--apply');
const targetDatabase = process.env.NODE_ENV === 'test'
  ? process.env.DB_NAME_TEST
  : process.env.DB_NAME;

if (!targetDatabase || process.env.CONFIRM_JSON_IMPORT_DB !== targetDatabase) {
  throw new Error('Define CONFIRM_JSON_IMPORT_DB exactamente igual al nombre de la base destino.');
}

const pool = new Pool({
  host: process.env.NODE_ENV === 'test' ? process.env.DB_HOST_TEST : process.env.DB_HOST,
  port: Number(process.env.NODE_ENV === 'test' ? process.env.DB_PORT_TEST : process.env.DB_PORT),
  database: targetDatabase,
  user: process.env.NODE_ENV === 'test' ? process.env.DB_USER_TEST : process.env.DB_USER,
  password: process.env.NODE_ENV === 'test' ? process.env.DB_PASSWORD_TEST : process.env.DB_PASSWORD
});

const summary = {
  usersMatched: 0,
  usersUnmatched: 0,
  usersAmbiguous: 0,
  usersReconciled: 0,
  coursesMatched: 0,
  coursesUnmatched: 0,
  coursesAmbiguous: 0,
  relationsInserted: 0,
  routesInserted: 0,
  attendanceInserted: 0,
  xpEventsInserted: 0,
  achievementsInserted: 0,
  streaksUpserted: 0,
  progressUpserted: 0,
  evidenceInserted: 0,
  notificationsInserted: 0,
  skipped: 0
};

function sourceDate(value, fallback = new Date()) {
  const result = value ? new Date(value) : fallback;
  return Number.isNaN(result.getTime()) ? fallback : result;
}

function sourceDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : value;
}

function uniqueIndex(rows, getKey) {
  const index = new Map();
  const ambiguous = new Set();
  for (const row of rows) {
    const key = getKey(row);
    if (index.has(key)) {
      index.delete(key);
      ambiguous.add(key);
    } else if (!ambiguous.has(key)) {
      index.set(key, row);
    }
  }
  return { index, ambiguous };
}

async function main() {
  const raw = await fs.readFile(storePath, 'utf8');
  const legacy = JSON.parse(raw);
  const client = await pool.connect();
  try {
    const userRows = await client.query('SELECT id, email, role FROM users');
    const { index: usersByEmail, ambiguous: ambiguousEmails } = uniqueIndex(
      userRows.rows,
      (user) => user.email.toLowerCase()
    );
    summary.usersAmbiguous += ambiguousEmails.size;
    const userIds = new Map();
    for (const user of legacy.users || []) {
      const emailKey = typeof user.email === 'string' ? user.email.toLowerCase() : '';
      const match = emailKey && !ambiguousEmails.has(emailKey) ? usersByEmail.get(emailKey) : null;
      if (match && (!user.role || user.role === match.role)) {
        userIds.set(user.id, match.id);
        summary.usersMatched += 1;
      } else {
        summary.usersUnmatched += 1;
      }
    }

    const courseRows = await client.query('SELECT id, name FROM courses');
    const { index: coursesByName, ambiguous: ambiguousCourseNames } = uniqueIndex(
      courseRows.rows,
      (course) => course.name.trim().toLowerCase()
    );
    summary.coursesAmbiguous += ambiguousCourseNames.size;
    const courseIds = new Map();
    for (const course of legacy.courses || []) {
      const courseNameKey = typeof course.name === 'string' ? course.name.trim().toLowerCase() : '';
      const match = courseNameKey && !ambiguousCourseNames.has(courseNameKey)
        ? coursesByName.get(courseNameKey)
        : null;
      if (match) {
        courseIds.set(course.id, match.id);
        summary.coursesMatched += 1;
      } else {
        summary.coursesUnmatched += 1;
      }
    }

    if (!apply) {
      console.log(JSON.stringify({ mode: 'dry-run', targetDatabase, ...summary }, null, 2));
      return;
    }

    await client.query('BEGIN');
    for (const relation of legacy.parentRelations || []) {
      const parentId = userIds.get(relation.parentId);
      const studentId = userIds.get(relation.childId);
      const parent = userRows.rows.find((user) => user.id === parentId);
      const student = userRows.rows.find((user) => user.id === studentId);
      if (!parentId || !studentId || parent?.role !== 'parent' || student?.role !== 'student') {
        summary.skipped += 1;
        continue;
      }
      const inserted = await client.query(
        `
          INSERT INTO parent_student_relations (parent_id, student_id)
          VALUES ($1, $2)
          ON CONFLICT (parent_id, student_id) DO NOTHING
        `,
        [parentId, studentId]
      );
      summary.relationsInserted += inserted.rowCount;
    }

    for (const route of legacy.competencyRoutes || []) {
      if (!route?.id || !route?.name || !Array.isArray(route.missions)) {
        summary.skipped += 1;
        continue;
      }
      const inserted = await client.query(
        `
          INSERT INTO competency_routes (route_id, name, description, icon, missions)
          VALUES ($1, $2, $3, $4, $5::jsonb)
          ON CONFLICT (route_id) DO NOTHING
        `,
        [route.id, route.name, route.description || '', route.icon || '', JSON.stringify(route.missions)]
      );
      summary.routesInserted += inserted.rowCount;
    }

    const achievementIds = new Map();
    for (const achievement of legacy.achievements || []) {
      if (!achievement?.code || !achievement?.name) {
        summary.skipped += 1;
        continue;
      }
      await client.query(
        `
          INSERT INTO achievements (code, name, description, xp_reward)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (code) DO NOTHING
        `,
        [achievement.code, achievement.name, achievement.description || '', Math.max(0, Number(achievement.xpReward) || 0)]
      );
      const row = await client.query('SELECT id FROM achievements WHERE code = $1', [achievement.code]);
      achievementIds.set(achievement.id, row.rows[0]?.id);
    }

    for (const attendance of legacy.attendance || []) {
      const userId = userIds.get(attendance.userId);
      const courseId = courseIds.get(attendance.courseId);
      const sessionDate = sourceDateOnly(attendance.sessionDate);
      if (!userId || !courseId || !sessionDate ||
          !['present', 'absent', 'late', 'excused'].includes(attendance.status)) {
        summary.skipped += 1;
        continue;
      }
      await client.query(
        `
          INSERT INTO course_students (course_id, student_id, status)
          VALUES ($1, $2, 'active')
          ON CONFLICT (course_id, student_id) DO NOTHING
        `,
        [courseId, userId]
      );
      const inserted = await client.query(
        `
          INSERT INTO attendance_records (user_id, course_id, session_date, status, notes, recorded_at, xp_awarded)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (user_id, course_id, session_date) DO NOTHING
        `,
        [
          userId,
          courseId,
          sessionDate,
          attendance.status,
          typeof attendance.notes === 'string' ? attendance.notes.slice(0, 500) : '',
          sourceDate(attendance.recordedAt),
          ['present', 'late'].includes(attendance.status)
        ]
      );
      summary.attendanceInserted += inserted.rowCount;
    }

    for (const event of legacy.xpEvents || []) {
      const userId = userIds.get(event.userId);
      const points = Number(event.points);
      if (!userId || !event.id || !Number.isInteger(points) ||
          points < -2147483648 || points > 2147483647) {
        summary.skipped += 1;
        continue;
      }
      const inserted = await client.query(
        `
          INSERT INTO xp_events (user_id, points, source, description, source_legacy_key, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (source_legacy_key) WHERE source_legacy_key IS NOT NULL DO NOTHING
        `,
        [
          userId,
          points,
          ['attendance', 'achievement', 'manual', 'streak'].includes(event.source) ? event.source : 'manual',
          typeof event.description === 'string' ? event.description.slice(0, 1000) : '',
          `json:${event.id}`,
          sourceDate(event.createdAt)
        ]
      );
      summary.xpEventsInserted += inserted.rowCount;
    }

    for (const streak of legacy.streaks || []) {
      const userId = userIds.get(streak.userId);
      const courseId = streak.courseId ? courseIds.get(streak.courseId) : null;
      if (!userId || (streak.courseId && !courseId)) {
        summary.skipped += 1;
        continue;
      }
      const updatedAt = sourceDate(streak.updatedAt);
      const lastActivityDate = sourceDateOnly(streak.lastActivityDate);
      const parsedCurrentCount = Number(streak.currentCount);
      const parsedBestCount = Number(streak.bestCount);
      const currentCount = Number.isInteger(parsedCurrentCount)
        ? Math.min(2147483647, Math.max(0, parsedCurrentCount))
        : 0;
      const bestCount = Number.isInteger(parsedBestCount)
        ? Math.min(2147483647, Math.max(currentCount, parsedBestCount))
        : currentCount;
      const inserted = await client.query(
        `
          INSERT INTO streaks
            (user_id, course_id, current_count, best_count, last_activity_date, updated_at, source_legacy_key)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (source_legacy_key) WHERE source_legacy_key IS NOT NULL
          DO UPDATE SET
            current_count = CASE
              WHEN EXCLUDED.updated_at >= streaks.updated_at THEN EXCLUDED.current_count
              ELSE streaks.current_count
            END,
            best_count = GREATEST(streaks.best_count, EXCLUDED.best_count),
            last_activity_date = CASE
              WHEN streaks.last_activity_date IS NULL THEN EXCLUDED.last_activity_date
              WHEN EXCLUDED.last_activity_date IS NULL THEN streaks.last_activity_date
              ELSE GREATEST(streaks.last_activity_date, EXCLUDED.last_activity_date)
            END,
            updated_at = GREATEST(streaks.updated_at, EXCLUDED.updated_at)
        `,
        [
          userId,
          courseId,
          currentCount,
          bestCount,
          lastActivityDate,
          updatedAt,
          `json:${streak.id || `${streak.userId}:${streak.courseId || 'overall'}`}`
        ]
      );
      summary.streaksUpserted += inserted.rowCount;
    }

    for (const earned of legacy.userAchievements || []) {
      const userId = userIds.get(earned.userId);
      const achievementId = achievementIds.get(earned.achievementId);
      if (!userId || !achievementId) {
        summary.skipped += 1;
        continue;
      }
      const inserted = await client.query(
        `
          INSERT INTO user_achievements (user_id, achievement_id, earned_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, achievement_id) DO NOTHING
        `,
        [userId, achievementId, sourceDate(earned.earnedAt)]
      );
      summary.achievementsInserted += inserted.rowCount;
    }

    const progressIds = new Map();
    for (const progress of legacy.userCompetencyProgress || []) {
      const userId = userIds.get(progress.userId);
      if (!userId || !progress.routeId) {
        summary.skipped += 1;
        continue;
      }
      const inserted = await client.query(
        `
          INSERT INTO user_competency_progress
            (user_id, route_id, completed_missions, started_at, updated_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, route_id)
          DO UPDATE SET completed_missions = (
            SELECT ARRAY(
              SELECT DISTINCT mission
              FROM unnest(user_competency_progress.completed_missions || EXCLUDED.completed_missions) AS mission
            )
          ), updated_at = GREATEST(user_competency_progress.updated_at, EXCLUDED.updated_at)
          RETURNING id
        `,
        [
          userId,
          progress.routeId,
          Array.isArray(progress.completedMissions) ? progress.completedMissions : [],
          sourceDate(progress.startedAt),
          sourceDate(progress.updatedAt)
        ]
      );
      if (progress.id) progressIds.set(progress.id, inserted.rows[0].id);
      summary.progressUpserted += inserted.rowCount;
    }

    for (const evidence of legacy.evidences || []) {
      const progressId = progressIds.get(evidence.progressId);
      if (!progressId || !evidence.id || !evidence.missionId || !evidence.title) {
        summary.skipped += 1;
        continue;
      }
      const inserted = await client.query(
        `
          INSERT INTO competency_evidence
            (progress_id, mission_id, evidence_type, title, description, url, source_legacy_key, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (source_legacy_key) WHERE source_legacy_key IS NOT NULL DO NOTHING
        `,
        [
          progressId,
          evidence.missionId,
          typeof evidence.type === 'string' ? evidence.type.slice(0, 40) : 'other',
          evidence.title.slice(0, 160),
          typeof evidence.description === 'string' ? evidence.description.slice(0, 2000) : '',
          typeof evidence.url === 'string' ? evidence.url.slice(0, 2048) : '',
          `json:${evidence.id}`,
          sourceDate(evidence.createdAt)
        ]
      );
      summary.evidenceInserted += inserted.rowCount;
    }

    for (const notification of legacy.notifications || []) {
      const userId = userIds.get(notification.toUserId);
      const studentId = userIds.get(notification.childId);
      if (!userId || !studentId || !notification.message || !notification.level) {
        summary.skipped += 1;
        continue;
      }
      const createdAt = sourceDate(notification.createdAt);
      const inserted = await client.query(
        `
          INSERT INTO notifications
            (to_user_id, student_id, alert_level, message, channel, status, dedupe_date, created_at, sent_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9)
          ON CONFLICT (to_user_id, student_id, alert_level, channel, dedupe_date) DO NOTHING
        `,
        [
          userId,
          studentId,
          String(notification.level).slice(0, 20),
          String(notification.message).slice(0, 2000),
          ['email', 'sms'].includes(notification.channel) ? notification.channel : 'email',
          ['pending', 'sent', 'failed'].includes(notification.status) ? notification.status : 'pending',
          createdAt.toISOString().slice(0, 10),
          createdAt,
          notification.sentAt ? sourceDate(notification.sentAt) : null
        ]
      );
      summary.notificationsInserted += inserted.rowCount;
    }

    for (const legacyUser of legacy.users || []) {
      const userId = userIds.get(legacyUser.id);
      if (!userId) continue;
      const totalXp = Number(legacyUser.totalXp);
      const validTotalXp = Number.isInteger(totalXp) && totalXp >= 0 && totalXp <= 2147483647;
      await client.query(
        `
          UPDATE users
          SET total_xp = GREATEST(
                total_xp,
                $2::integer,
                COALESCE((SELECT SUM(points)::integer FROM xp_events WHERE user_id = $1), 0)
              ),
              current_level = COALESCE(
                (
                  SELECT level_number
                  FROM levels
                  WHERE min_xp <= GREATEST(
                    total_xp,
                    $2::integer,
                    COALESCE((SELECT SUM(points)::integer FROM xp_events WHERE user_id = $1), 0)
                  )
                  ORDER BY min_xp DESC
                  LIMIT 1
                ),
                current_level
              ),
              updated_at = NOW()
          WHERE id = $1
        `,
        [userId, validTotalXp ? totalXp : 0]
      );
      summary.usersReconciled += 1;
    }

    await client.query('COMMIT');
    console.log(JSON.stringify({ mode: 'applied', targetDatabase, ...summary }, null, 2));
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Import rollback failed:', rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
}

try {
  await main();
} finally {
  await pool.end();
}
