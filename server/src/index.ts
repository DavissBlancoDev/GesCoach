import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import mongoose from "mongoose";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const dbConectada = mongoose.connection.readyState === 1;

  res.status(dbConectada ? 200 : 503).json({
    status: dbConectada ? "ok" : "degradado",
    service: "gescoach-api",
    database: dbConectada ? "conectada" : "desconectada",
  });
});

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor escuchando en http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Error al conectar con MongoDB:", err.message);
    process.exit(1);
  });