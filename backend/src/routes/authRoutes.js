import { Router } from 'express';
import { login, logout, register, forgotPassword, resetPassword } from '../controllers/authController.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

router.post('/login', validateBody(['email', 'password']), asyncHandler(login));
router.post('/logout', authenticateToken, asyncHandler(logout));
router.post('/register', validateBody(['firstName', 'lastName', 'email', 'password']), asyncHandler(register));
router.post('/forgot', validateBody(['email']), asyncHandler(forgotPassword));
router.post('/reset', validateBody(['email', 'token', 'password']), asyncHandler(resetPassword));

export default router;
