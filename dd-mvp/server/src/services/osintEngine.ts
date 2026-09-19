import { newsSearchConnector } from "../connectors/newsSearch";
import { serperSearchConnector } from "../connectors/serperSearch";
import { ConnectorResult } from "../types";

/**
 * OsintEngine: gera combinações de busca para uma pessoa ou empresa e executa
 * o connector de notícias/busca disponível para cada combinação.
 * IMPORTANTE: resultados são apresentados como evidência para análise humana,
 * nunca como prova automática de irregularidade.
 */
export class OsintEngine {
  buildQueries(entityName: string, entityType: "person" | "company", context?: { companyName?: string; role?: string }): string[] {
    if (entityType === "person") {
      const companyContext = context?.companyName ? ` "${context.companyName}"` : "";
      return [
        `"${entityName}"${companyContext}`,
        `"${entityName}"${companyContext} investigação`,
        `"${entityName}"${companyContext} processo`,
        `"${entityName}"${companyContext} sanção`,
        `"${entityName}"${companyContext} contrato`,
        `"${entityName}"${companyContext} notícia`
      ];
    }
    return [
      `"${entityName}" processo`,
      `"${entityName}" reclamação`,
      `"${entityName}" fraude`,
      `"${entityName}" investigação`
    ];
  }

  async run(entityName: string, entityType: "person" | "company", context?: { companyName?: string; role?: string }): Promise<{ query: string; result: ConnectorResult }[]> {
    const queries = this.buildQueries(entityName, entityType, context);
    const searchConnector = serperSearchConnector.isConfigured() ? serperSearchConnector : newsSearchConnector;
    const results: { query: string; result: ConnectorResult }[] = [];
    for (const q of queries) {
      const result = await searchConnector.searchPerson!(q);
      results.push({ query: q, result });
    }
    return results;
  }

  buildProfileQueries(entityName: string, context?: { companyName?: string }): string[] {
    const companyContext = context?.companyName ? ` "${context.companyName}"` : "";
    return [
      `"${entityName}"${companyContext} LinkedIn`,
      `"${entityName}"${companyContext} Instagram`,
      `"${entityName}"${companyContext} perfil oficial`
    ];
  }

  async runProfiles(entityName: string, context?: { companyName?: string }): Promise<{ query: string; result: ConnectorResult }[]> {
    const searchConnector = serperSearchConnector.isConfigured() ? serperSearchConnector : newsSearchConnector;
    const results: { query: string; result: ConnectorResult }[] = [];
    for (const query of this.buildProfileQueries(entityName, context)) {
      results.push({ query, result: await searchConnector.searchPerson!(query) });
    }
    return results;
  }
}

export const osintEngine = new OsintEngine();
