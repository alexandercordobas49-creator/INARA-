import rateLimit from 'express-rate-limit';

function rateLimitResponse(req, res) {
  return res.status(429).json({
    message: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.'
  });
}

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitResponse
});

export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitResponse
});
