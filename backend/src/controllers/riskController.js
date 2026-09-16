import { pool } from '../config/database.js';
import {
  evaluateStudentRisk,
  getLatestRisk,
  getRecommendations,
  listLatestRisks
} from '../services/riskService.js';

async function canAccessStudent(requester, studentId) {
  if (requester.role === 'admin' || requester.id === studentId) return true;
  if (requester.role === 'student') return false;

  if (requester.role === 'parent') {
    const relation = await pool.query(
      'SELECT 1 FROM parent_relations WHERE parent_id=$1 AND child_id=$2',
      [requester.id, studentId]
    );
    return relation.rowCount > 0;
  }

  if (requester.role === 'instructor') {
    const assignment = await pool.query(`
      SELECT 1
      FROM course_students cs
      JOIN courses c ON c.id = cs.course_id
      WHERE cs.student_id=$1
        AND c.instructor_id=$2
        AND cs.enrollment_status='active'
      LIMIT 1
    `, [studentId, requester.id]);
    return assignment.rowCount > 0;
  }

  return false;
}

export async function listRiskStudents(req, res) {
  try {
    if (!['admin', 'instructor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Solo docentes y administradores pueden consultar el seguimiento.' });
    }

    return res.json({ students: await listLatestRisks(req.user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo estudiantes en seguimiento.' });
  }
}

export async function getStudentRisk(req, res) {
  try {
    if (!(await canAccessStudent(req.user, req.params.studentId))) {
      return res.status(403).json({ message: 'No autorizado.' });
    }

    const risk = await getLatestRisk(req.params.studentId);
    return res.json({ risk });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo la evaluación de riesgo.' });
  }
}

export async function evaluateRisk(req, res) {
  try {
    if (!['admin', 'instructor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Solo docentes y administradores pueden evaluar riesgo.' });
    }
    if (!(await canAccessStudent(req.user, req.params.studentId))) {
      return res.status(403).json({ message: 'El estudiante no pertenece a tu alcance autorizado.' });
    }

    const evaluation = await evaluateStudentRisk(req.params.studentId);
    return res.status(201).json(evaluation);
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Error evaluando riesgo.' });
  }
}

export async function listStudentRecommendations(req, res) {
  try {
    if (!(await canAccessStudent(req.user, req.params.studentId))) {
      return res.status(403).json({ message: 'No autorizado.' });
    }

    return res.json({ recommendations: await getRecommendations(req.params.studentId) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo recomendaciones.' });
  }
}

export async function createIntervention(req, res) {
  try {
    if (!['admin', 'instructor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Solo docentes y administradores pueden registrar seguimiento.' });
    }

    const { studentId, riskId = null, actionType, notes = '' } = req.body;
    const allowedActions = ['contacted', 'meeting', 'academic_guidance', 'pending', 'other'];
    if (!studentId || !allowedActions.includes(actionType)) {
      return res.status(400).json({ message: 'studentId y actionType válido son obligatorios.' });
    }
    if (!(await canAccessStudent(req.user, studentId))) {
      return res.status(403).json({ message: 'El estudiante no pertenece a tu alcance autorizado.' });
    }

    const result = await pool.query(`
      INSERT INTO interventions (student_id, created_by, risk_id, action_type, notes)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, student_id AS "studentId", created_by AS "createdBy", risk_id AS "riskId",
        action_type AS "actionType", notes, created_at AS "createdAt"
    `, [studentId, req.user.id, riskId, actionType, notes.trim() || null]);

    return res.status(201).json({ intervention: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error registrando la intervención.' });
  }
}

export async function listInterventions(req, res) {
  try {
    if (!(await canAccessStudent(req.user, req.params.studentId))) {
      return res.status(403).json({ message: 'No autorizado.' });
    }

    const result = await pool.query(`
      SELECT i.id, i.student_id AS "studentId", i.created_by AS "createdBy", i.risk_id AS "riskId",
        i.action_type AS "actionType", i.notes, i.created_at AS "createdAt",
        u.first_name AS "createdByFirstName", u.last_name AS "createdByLastName"
      FROM interventions i
      JOIN users u ON u.id = i.created_by
      WHERE i.student_id=$1
      ORDER BY i.created_at DESC
    `, [req.params.studentId]);

    return res.json({ interventions: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error obteniendo intervenciones.' });
  }
}
