import { Router } from "express";
import { db } from "../db";
import { connectors } from "../connectors/registry";
import { commercialConnectors } from "../connectors/commercialStubs";

const router = Router();

// GET /api/api-hub — status de todas as integrações
router.get("/", (_req, res) => {
  const usageStats = db
    .prepare(
      `SELECT connector_id, COUNT(*) as total, AVG(response_time_ms) as avg_ms
       FROM api_requests GROUP BY connector_id`
    )
    .all() as any[];

  const usageMap = new Map(usageStats.map((u) => [u.connector_id, u]));

  const list = [...connectors, ...commercialConnectors].map((c) => {
    const usage = usageMap.get(c.id);
    let status: string;
    if (c.category === "comercial") status = "commercial";
    else if (c.requiresApiKey && !c.isConfigured()) status = "needs_api_key";
    else status = "available";

    return {
      id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      isPaid: c.isPaid,
      requiresApiKey: c.requiresApiKey,
      docsUrl: c.docsUrl,
      status,
      totalRequests: usage?.total || 0,
      avgResponseTimeMs: usage?.avg_ms ? Math.round(usage.avg_ms) : null
    };
  });

  res.json(list);
});

// GET /api/api-hub/usage — histórico de uso por API
router.get("/usage", (_req, res) => {
  const usage = db
    .prepare(
      `SELECT connector_id, COUNT(*) as total, AVG(response_time_ms) as avg_ms, SUM(estimated_cost) as total_cost
       FROM api_requests GROUP BY connector_id ORDER BY total DESC`
    )
    .all();
  const recent = db.prepare(`SELECT * FROM api_requests ORDER BY timestamp DESC LIMIT 100`).all();
  res.json({ usage, recent });
});

export default router;
