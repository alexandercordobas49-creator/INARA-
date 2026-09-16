import { pool } from '../config/database.js';

function levelForScore(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function priorityForLevel(level) {
  return {
    low: 'LOW',
    medium: 'MEDIUM',
    high: 'HIGH',
    critical: 'CRITICAL'
  }[level];
}

function recommendationFor(level, factors) {
  const hasAttendance = factors.some((factor) => factor.code === 'attendance');
  const hasActivity = factors.some((factor) => factor.code === 'activity');
  const hasStreak = factors.some((factor) => factor.code === 'streak');

  if (hasAttendance) {
    return {
      type: 'ATTENDANCE',
      title: 'Dar seguimiento a la asistencia',
      message: 'Realizar seguimiento al estudiante debido a ausencias frecuentes y revisar posibles causas.'
    };
  }

  if (hasActivity || hasStreak) {
    return {
      type: 'ATLAS',
      title: 'Revisar la disminución de actividad',
      message: 'Atlas recomienda contactar al estudiante y verificar posibles causas de su disminución de actividad.'
    };
  }

  return {
    type: 'RISK',
    title: 'Revisar la situación académica',
    message: 'Revisar la situación académica del estudiante y acordar un próximo paso de seguimiento.'
  };
}

async function readSignals(client, studentId) {
  const result = await client.query(`
    SELECT
      u.id,
      u.first_name AS "firstName",
      u.last_name AS "lastName",
      u.total_xp AS "totalXp",
      u.current_level AS "currentLevel",
      COALESCE(att.total_sessions, 0)::int AS "totalSessions",
      COALESCE(att.absent_sessions, 0)::int AS "absentSessions",
      COALESCE(att.recent_sessions, 0)::int AS "recentSessions",
      COALESCE(att.recent_absences, 0)::int AS "recentAbsences",
      COALESCE(xp.recent_events, 0)::int AS "recentXpEvents",
      COALESCE(xp.recent_points, 0)::int AS "recentXpPoints",
      COALESCE(streak.current_count, 0)::int AS "currentStreak",
      COALESCE(progress.completed_missions, 0)::int AS "completedMissions",
      COALESCE(progress.routes_started, 0)::int AS "routesStarted"
    FROM users u
    LEFT JOIN (
      SELECT
        user_id,
        COUNT(*) AS total_sessions,
        COUNT(*) FILTER (WHERE status = 'absent') AS absent_sessions,
        COUNT(*) FILTER (WHERE session_date >= CURRENT_DATE - INTERVAL '30 days') AS recent_sessions,
        COUNT(*) FILTER (WHERE session_date >= CURRENT_DATE - INTERVAL '30 days' AND status = 'absent') AS recent_absences
      FROM attendance_records
      GROUP BY user_id
    ) att ON att.user_id = u.id
    LEFT JOIN (
      SELECT
        user_id,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS recent_events,
        COALESCE(SUM(points) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0) AS recent_points
      FROM xp_events
      GROUP BY user_id
    ) xp ON xp.user_id = u.id
    LEFT JOIN (
      SELECT user_id, MAX(current_count) AS current_count
      FROM streaks
      GROUP BY user_id
    ) streak ON streak.user_id = u.id
    LEFT JOIN (
      SELECT
        user_id,
        COUNT(*) AS routes_started,
        COALESCE(SUM(jsonb_array_length(completed_missions)), 0) AS completed_missions
      FROM user_competency_progress
      GROUP BY user_id
    ) progress ON progress.user_id = u.id
    WHERE u.id = $1 AND u.role = 'student'
  `, [studentId]);

  return result.rows[0] || null;
}

function evaluateSignals(signals) {
  const factors = [];
  const totalSessions = Number(signals.totalSessions);
  const recentSessions = Number(signals.recentSessions);
  const recentAbsences = Number(signals.recentAbsences);
  const recentXpEvents = Number(signals.recentXpEvents);
  const currentStreak = Number(signals.currentStreak);
  const routesStarted = Number(signals.routesStarted);
  const completedMissions = Number(signals.completedMissions);

  let attendanceScore = 0;
  if (totalSessions === 0) {
    attendanceScore = 55;
    factors.push({ code: 'attendance', label: 'No hay registros de asistencia disponibles.' });
  } else {
    const absenceRate = Number(signals.absentSessions) / totalSessions;
    attendanceScore = Math.round(absenceRate * 100);
    if (recentAbsences >= 3) {
      attendanceScore = Math.max(attendanceScore, 80);
      factors.push({ code: 'attendance', label: `${recentAbsences} ausencias en los últimos 30 días.` });
    } else if (recentAbsences > 0) {
      factors.push({ code: 'attendance', label: `${recentAbsences} ausencia${recentAbsences === 1 ? '' : 's'} reciente${recentAbsences === 1 ? '' : 's'}.` });
    }
    if (recentSessions === 0) {
      attendanceScore = Math.max(attendanceScore, 65);
      factors.push({ code: 'attendance', label: 'No registra asistencia en los últimos 30 días.' });
    }
  }

  const activityScore = recentXpEvents === 0 ? 75 : recentXpEvents <= 2 ? 45 : 10;
  if (recentXpEvents === 0) {
    factors.push({ code: 'activity', label: 'No hay actividad XP en los últimos 30 días.' });
  } else if (recentXpEvents <= 2) {
    factors.push({ code: 'activity', label: 'La actividad reciente es baja.' });
  }

  const streakScore = currentStreak === 0 ? 70 : currentStreak <= 1 ? 45 : 10;
  if (currentStreak === 0) {
    factors.push({ code: 'streak', label: 'No hay una racha activa registrada.' });
  } else if (currentStreak <= 1) {
    factors.push({ code: 'streak', label: 'La racha activa es de solo un día.' });
  }

  const progressScore = routesStarted === 0 && completedMissions === 0 ? 55 : 10;
  if (progressScore > 10) {
    factors.push({ code: 'progress', label: 'No hay progreso de competencias registrado.' });
  }

  const score = Math.round(
    attendanceScore * 0.35 +
    activityScore * 0.25 +
    streakScore * 0.2 +
    progressScore * 0.2
  );
  const level = levelForScore(score);

  return {
    score,
    level,
    attendanceScore,
    xpScore: Math.min(100, recentXpEvents === 0 ? 70 : recentXpEvents <= 2 ? 40 : 10),
    engagementScore: activityScore,
    streakScore,
    factors,
    mainReason: factors[0]?.label || 'No se detectaron señales relevantes.',
    recommendation: recommendationFor(level, factors)
  };
}

export async function evaluateStudentRisk(studentId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const signals = await readSignals(client, studentId);
    if (!signals) {
      const error = new Error('Estudiante no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const evaluation = evaluateSignals(signals);
    const riskResult = await client.query(`
      INSERT INTO student_risk
        (student_id, risk_score, level, attendance_score, xp_score, engagement_score, streak_score, main_reason, factors, status, last_evaluated_at)
      VALUES ($1,$2,$3::risk_level,$4,$5,$6,$7,$8,$9::jsonb,
        CASE WHEN $3 IN ('high', 'critical') THEN 'open' ELSE 'in_progress' END,
        NOW())
      RETURNING id, student_id AS "studentId", risk_score AS "riskScore", level,
        attendance_score AS "attendanceScore", xp_score AS "xpScore",
        engagement_score AS "engagementScore", streak_score AS "streakScore",
        main_reason AS "mainReason", factors, status, created_at AS "createdAt",
        last_evaluated_at AS "lastEvaluatedAt"
    `, [
      studentId,
      evaluation.score,
      evaluation.level,
      evaluation.attendanceScore,
      evaluation.xpScore,
      evaluation.engagementScore,
      evaluation.streakScore,
      evaluation.mainReason,
      JSON.stringify(evaluation.factors)
    ]);

    const risk = riskResult.rows[0];
    const recommendationResult = await client.query(`
      INSERT INTO recommendations
        (student_id, recommendation_type, priority, source, title, message, related_risk_id)
      VALUES ($1,$2::recommendation_type,$3::recommendation_priority,'SYSTEM'::recommendation_source,$4,$5,$6)
      RETURNING recommendation_id AS id, student_id AS "studentId", recommendation_type AS type,
        priority, source, title, message, related_risk_id AS "relatedRiskId",
        is_read AS "isRead", is_applied AS "isApplied", created_at AS "createdAt"
    `, [
      studentId,
      evaluation.recommendation.type,
      priorityForLevel(evaluation.level),
      evaluation.recommendation.title,
      evaluation.recommendation.message,
      risk.id
    ]);

    await client.query('COMMIT');
    return { student: signals, risk, recommendation: recommendationResult.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getLatestRisk(studentId) {
  const result = await pool.query(`
    SELECT DISTINCT ON (sr.student_id)
      sr.id, sr.student_id AS "studentId", sr.risk_score AS "riskScore", sr.level,
      sr.attendance_score AS "attendanceScore", sr.xp_score AS "xpScore",
      sr.engagement_score AS "engagementScore", sr.streak_score AS "streakScore",
      sr.main_reason AS "mainReason", sr.factors, sr.status,
      sr.created_at AS "createdAt", sr.last_evaluated_at AS "lastEvaluatedAt",
      u.first_name AS "firstName", u.last_name AS "lastName",
      r.recommendation_id AS "recommendationId", r.title AS "recommendationTitle",
      r.message AS "recommendationMessage", r.is_applied AS "recommendationApplied",
      i.action_type AS "lastInterventionType", i.created_at AS "lastInterventionAt"
    FROM student_risk sr
    JOIN users u ON u.id = sr.student_id
    LEFT JOIN recommendations r ON r.related_risk_id = sr.id
    LEFT JOIN LATERAL (
      SELECT action_type, created_at
      FROM interventions
      WHERE student_id = sr.student_id
      ORDER BY created_at DESC
      LIMIT 1
    ) i ON TRUE
    WHERE sr.student_id = $1
    ORDER BY sr.student_id, sr.created_at DESC
  `, [studentId]);

  return result.rows[0] || null;
}

export async function listLatestRisks(scope) {
  const result = await pool.query(`
    WITH assigned_students AS (
      SELECT DISTINCT u.id, u.first_name, u.last_name, u.email
      FROM users u
      LEFT JOIN course_students cs ON cs.student_id = u.id AND cs.enrollment_status = 'active'
      LEFT JOIN courses c ON c.id = cs.course_id
      WHERE u.role = 'student'
        AND ($1::text = 'admin' OR c.instructor_id = $2)
    )
    SELECT s.id AS "studentId", s.first_name AS "firstName", s.last_name AS "lastName", s.email,
      risk.id, risk.risk_score AS "riskScore", risk.level, risk.main_reason AS "mainReason",
      risk.factors, risk.status, risk.created_at AS "createdAt", risk.last_evaluated_at AS "lastEvaluatedAt",
      rec.title AS "recommendationTitle", rec.message AS "recommendationMessage",
      rec.is_applied AS "recommendationApplied",
      intervention.action_type AS "lastInterventionType", intervention.created_at AS "lastInterventionAt"
    FROM assigned_students s
    LEFT JOIN LATERAL (
      SELECT * FROM student_risk sr
      WHERE sr.student_id = s.id
      ORDER BY sr.created_at DESC
      LIMIT 1
    ) risk ON TRUE
    LEFT JOIN LATERAL (
      SELECT * FROM recommendations r
      WHERE r.related_risk_id = risk.id
      ORDER BY r.created_at DESC
      LIMIT 1
    ) rec ON TRUE
    LEFT JOIN LATERAL (
      SELECT action_type, created_at FROM interventions i
      WHERE i.student_id = s.id
      ORDER BY i.created_at DESC
      LIMIT 1
    ) intervention ON TRUE
    ORDER BY CASE risk.level WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      risk.risk_score DESC NULLS LAST, s.last_name, s.first_name
  `, [scope.role, scope.id]);

  return result.rows;
}

export async function getRecommendations(studentId) {
  const result = await pool.query(`
    SELECT recommendation_id AS id, student_id AS "studentId", recommendation_type AS type,
      priority, source, title, message, related_risk_id AS "relatedRiskId",
      is_read AS "isRead", is_applied AS "isApplied", created_at AS "createdAt"
    FROM recommendations
    WHERE student_id = $1
    ORDER BY created_at DESC
  `, [studentId]);
  return result.rows;
}
