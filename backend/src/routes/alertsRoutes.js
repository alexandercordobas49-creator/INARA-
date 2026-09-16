import { Router } from 'express';
import { runAlerts, listNotifications, markNotificationRead } from '../controllers/alertsController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/run', authenticateToken, authorizeRoles('admin'), runAlerts);
router.get('/notifications', authenticateToken, listNotifications);
router.patch('/notifications/:notificationId/read', authenticateToken, markNotificationRead);

export default router;
