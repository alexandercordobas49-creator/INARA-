import bcrypt from 'bcryptjs';
import { pool } from '../src/config/database.js';

const START_DATE = '2026-06-20';
const END_DATE = new Date().toISOString().slice(0, 10);
const DEMO_PASSWORD = 'ValeriaPiloto2026!';
const DEMO_EMAIL = 'valeria@inara.demo';

const classmates = [
  ['Mateo', 'Ruiz'], ['Camila', 'López'], ['Daniel', 'Pérez'],
  ['Sofía', 'García'], ['Gabriel', 'Torres'], ['Lucía', 'Mendoza'],
  ['Samuel', 'Castillo'], ['Isabella', 'Ríos'], ['Diego', 'Vargas'],
  ['Andrea', 'Cruz'], ['Nicolás', 'Flores'], ['Mariana', 'Reyes']
];

const courseSpecs = [
  { name: 'Inglés Conversacional', days: [6, 2, 4] },
  { name: 'Tecnologías Digitales', days: [6, 2, 4] },
  { name: 'Matemáticas Aplicadas', days: [2, 4] },
  { name: 'Comunicación y Cultura', days: [4] }
];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function sessionDates(start, end, weekdays) {
  const result = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (cursor <= last) {
    if (weekdays.includes(cursor.getUTCDay())) result.push(isoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const instructorResult = await client.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, created_at)
       VALUES ('Marco', 'Solís', 'docente@inara.demo', $1, 'instructor', $2)
       ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
       RETURNING id`,
      [passwordHash, `${START_DATE}T12:00:00Z`]
    );
    const instructorId = instructorResult.rows[0].id;

    const valeriaResult = await client.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, created_at)
       VALUES ('Valeria', 'Mora', $1, $2, 'student', $3)
       ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name
       RETURNING id`,
      [DEMO_EMAIL, passwordHash, `${START_DATE}T12:00:00Z`]
    );
    const valeriaId = valeriaResult.rows[0].id;

    const studentIds = [valeriaId];
    for (let i = 0; i < classmates.length; i += 1) {
      const [firstName, lastName] = classmates[i];
      const result = await client.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, created_at)
         VALUES ($1, $2, $3, $4, 'student', $5)
         ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name
         RETURNING id`,
        [firstName, lastName, `alumno${String(i + 1).padStart(2, '0')}@inara.demo`, passwordHash, `${START_DATE}T12:00:00Z`]
      );
      studentIds.push(result.rows[0].id);
    }

    const courseIds = [];
    for (const spec of courseSpecs) {
      const result = await client.query(
        `INSERT INTO courses (name, instructor_id, status, created_at)
         VALUES ($1, $2, 'active', $3)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [spec.name, instructorId, `${START_DATE}T12:00:00Z`]
      );
      let courseId = result.rows[0]?.id;
      if (!courseId) {
        const existing = await client.query('SELECT id FROM courses WHERE name = $1 ORDER BY created_at LIMIT 1', [spec.name]);
        courseId = existing.rows[0].id;
      }
      courseIds.push({ id: courseId, ...spec });
    }

    for (const course of courseIds) {
      for (const studentId of studentIds) {
        await client.query(
          `INSERT INTO course_students (course_id, student_id, enrolled_at, status)
           VALUES ($1, $2, $3, 'active')
           ON CONFLICT (course_id, student_id) DO NOTHING`,
          [course.id, studentId, `${START_DATE}T12:00:00Z`]
        );
      }
    }

    let valeriaPresent = 0;
    let valeriaLate = 0;
    let valeriaAbsent = 0;
    let valeriaExcused = 0;
    const valeriaSessionResults = new Map();

    for (let courseIndex = 0; courseIndex < courseIds.length; courseIndex += 1) {
      const course = courseIds[courseIndex];
      const dates = sessionDates(START_DATE, END_DATE, course.days);
      for (const date of dates) {
        const dayIndex = Math.round((new Date(`${date}T12:00:00Z`).getTime() - new Date(`${START_DATE}T12:00:00Z`).getTime()) / 86400000);
        for (let studentIndex = 0; studentIndex < studentIds.length; studentIndex += 1) {
          const studentId = studentIds[studentIndex];
          let status = 'present';
          if (studentIndex === 0) {
            // Demo scenario: realistic attendance variation, with a consistent recent streak.
            const lastSixDates = dates.slice(-6);
            if (!lastSixDates.includes(date)) {
              const pattern = (dayIndex + courseIndex * 3) % 13;
              status = pattern === 0 ? 'absent' : pattern === 5 || pattern === 9 ? 'late' : 'present';
            }
            if (status === 'present') valeriaPresent += 1;
            else if (status === 'late') valeriaLate += 1;
            else if (status === 'absent') valeriaAbsent += 1;
            else valeriaExcused += 1;
            if (status === 'present' || status === 'late') valeriaSessionResults.set(date, status);
          } else {
            const pattern = (dayIndex + studentIndex * 7 + courseIndex * 3) % 17;
            status = pattern === 0 || pattern === 8 ? 'absent' : pattern === 4 || pattern === 12 ? 'late' : 'present';
          }
          await client.query(
            `INSERT INTO attendance_records (user_id, course_id, session_date, status, notes, recorded_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id, course_id, session_date) DO NOTHING`,
            [studentId, course.id, date, status, 'Escenario de prueba piloto INARA; dato simulado.', `${date}T15:00:00Z`]
          );
        }
      }
    }

    // Build a transparent, idempotent XP history for Valeria based on the seeded attendance rows.
    await client.query('DELETE FROM xp_events WHERE user_id = $1 AND description LIKE $2', [valeriaId, 'Piloto simulado:%']);
    const valeriaRows = await client.query(
      `SELECT status, session_date, course_id FROM attendance_records
       WHERE user_id = $1 AND notes LIKE $2 ORDER BY session_date, course_id`,
      [valeriaId, 'Escenario de prueba piloto INARA%']
    );
    let xpTotal = 0;
    for (const row of valeriaRows.rows) {
      const points = row.status === 'present' ? 50 : row.status === 'late' ? 25 : 0;
      if (!points) continue;
      xpTotal += points;
      await client.query(
        `INSERT INTO xp_events (user_id, points, source, description, created_at)
         VALUES ($1, $2, 'attendance', $3, $4)`,
        [valeriaId, points, `Piloto simulado: asistencia ${row.status === 'present' ? 'presente' : 'tarde'}`, `${row.session_date.toISOString().slice(0, 10)}T15:00:00Z`]
      );
    }
    await client.query('UPDATE users SET total_xp = $1, current_level = $2, updated_at = NOW() WHERE id = $3', [
      xpTotal,
      xpTotal >= 5000 ? 5 : xpTotal >= 2500 ? 4 : xpTotal >= 1200 ? 3 : xpTotal >= 500 ? 2 : 1,
      valeriaId
    ]);

    for (const course of courseIds) {
      const courseRows = await client.query(
        `SELECT session_date, status FROM attendance_records
         WHERE user_id = $1 AND course_id = $2 AND notes LIKE $3 ORDER BY session_date DESC`,
        [valeriaId, course.id, 'Escenario de prueba piloto INARA%']
      );
      let currentCount = 0;
      for (const row of courseRows.rows) {
        if (row.status !== 'present' && row.status !== 'late') break;
        currentCount += 1;
      }
      const bestCount = Math.max(currentCount, 6);
      await client.query(
        `INSERT INTO streaks (user_id, course_id, current_count, best_count, last_activity_date, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, course_id) DO UPDATE SET
           current_count = EXCLUDED.current_count,
           best_count = GREATEST(streaks.best_count, EXCLUDED.best_count),
           last_activity_date = EXCLUDED.last_activity_date,
           updated_at = NOW()`,
        [valeriaId, course.id, currentCount, bestCount, courseRows.rows[0]?.session_date ?? null]
      );
    }

    await client.query('COMMIT');
    console.log('Piloto INARA cargado con datos simulados desde 2026-06-20.');
    console.log(`Cuenta estudiante: ${DEMO_EMAIL}`);
    console.log(`Contraseña de demo: ${DEMO_PASSWORD}`);
    console.log(`Compañeros creados: ${classmates.length}; cursos: ${courseIds.length}.`);
    console.log('Importante: estos registros son simulados para la presentación, no datos reales de estudiantes.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('No se pudo cargar el piloto INARA:', error.message);
  process.exitCode = 1;
});
