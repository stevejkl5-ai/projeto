import { Connector, ConnectorResult } from "../types";
import { timedFetch, cleanCnpj, errorResult } from "./base";

// Documentação: https://brasilapi.com.br/docs#tag/CNPJ
// Gratuita, pública, sem necessidade de API key.
export const brasilApiConnector: Connector = {
  id: "brasilapi",
  name: "BrasilAPI",
  description: "Dados cadastrais de CNPJ (Receita Federal) via BrasilAPI — gratuita e pública.",
  category: "empresa",
  requiresApiKey: false,
  isPaid: false,
  docsUrl: "https://brasilapi.com.br/docs#tag/CNPJ",
  isConfigured: () => true,
  async searchCompany(cnpjRaw: string): Promise<ConnectorResult> {
    const cnpj = cleanCnpj(cnpjRaw);
    const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;
    const res = await timedFetch(this.id, url);
    if (!res.ok) {
      return errorResult(this.id, res.error || "Falha ao consultar BrasilAPI", res.ms);
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
