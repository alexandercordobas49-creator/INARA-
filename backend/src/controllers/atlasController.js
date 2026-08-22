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
      nextLevelResult
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

    return res.json({
      answer: `${student.first_name} tiene ${student.total_xp} XP, nivel ${student.current_level}, asistencia de ${attendanceRate}% y racha actual de ${streak} días. ${
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
