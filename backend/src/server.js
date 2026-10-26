import app from "./app.js";
import { connectDatabase, pool } from "./config/database.js";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 INARA Backend iniciado");
  console.log(`🌐 http://localhost:${PORT}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

void connectDatabase().catch(() => {
  console.error("HTTP server is running, but database readiness has failed.");
});

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  server.close(async () => {
    try {
      await pool.end();
    } catch (error) {
      console.error(
        `Error closing PostgreSQL pool${error.code ? ` (${error.code})` : ''}.`
      );
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);