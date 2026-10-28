// Explicit nested route for the dashboard endpoints on Vercel.
// Reuse the Express app so authentication, access control, and PostgreSQL
// queries stay centralized in backend/src/routes/dashboardRoutes.js.
import app from '../../backend/src/app.js';

export default app;
