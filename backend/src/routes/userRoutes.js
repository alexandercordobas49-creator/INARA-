import { Router } from 'express';
import { listRoles, listUsers, listAccessibleStudents, updateRole, createParentRelation, deleteParentRelation } from '../controllers/userController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticateToken, authorizeRoles('admin'), listUsers);
router.get('/accessible-students', authenticateToken, listAccessibleStudents);
router.get('/roles', authenticateToken, authorizeRoles('admin'), listRoles);
router.patch('/:id/role', authenticateToken, authorizeRoles('admin'), updateRole);
router.post('/parents/relations', authenticateToken, authorizeRoles('admin'), createParentRelation);
router.delete('/parents/relations/:id', authenticateToken, authorizeRoles('admin'), deleteParentRelation);

export default router;
