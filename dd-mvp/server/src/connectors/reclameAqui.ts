import { Connector, ConnectorResult } from "../types";
import { mockResult } from "./base";

// O Reclame Aqui não oferece uma API pública/gratuita de consulta. O acesso a dados
// estruturados exige parceria comercial (Reclame Aqui PRO/Business). Scraping do site
// viola os Termos de Uso da plataforma, portanto NÃO foi implementado.
// Referência: https://www.reclameaqui.com.br/institucional/api/ (parceria comercial)
export const reclameAquiConnector: Connector = {
  id: "reclame_aqui",
  name: "Reclame Aqui",
  description: "Reputação de consumidores — requer parceria comercial (sem API pública gratuita).",
  category: "reputacao",
  requiresApiKey: false,
  isPaid: true,
  docsUrl: "https://www.reclameaqui.com.br/institucional/api/",
  isConfigured: () => false,
  async searchCompany(cnpj: string): Promise<ConnectorResult> {
    return mockResult(this.id, {
      note: "MOCK DATA — Reclame Aqui exige integração comercial (não implementada).",
      totalReclamacoes: 0,
      indiceResposta: null,
      notaConsumidor: null
    });
  }
};
