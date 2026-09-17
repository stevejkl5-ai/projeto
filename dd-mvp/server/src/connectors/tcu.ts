import { Connector, ConnectorResult } from "../types";
import { mockResult } from "./base";

// O TCU disponibiliza um Portal de Dados Abertos (dados-abertos.tcu.gov.br), mas não há um
// endpoint REST único e estável para consulta direta por CNPJ que pudéssemos confirmar e
// documentar com segurança para este MVP. Fica registrado como MOCK até que a integração
// real seja validada manualmente (ex.: exportações CSV do portal ou parceria).
// Referência: https://dados-abertos.tcu.gov.br/
export const tcuConnector: Connector = {
  id: "tcu",
  name: "TCU (Tribunal de Contas da União)",
  description: "Acórdãos e apurações do TCU envolvendo a empresa/sócios — MOCK, aguardando validação de endpoint estável.",
  category: "governo",
  requiresApiKey: false,
  isPaid: false,
  docsUrl: "https://dados-abertos.tcu.gov.br/",
  isConfigured: () => true,
  async searchCompany(cnpj: string): Promise<ConnectorResult> {
    return mockResult(this.id, {
      note: "MOCK DATA — endpoint público estável do TCU não confirmado neste MVP.",
      acordaos: []
    });
  },
  async searchPerson(name: string): Promise<ConnectorResult> {
    return mockResult(this.id, {
      note: "MOCK DATA — endpoint público estável do TCU não confirmado neste MVP.",
      acordaos: []
    });
  }
};
