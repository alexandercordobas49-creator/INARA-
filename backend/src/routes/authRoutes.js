import { Router } from 'express';
import { login, register, forgotPassword, resetPassword } from '../controllers/authController.js';
import { validateBody } from '../middleware/validationMiddleware.js';

const router = Router();

router.post('/login', validateBody(['email', 'password']), login);
router.post('/register', validateBody(['firstName', 'lastName', 'email', 'password']), register);
router.post('/forgot', validateBody(['email']), forgotPassword);
router.post('/reset', validateBody(['email', 'token', 'password']), resetPassword);

export default router;
