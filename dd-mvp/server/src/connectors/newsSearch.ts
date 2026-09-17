import { Connector, ConnectorResult } from "../types";
import { timedFetch, mockResult, errorResult } from "./base";

// Documentação: https://newsapi.org/docs
// Gratuita para desenvolvimento com cadastro (rate limit baixo). Sem NEWS_API_KEY,
// o connector roda em modo MOCK e deixa isso explícito nos resultados.
export const newsSearchConnector: Connector = {
  id: "news_search",
  name: "Busca de Notícias (NewsAPI)",
  description: "Notícias públicas mencionando a empresa ou pessoa — gratuita com cadastro (API key).",
  category: "reputacao",
  requiresApiKey: true,
  isPaid: false,
  docsUrl: "https://newsapi.org/docs",
  isConfigured: () => !!process.env.NEWS_API_KEY,
  async searchCompany(_cnpj: string, query?: string): Promise<ConnectorResult> {
    return this.searchPerson!(query || "");
  },
  async searchPerson(query: string): Promise<ConnectorResult> {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      return mockResult(this.id, {
        note: "MOCK DATA — configure NEWS_API_KEY para resultados reais.",
        articles: []
      });
    }
    const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&from=${from}&language=pt&sortBy=relevancy&pageSize=20&apiKey=${apiKey}`;
    const res = await timedFetch(this.id, url);
    if (!res.ok) return errorResult(this.id, res.error || "Falha ao consultar NewsAPI", res.ms);
    return {
      connectorId: this.id,
      status: "available",
      data: res.json,
      raw: res.json,
      sourceUrl: url,
      isMock: false,
      responseTimeMs: res.ms
    };
  }
};
