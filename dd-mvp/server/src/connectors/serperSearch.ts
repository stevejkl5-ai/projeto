import { Connector, ConnectorResult } from "../types";
import { timedFetch, mockResult, errorResult } from "./base";

function normalizePublishedAt(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return new Date().toISOString();
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  const relative = value.toLowerCase().match(/(\d+)\s+(minuto|minute|hora|hour|dia|day|semana|week|m[eê]s|month)/);
  if (!relative) return new Date().toISOString();
  const amount = Number(relative[1]);
  const unit = relative[2];
  const days = unit.startsWith("min") || unit.startsWith("hora") || unit.startsWith("hour")
    ? 0
    : unit.startsWith("sem") || unit.startsWith("week")
      ? amount * 7
      : unit.startsWith("mês") || unit.startsWith("mes") || unit.startsWith("month")
        ? amount * 30
        : amount;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// Documentação: https://serper.dev/
// A API retorna resultados de notícias em formato diferente; o conector normaliza
// para o contrato interno usado pelo motor de investigação.
export const serperSearchConnector: Connector = {
  id: "serper_news",
  name: "Busca de Notícias (Serper)",
  description: "Notícias públicas recentes sobre empresas e pessoas via Google News.",
  category: "reputacao",
  requiresApiKey: true,
  isPaid: true,
  docsUrl: "https://serper.dev/",
  isConfigured: () => !!process.env.SERPER_API_KEY,
  async searchCompany(_cnpj: string, query?: string): Promise<ConnectorResult> {
    return this.searchPerson!(query || "");
  },
  async searchPerson(query: string): Promise<ConnectorResult> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      return mockResult(this.id, {
        note: "MOCK DATA — configure SERPER_API_KEY para resultados reais.",
        articles: []
      });
    }

    const url = "https://google.serper.dev/news";
    const res = await timedFetch(this.id, url, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: query, gl: "br", hl: "pt-br", num: 10 })
    });
    if (!res.ok) return errorResult(this.id, res.error || "Falha ao consultar Serper", res.ms);

    const articles = Array.isArray(res.json?.news)
      ? res.json.news.map((article: any) => ({
          title: article.title,
          description: article.snippet,
          content: article.snippet,
          url: article.link,
          publishedAt: normalizePublishedAt(article.date),
          source: { name: article.source }
        }))
      : [];

    return {
      connectorId: this.id,
      status: "available",
      data: { articles },
      raw: res.json,
      sourceUrl: url,
      isMock: false,
      responseTimeMs: res.ms
    };
  }
};
