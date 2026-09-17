import { Connector } from "../types";
import { brasilApiConnector } from "./brasilapi";
import { receitaWsConnector } from "./receitaws";
import { transparenciaConnector } from "./transparencia";
import { comprasGovConnector } from "./comprasGov";
import { tcuConnector } from "./tcu";
import { reclameAquiConnector } from "./reclameAqui";
import { glassdoorConnector } from "./glassdoor";
import { newsSearchConnector } from "./newsSearch";
import { serperSearchConnector } from "./serperSearch";

export const connectors: Connector[] = [
  brasilApiConnector,
  receitaWsConnector,
  transparenciaConnector,
  comprasGovConnector,
  tcuConnector,
  reclameAquiConnector,
  glassdoorConnector,
  newsSearchConnector,
  serperSearchConnector
];

// Reservado para integrações comerciais futuras (Serasa, Banco do Brasil, Caixa).
// Estrutura de connector pronta em connectors/commercialStubs.ts — não instanciadas
// no registry ativo pois exigem contrato comercial.

export function getConnector(id: string): Connector | undefined {
  return connectors.find((c) => c.id === id);
}

export function getConnectorsByCategory(category: Connector["category"]): Connector[] {
  return connectors.filter((c) => c.category === category);
}
