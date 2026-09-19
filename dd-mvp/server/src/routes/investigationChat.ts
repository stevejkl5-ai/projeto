import { Router } from "express";
import { buildInvestigationReport } from "../services/reportService";
import { askGroq, buildInvestigationContext, greetingResponse } from "../services/groqService";

const router = Router({ mergeParams: true });
const MAX_QUESTION_LENGTH = 2_000;

router.post("/", async (req, res) => {
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question) return res.status(400).json({ error: "Informe uma pergunta." });
  if (question.length > MAX_QUESTION_LENGTH) {
    return res.status(400).json({ error: `A pergunta deve ter no máximo ${MAX_QUESTION_LENGTH} caracteres.` });
  }

  const investigationId = (req.params as { id: string }).id;
  const report = buildInvestigationReport(investigationId);
  if (!report) return res.status(404).json({ error: "Investigação não encontrada." });

  try {
    const greeting = greetingResponse(question);
    if (greeting) return res.json(greeting);
    const response = await askGroq(question, buildInvestigationContext(report));
    const knownEvidenceIds = new Set(report.evidences.map((evidence: any) => evidence.id));
    response.evidenceIds = response.evidenceIds.filter((id) => knownEvidenceIds.has(id));
    res.json(response);
  } catch (error: any) {
    console.error("Falha no assistente de investigação:", error?.message || error);
    res.status(503).json({ error: error?.message || "Assistente de IA indisponível." });
  }
});

export default router;