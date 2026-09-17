import { Connector, ConnectorResult } from "../types";
import { timedFetch, cleanCnpj, errorResult } from "./base";

// Documentação: https://www.receitaws.com.br/api
// Gratuita para uso pessoal/baixo volume (rate limit ~3 req/min sem token).
export const receitaWsConnector: Connector = {
  id: "receitaws",
  name: "ReceitaWS",
  description: "Consulta pública de CNPJ (usada como fallback quando a BrasilAPI falha).",
  category: "empresa",
  requiresApiKey: false,
  isPaid: false,
  docsUrl: "https://www.receitaws.com.br/api",
  isConfigured: () => true,
  async searchCompany(cnpjRaw: string): Promise<ConnectorResult> {
    const cnpj = cleanCnpj(cnpjRaw);
    const url = `https://www.receitaws.com.br/v1/cnpj/${cnpj}`;
    const res = await timedFetch(this.id, url);
    if (!res.ok) {
      return errorResult(this.id, res.error || "Falha ao consultar ReceitaWS", res.ms);
    }
    if (res.json?.status === "ERROR") {
      return errorResult(this.id, res.json.message || "CNPJ não encontrado", res.ms);
    }
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
