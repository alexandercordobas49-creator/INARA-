import { describe, it, expect, afterAll } from 'vitest';
import { pool } from '../src/config/database.js';
import { evaluateStudentRisk } from '../src/services/riskService.js';

const runDbTests = process.env.RUN_DB_TESTS === '1';

describe('Dropout prevention risk flow', () => {
  if (!runDbTests) {
    it('skipped - set RUN_DB_TESTS=1 to run DB tests', () => {
      expect(true).toBe(true);
    });
    return;
  }

  let studentId;
  let riskId;
  let interventionId;

  afterAll(async () => {
    if (interventionId) {
      await pool.query('DELETE FROM interventions WHERE id=$1', [interventionId]);
    }
    if (riskId) {
      await pool.query('DELETE FROM recommendations WHERE related_risk_id=$1', [riskId]);
      await pool.query('DELETE FROM student_risk WHERE id=$1', [riskId]);
    }
    await pool.end();
  });

  it('evaluates a real student and persists a linked recommendation', async () => {
    const student = await pool.query(`
      SELECT id FROM users WHERE role='student' ORDER BY created_at LIMIT 1
    `);
    expect(student.rowCount).toBeGreaterThan(0);
    studentId = student.rows[0].id;

    const evaluation = await evaluateStudentRisk(studentId);
    riskId = evaluation.risk.id;

    expect(['low', 'medium', 'high', 'critical']).toContain(evaluation.risk.level);
    expect(evaluation.risk.riskScore).toBeGreaterThanOrEqual(0);
    expect(evaluation.risk.riskScore).toBeLessThanOrEqual(100);
    expect(evaluation.recommendation.relatedRiskId).toBe(riskId);
    expect(evaluation.student.id).toBe(studentId);

    const instructor = await pool.query(`
      SELECT id FROM users WHERE role='instructor' ORDER BY created_at LIMIT 1
    `);
    if (instructor.rowCount) {
      const intervention = await pool.query(`
        INSERT INTO interventions (student_id, created_by, risk_id, action_type, notes)
        VALUES ($1,$2,$3,'CONTACT','Prueba de persistencia del seguimiento')
        RETURNING id
      `, [studentId, instructor.rows[0].id, riskId]);
      interventionId = intervention.rows[0].id;
      expect(interventionId).toBeTruthy();
    }
  });
});
