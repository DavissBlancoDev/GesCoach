import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { connectDB } from "./config/db";
import authRouter from "./routes/auth";
import cookieParser from "cookie-parser";
import teamsRouter from "./routes/teams";
import playersRouter from "./routes/players";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use("/api/teams/:teamId/players", playersRouter);

app.get("/api/health", (_req, res) => {
  const dbConectada = mongoose.connection.readyState === 1;

  res.status(dbConectada ? 200 : 503).json({
    status: dbConectada ? "ok" : "degradado",
    service: "gescoach-api",
    database: dbConectada ? "conectada" : "desconectada",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/teams", teamsRouter);

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