import { Connector, ConnectorResult } from "../types";
import { timedFetch, cleanCnpj, needsApiKeyResult, errorResult } from "./base";

// Documentação: https://api.portaldatransparencia.gov.br/swagger-ui.html
// Requer cadastro gratuito para obter uma chave (header "chave-api-dados").
// Endpoints usados:
//  - /api-de-dados/ceis (Cadastro de Empresas Inidôneas e Suspensas)
//  - /api-de-dados/cnep (Cadastro Nacional de Empresas Punidas)
//  - /api-de-dados/cepim (Cadastro de Entidades Privadas Sem Fins Lucrativos Impedidas)
export const transparenciaConnector: Connector = {
  id: "transparencia",
  name: "Portal da Transparência (CGU)",
  description: "Sanções administrativas: CEIS, CNEP e CEPIM — gratuito, requer API key via cadastro.",
  category: "governo",
  requiresApiKey: true,
  isPaid: false,
  docsUrl: "https://api.portaldatransparencia.gov.br/swagger-ui.html",
  isConfigured: () => !!process.env.PORTAL_TRANSPARENCIA_API_KEY,
  async searchCompany(cnpjRaw: string): Promise<ConnectorResult> {
    const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY;
    if (!apiKey) return needsApiKeyResult(this.id);

    const cnpj = cleanCnpj(cnpjRaw);
    const headers = { "chave-api-dados": apiKey };
    const endpoints = [
      { key: "ceis", url: `https://api.portaldatransparencia.gov.br/api-de-dados/ceis?cnpjSancionado=${cnpj}&pagina=1` },
      { key: "cnep", url: `https://api.portaldatransparencia.gov.br/api-de-dados/cnep?cnpjSancionado=${cnpj}&pagina=1` },
      { key: "cepim", url: `https://api.portaldatransparencia.gov.br/api-de-dados/cepim?cnpj=${cnpj}&pagina=1` }
    ];

    const results: Record<string, any> = {};
    let totalMs = 0;
    for (const ep of endpoints) {
      const res = await timedFetch(this.id, ep.url, { headers });
      totalMs += res.ms;
      results[ep.key] = res.ok ? res.json : { error: res.error };
    }

    return {
      connectorId: this.id,
      status: "available",
      data: results,
      raw: results,
      sourceUrl: "https://api.portaldatransparencia.gov.br/",
      isMock: false,
      responseTimeMs: totalMs
    };
  },
  async searchPerson(name: string): Promise<ConnectorResult> {
    const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY;
    if (!apiKey) return needsApiKeyResult(this.id);
    const headers = { "chave-api-dados": apiKey };
    const url = `https://api.portaldatransparencia.gov.br/api-de-dados/ceis?nomeSancionado=${encodeURIComponent(name)}&pagina=1`;
    const res = await timedFetch(this.id, url, { headers });
    if (!res.ok) return errorResult(this.id, res.error || "Falha na consulta", res.ms);
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
