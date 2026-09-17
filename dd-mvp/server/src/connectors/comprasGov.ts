import { Connector, ConnectorResult } from "../types";
import { timedFetch, cleanCnpj, errorResult } from "./base";

// Documentação: https://compras.dados.gov.br/docs/home.html
// API pública de Dados Abertos do Governo Federal (licitações/fornecedores), sem necessidade de API key.
export const comprasGovConnector: Connector = {
  id: "compras_gov",
  name: "Compras.gov.br (Dados Abertos)",
  description: "Licitações e fornecedores do governo federal — API pública de dados abertos, sem key.",
  category: "governo",
  requiresApiKey: false,
  isPaid: false,
  docsUrl: "https://compras.dados.gov.br/docs/home.html",
  isConfigured: () => true,
  async searchCompany(cnpjRaw: string): Promise<ConnectorResult> {
    const cnpj = cleanCnpj(cnpjRaw);
    const url = `https://compras.dados.gov.br/fornecedores/v1/fornecedores.json?cnpj=${cnpj}`;
    const res = await timedFetch(this.id, url);
    if (!res.ok) {
      return errorResult(this.id, res.error || "Falha ao consultar Compras.gov.br", res.ms);
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
