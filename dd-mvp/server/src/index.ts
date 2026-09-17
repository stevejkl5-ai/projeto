import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import investigationsRouter from "./routes/investigations";
import apiHubRouter from "./routes/apiHub";
import { serperSearchConnector } from "./connectors/serperSearch";
import { transparenciaConnector } from "./connectors/transparencia";
import "./db"; // garante criação do schema no boot

const app = express();
const PORT = process.env.PORT || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN;

app.set("trust proxy", 1);
app.use(cors(clientOrigin ? { origin: clientOrigin } : undefined));
app.use(express.json({ limit: "1mb" }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em instantes." }
});
app.use("/api/", limiter);

app.get("/", (_req, res) => {
  res.json({
    name: "Due Diligence API",
    status: "ok",
    health: "/api/health",
    investigations: "/api/investigations"
  });
});

app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    integrations: {
      serper: serperSearchConnector.isConfigured(),
      transparencia: transparenciaConnector.isConfigured()
    }
  })
);

app.use("/api/investigations", investigationsRouter);
app.use("/api/api-hub", apiHubRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

app.listen(PORT, () => {
  console.log(`Servidor de Due Diligence rodando em http://localhost:${PORT}`);
});
