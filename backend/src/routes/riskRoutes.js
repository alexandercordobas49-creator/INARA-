import { Router } from 'express';
import {
  createIntervention,
  evaluateRisk,
  getStudentRisk,
  listInterventions,
  listRiskStudents,
  listStudentRecommendations,
  updateStudentRecommendation,
  updateIntervention
} from '../controllers/riskController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/students', listRiskStudents);
router.get('/:studentId', getStudentRisk);
router.post('/evaluate/:studentId', evaluateRisk);
router.get('/:studentId/recommendations', listStudentRecommendations);
router.patch('/:studentId/recommendations/:recommendationId', updateStudentRecommendation);
router.post('/interventions', createIntervention);
router.get('/:studentId/interventions', listInterventions);
router.patch('/interventions/:interventionId', updateIntervention);

export default router;
