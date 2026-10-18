import { Router } from 'express';
import { login, register, forgotPassword, resetPassword } from '../controllers/authController.js';
import { validateBody } from '../middleware/validationMiddleware.js';

const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const router = Router();

router.post('/login', validateBody(['email', 'password']), asyncHandler(login));
router.post('/register', validateBody(['firstName', 'lastName', 'email', 'password']), asyncHandler(register));
router.post('/forgot', validateBody(['email']), asyncHandler(forgotPassword));
router.post('/reset', validateBody(['email', 'token', 'password']), asyncHandler(resetPassword));

export default router;
