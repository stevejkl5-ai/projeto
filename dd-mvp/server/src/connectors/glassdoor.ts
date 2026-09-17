import { Connector, ConnectorResult } from "../types";
import { mockResult } from "./base";

// Glassdoor não possui API pública/gratuita para consulta de avaliações por empresa.
// O acesso oficial é via Glassdoor for Employers (comercial). Não implementado.
export const glassdoorConnector: Connector = {
  id: "glassdoor",
  name: "Glassdoor",
  description: "Avaliações de funcionários — requer integração comercial (sem API pública gratuita).",
  category: "reputacao",
  requiresApiKey: false,
  isPaid: true,
  docsUrl: "https://www.glassdoor.com/employers/",
  isConfigured: () => false,
  async searchCompany(cnpj: string): Promise<ConnectorResult> {
    return mockResult(this.id, {
      note: "MOCK DATA — Glassdoor exige integração comercial (não implementada).",
      totalAvaliacoes: 0,
      notaMedia: null
    });
  }
};
