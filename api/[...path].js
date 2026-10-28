import app from "../backend/src/app.js";

// Vercel invokes this function for /api/* requests. Express retains the
// existing /api/auth, /api/health, and other route definitions.
// Keep this handler as a serverless function; do not start app.listen here.
export default app;
