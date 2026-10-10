import dotenv from "dotenv";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const PORT = Number(process.env.PORT || 4000);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT debe ser un número entre 1 y 65535');
}

async function startServer() {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 INARA Backend iniciado");
    console.log(`🌐 http://localhost:${PORT}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  });
}

startServer();