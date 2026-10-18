import dotenv from "dotenv";
import app from "./app.js";
import { connectDatabase, pool } from "./config/database.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectDatabase();

  const httpServer = app.listen(PORT, () => {
    console.log(`🚀 INARA Backend iniciado en el puerto ${PORT}`);
  });

  const shutdown = async () => {
    httpServer.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("❌ No se pudo iniciar INARA:", error.message);
  process.exitCode = 1;
});
