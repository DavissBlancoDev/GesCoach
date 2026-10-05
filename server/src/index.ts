import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "gescoach-api" });
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});