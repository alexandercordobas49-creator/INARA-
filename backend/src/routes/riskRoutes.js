import { Router } from 'express';
import {
  createIntervention,
  evaluateRisk,
  getStudentRisk,
  listInterventions,
  listRiskStudents,
  listStudentRecommendations
} from '../controllers/riskController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/students', listRiskStudents);
router.get('/:studentId', getStudentRisk);
router.post('/evaluate/:studentId', evaluateRisk);
router.get('/:studentId/recommendations', listStudentRecommendations);
router.post('/interventions', createIntervention);
router.get('/:studentId/interventions', listInterventions);

export default router;
