import { db } from "../db";

export function buildInvestigationReport(investigationId: string) {
  const investigation = db.prepare(`SELECT * FROM investigations WHERE id = ?`).get(investigationId) as any;
  if (!investigation) return null;

  const company = db.prepare(`SELECT * FROM companies WHERE investigation_id = ?`).get(investigationId) as any;
  const people = db.prepare(`SELECT * FROM people WHERE investigation_id = ?`).all(investigationId);
  const relationships = db.prepare(`SELECT * FROM relationships WHERE investigation_id = ?`).all(investigationId);
  const evidences = db.prepare(`SELECT * FROM evidences WHERE investigation_id = ?`).all(investigationId);
  const sources = db.prepare(`SELECT * FROM sources WHERE investigation_id = ?`).all(investigationId);
  const riskFactors = db.prepare(`SELECT * FROM risk_factors WHERE investigation_id = ?`).all(investigationId);
  const timeline = db.prepare(`SELECT * FROM timeline_events WHERE investigation_id = ? ORDER BY date ASC`).all(investigationId);
  const apiUsage = db
    .prepare(`SELECT connector_id, COUNT(*) as total, AVG(response_time_ms) as avg_ms, SUM(estimated_cost) as cost
               FROM api_requests WHERE investigation_id = ? GROUP BY connector_id`)
    .all(investigationId);

  const limitations: string[] = [];
  const mockSources = (sources as any[]).filter((s) => s.is_mock);
  if (mockSources.length > 0) {
    limitations.push(
      `As seguintes fontes retornaram dados simulados (MOCK) nesta investigação: ${mockSources
        .map((s) => s.name)
        .join(", ")}. Nenhuma conclusão deve ser tirada exclusivamente desses dados.`
    );
  }
  limitations.push("A ausência de resultados em uma fonte não significa ausência de ocorrências — apenas que nada foi encontrado nas fontes consultadas nesta investigação.");
  limitations.push("Notícias de pessoas foram avaliadas nos últimos 12 meses e só recebem peso quando há termos de investigação, contexto da empresa/cargo e mais de uma evidência; menções nominais isoladas permanecem como alerta informativo.");
  limitations.push("Correspondência por nome, empresa e cargo pode conter homônimos. Confirme a identidade antes de qualquer decisão ou medida.");
  limitations.push("O Índice de Risco é heurístico e explicável, não uma probabilidade estatística validada.");

  return {
    investigation,
    company,
    people,
    relationships,
    evidences,
    sources,
    riskFactors,
    timeline,
    apiUsage,
    limitations,
    generatedAt: new Date().toISOString()
  };
}
