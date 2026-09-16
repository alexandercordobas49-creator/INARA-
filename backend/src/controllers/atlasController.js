import { pool } from '../config/database.js';

export async function askAtlas(req, res) {
  try {
    const question = req.body.question?.trim();

    if (!question) {
      return res.status(400).json({
        message: 'Escribe una pregunta para Atlas IA'
      });
    }

    if (!req.user) {
      return res.status(401).json({
        message: 'No autenticado'
      });
    }

    let studentId = null;

    if (req.user.role === 'student') {
      studentId = req.user.id;
    } else if (req.body.userId) {
      studentId = req.body.userId;
    } else if (
      req.user.role === 'admin' ||
      req.user.role === 'instructor'
    ) {
      return res.status(400).json({
        message: 'Debes indicar el estudiante para consultar Atlas IA'
      });
    } else if (req.user.role === 'parent') {
      return res.status(400).json({
        message: 'Debes indicar el estudiante para consultar Atlas IA'
      });
    }

    if (!studentId) {
      return res.status(400).json({
        message: 'No se pudo determinar el estudiante'
      });
    }

    const studentResult = await pool.query(
      `
      SELECT
        id,
        first_name,
        last_name,
        total_xp,
        current_level
      FROM users
      WHERE id = $1
        AND role = 'student'
      LIMIT 1
      `,
      [studentId]
    );

    const student = studentResult.rows[0];

    if (!student) {
      return res.status(404).json({
        message: 'Estudiante no encontrado'
      });
    }

    if (req.user.role === 'parent') {
      const relationResult = await pool.query(
        `
        SELECT 1
        FROM parent_relations
        WHERE parent_id = $1
          AND child_id = $2
        LIMIT 1
        `,
        [req.user.id, student.id]
      );

      if (relationResult.rowCount === 0) {
        return res.status(403).json({
          message: 'No autorizado'
        });
      }
    }

    if (
      req.user.role === 'student' &&
      req.user.id !== student.id
    ) {
      return res.status(403).json({
        message: 'No autorizado'
      });
    }

    const [
      attendanceResult,
      streakResult,
      nextLevelResult,
      riskResult
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE status = 'present'
          )::int AS present
        FROM attendance_records
        WHERE user_id = $1
      `, [student.id]),

      pool.query(`
        SELECT
          COALESCE(MAX(current_count), 0)::int AS "currentCount"
        FROM streaks
        WHERE user_id = $1
      `, [student.id]),

      pool.query(`
        SELECT
          level_number AS "levelNumber",
          name,
          min_xp AS "minXp"
        FROM levels
        WHERE min_xp > $1
        ORDER BY min_xp
        LIMIT 1
      `, [student.total_xp])
      , pool.query(`
        SELECT sr.level, sr.risk_score AS "riskScore", sr.factors,
               r.message AS recommendation
        FROM student_risk sr
        LEFT JOIN LATERAL (
          SELECT message
          FROM recommendations
          WHERE related_risk_id = sr.id
          ORDER BY created_at DESC
          LIMIT 1
        ) r ON TRUE
        WHERE sr.student_id = $1
        ORDER BY sr.created_at DESC
        LIMIT 1
      `, [student.id])
    ]);

    const attendance = attendanceResult.rows[0];

    const attendanceRate = attendance.total
      ? Math.round(
          (attendance.present / attendance.total) * 100
        )
      : 0;

    const streak =
      streakResult.rows[0]?.currentCount || 0;

    const nextLevel = nextLevelResult.rows[0];
    const risk = riskResult.rows[0];
    const riskFactors = Array.isArray(risk?.factors)
      ? risk.factors.map((factor) => factor.label).join(' ')
      : '';
    const riskSummary = risk
      ? ` Evaluación de riesgo ${risk.level} (${risk.riskScore}/100). ${riskFactors} ${risk.recommendation || ''}`.trim()
      : ' Todavía no existe una evaluación de riesgo persistida para este estudiante.';

    return res.json({
      answer: `${student.first_name} tiene ${student.total_xp} XP, nivel ${student.current_level}, asistencia de ${attendanceRate}% y racha actual de ${streak} días.${riskSummary} ${
        nextLevel
          ? `Le faltan ${
              nextLevel.minXp - student.total_xp
            } XP para el nivel ${nextLevel.name}.`
          : 'Ya alcanzó el nivel máximo configurado.'
      }`,

      suggestions: [
        'Registrar asistencia en las próximas sesiones',
        'Revisar estudiantes con baja continuidad',
        'Crear retos cortos para ganar XP'
      ]
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: 'Error consultando Atlas IA'
    });
  }
}
