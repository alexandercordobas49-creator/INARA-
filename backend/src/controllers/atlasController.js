import { pool } from '../config/database.js';

export async function askAtlas(req, res) {
  try {
    const question = req.body.question?.trim();
    if (!question) return res.status(400).json({ message: 'Escribe una pregunta para Atlas IA' });

    const studentResult = await pool.query(`
      SELECT id, first_name, last_name, total_xp, current_level
      FROM users
      WHERE role = 'student'
      ORDER BY created_at
      LIMIT 1
    `);

    const student = studentResult.rows[0];
    if (!student) return res.status(404).json({ message: 'No hay estudiantes registrados' });

    const [attendanceResult, streakResult, nextLevelResult] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status = 'present')::int AS present
        FROM attendance_records
        WHERE user_id = $1
      `, [student.id]),
      pool.query(`
        SELECT COALESCE(MAX(current_count), 0)::int AS "currentCount"
        FROM streaks
        WHERE user_id = $1
      `, [student.id]),
      pool.query(`
        SELECT level_number AS "levelNumber", name, min_xp AS "minXp"
        FROM levels
        WHERE min_xp > $1
        ORDER BY min_xp
        LIMIT 1
      `, [student.total_xp])
    ]);

    const attendance = attendanceResult.rows[0];
    const attendanceRate = attendance.total
      ? Math.round((attendance.present / attendance.total) * 100)
      : 0;
    const streak = streakResult.rows[0]?.currentCount || 0;
    const nextLevel = nextLevelResult.rows[0];

    return res.json({
      answer: `${student.first_name} tiene ${student.total_xp} XP, nivel ${student.current_level}, asistencia de ${attendanceRate}% y racha actual de ${streak} dias. ${nextLevel ? `Le faltan ${nextLevel.minXp - student.total_xp} XP para el nivel ${nextLevel.name}.` : 'Ya alcanzo el nivel maximo configurado.'}`,
      suggestions: [
        'Registrar asistencia en las proximas sesiones',
        'Revisar estudiantes con baja continuidad',
        'Crear retos cortos para ganar XP'
      ]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error consultando Atlas IA' });
  }
}
