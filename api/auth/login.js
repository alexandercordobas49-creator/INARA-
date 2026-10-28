import app from '../../backend/src/app.js';

// Explicit Vercel route for the production login endpoint.
// Express handles POST /api/auth/login and keeps the existing auth middleware.
export default app;
