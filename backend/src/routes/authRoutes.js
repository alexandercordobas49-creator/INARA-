import { Router } from 'express';
import { login, register, forgotPassword, resetPassword } from '../controllers/authController.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { authRateLimit, passwordResetRateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', authRateLimit, validateBody(['email', 'password']), login);
router.post('/register', authRateLimit, validateBody(['firstName', 'lastName', 'email', 'password']), register);
router.post('/forgot', passwordResetRateLimit, validateBody(['email']), forgotPassword);
router.post('/reset', passwordResetRateLimit, validateBody(['email', 'token', 'password']), resetPassword);

export default router;
