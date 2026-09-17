import { Router } from "express";
import { db } from "../db";
import { runInvestigation } from "../services/investigationService";
import { buildInvestigationReport } from "../services/reportService";
import { validateCnpjBody } from "../middleware/validation";

const router = Router();

// POST /api/investigations  { cnpj }
router.post("/", validateCnpjBody, async (req, res) => {
  try {
    const { cnpj } = req.body;
    const investigationId = await runInvestigation(cnpj);
    const investigation = db.prepare(`SELECT * FROM investigations WHERE id = ?`).get(investigationId);
    res.status(201).json(investigation);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao executar investigação." });
  }
});

// GET /api/investigations (lista recentes)
router.get("/", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM investigations ORDER BY created_at DESC LIMIT 50`).all();
  res.json(rows);
});

// GET /api/investigations/:id (visão geral completa)
router.get("/:id", (req, res) => {
  const report = buildInvestigationReport(req.params.id);
  if (!report) return res.status(404).json({ error: "Investigação não encontrada." });
  res.json(report);
});

// GET /api/investigations/:id/report (alias explícito para geração de relatório)
router.get("/:id/report", (req, res) => {
  const report = buildInvestigationReport(req.params.id);
  if (!report) return res.status(404).json({ error: "Investigação não encontrada." });
  res.json(report);
});

export default router;
