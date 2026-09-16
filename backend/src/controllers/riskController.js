import { pool } from '../config/database.js';
import {
  evaluateStudentRisk,
  getLatestRisk,
  getRecommendations,
  getRiskHistory,
  getInterventions,
  listLatestRisks,
  updateRecommendation
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
    const student = await pool.query(
      'SELECT id FROM users WHERE id=$1 AND role=\'student\'',
      [req.params.studentId]
    );
    if (!student.rowCount) return res.status(404).json({ message: 'Estudiante no encontrado.' });

    if (!(await canAccessStudent(req.user, req.params.studentId))) {
      return res.status(403).json({ message: 'No autorizado.' });
    }

    const [risk, history, recommendations, interventions] = await Promise.all([
      getLatestRisk(req.params.studentId),
      getRiskHistory(req.params.studentId),
      getRecommendations(req.params.studentId),
      getInterventions(req.params.studentId)
    ]);
    return res.json({ risk, history, recommendations, interventions });
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

    const {
      studentId,
      riskId = null,
      recommendationId = null,
      actionType,
      notes = '',
      status = 'COMPLETED',
      followUpDate = null
    } = req.body;
    const allowedActions = ['CONTACT', 'MEETING', 'ACADEMIC_SUPPORT', 'MOTIVATION', 'PARENT_CONTACT', 'FOLLOW_UP', 'OTHER'];
    const allowedStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    if (!studentId || !allowedActions.includes(actionType) || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'studentId y actionType válido son obligatorios.' });
    }
    if (!(await canAccessStudent(req.user, studentId))) {
      return res.status(403).json({ message: 'El estudiante no pertenece a tu alcance autorizado.' });
    }

    if (riskId) {
      const riskCheck = await pool.query(
        'SELECT 1 FROM student_risk WHERE id=$1 AND student_id=$2',
        [riskId, studentId]
      );
      if (!riskCheck.rowCount) return res.status(400).json({ message: 'El riesgo no pertenece al estudiante.' });
    }
    if (recommendationId) {
      const recommendationCheck = await pool.query(
        'SELECT 1 FROM recommendations WHERE recommendation_id=$1 AND student_id=$2',
        [recommendationId, studentId]
      );
      if (!recommendationCheck.rowCount) return res.status(400).json({ message: 'La recomendación no pertenece al estudiante.' });
    }

    const result = await pool.query(`
      INSERT INTO interventions
        (student_id, created_by, risk_id, recommendation_id, action_type, notes, status, follow_up_date, completed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $7='COMPLETED' THEN NOW() ELSE NULL END)
      RETURNING id, student_id AS "studentId", created_by AS "createdBy", risk_id AS "riskId",
        recommendation_id AS "recommendationId", action_type AS "actionType", notes, status,
        follow_up_date AS "followUpDate", completed_at AS "completedAt", created_at AS "createdAt"
    `, [studentId, req.user.id, riskId, recommendationId, actionType, notes.trim() || null, status, followUpDate]);

    if (recommendationId) {
      await pool.query(
        'UPDATE recommendations SET is_applied=TRUE WHERE recommendation_id=$1 AND student_id=$2',
        [recommendationId, studentId]
      );
    }
    if (riskId && ['IN_PROGRESS', 'COMPLETED'].includes(status)) {
      await pool.query(
        'UPDATE student_risk SET status=$1, updated_at=NOW() WHERE id=$2 AND student_id=$3',
        [status === 'COMPLETED' ? 'resolved' : 'in_progress', riskId, studentId]
      );
    }

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
        i.recommendation_id AS "recommendationId", i.action_type AS "actionType", i.notes, i.status,
        i.follow_up_date AS "followUpDate", i.completed_at AS "completedAt", i.created_at AS "createdAt",
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

export async function updateIntervention(req, res) {
  try {
    if (!['admin', 'instructor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Solo docentes y administradores pueden actualizar seguimiento.' });
    }
    const { status, followUpDate = null, notes = null } = req.body;
    if (!['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ message: 'Estado de intervención inválido.' });
    }
    const result = await pool.query(`
      UPDATE interventions i
      SET status=$1, follow_up_date=$2, notes=COALESCE($3, i.notes),
          completed_at=CASE WHEN $1='COMPLETED' THEN COALESCE(i.completed_at, NOW()) ELSE NULL END
      FROM users student
      WHERE i.id=$4 AND student.id=i.student_id AND student.role='student'
        AND ($5='admin' OR EXISTS (
          SELECT 1 FROM course_students cs
          JOIN courses c ON c.id=cs.course_id
          WHERE cs.student_id=i.student_id AND c.instructor_id=$6 AND cs.enrollment_status='active'
        ))
      RETURNING i.id, i.student_id AS "studentId", i.status, i.follow_up_date AS "followUpDate",
        i.notes, i.completed_at AS "completedAt", i.created_at AS "createdAt"
    `, [status, followUpDate, notes, req.params.interventionId, req.user.role, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Intervención no encontrada o no autorizada.' });
    if (status === 'COMPLETED') {
      await pool.query(`
        UPDATE recommendations r
        SET is_applied=TRUE
        FROM interventions i
        WHERE i.id=$1 AND r.recommendation_id=i.recommendation_id
      `, [req.params.interventionId]);
      await pool.query(`
        UPDATE student_risk sr
        SET status='resolved', updated_at=NOW()
        FROM interventions i
        WHERE i.id=$1 AND sr.id=i.risk_id
      `, [req.params.interventionId]);
    }
    return res.json({ intervention: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error actualizando intervención.' });
  }
}

export async function updateStudentRecommendation(req, res) {
  try {
    const recommendation = await getRecommendations(req.params.studentId);
    const target = recommendation.find((item) => item.id === req.params.recommendationId);
    if (!target || !(await canAccessStudent(req.user, req.params.studentId))) {
      return res.status(403).json({ message: 'No autorizado.' });
    }
    const updated = await updateRecommendation(req.params.recommendationId, {
      isRead: typeof req.body.isRead === 'boolean' ? req.body.isRead : null,
      isApplied: typeof req.body.isApplied === 'boolean' ? req.body.isApplied : null
    });
    return res.json({ recommendation: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error actualizando recomendación.' });
  }
}
