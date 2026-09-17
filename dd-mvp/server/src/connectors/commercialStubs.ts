import { Connector, ConnectorResult } from "../types";
import { commercialResult } from "./base";

// Estes connectors documentam a arquitetura para integrações comerciais futuras.
// NÃO são instanciados no registry ativo (registry.ts) até que exista contrato/API key.

export const serasaConnector: Connector = {
  id: "serasa",
  name: "Serasa Experian",
  description: "Score de crédito e histórico financeiro — requer contrato comercial.",
  category: "comercial",
  requiresApiKey: true,
  isPaid: true,
  docsUrl: "https://www.serasaexperian.com.br/",
  isConfigured: () => !!process.env.SERASA_API_KEY,
  async searchCompany(): Promise<ConnectorResult> {
    return commercialResult(this.id);
  }
};

export const bancoDoBrasilConnector: Connector = {
  id: "banco_do_brasil",
  name: "Banco do Brasil (API bancária)",
  description: "Dados bancários/financeiros — requer parceria bancária.",
  category: "comercial",
  requiresApiKey: true,
  isPaid: true,
  docsUrl: "https://developers.bb.com.br/",
  isConfigured: () => !!process.env.BANCO_DO_BRASIL_API_KEY,
  async searchCompany(): Promise<ConnectorResult> {
    return commercialResult(this.id);
  }
};

export const caixaConnector: Connector = {
  id: "caixa",
  name: "Caixa Econômica Federal",
  description: "Dados financeiros/FGTS — requer parceria institucional.",
  category: "comercial",
  requiresApiKey: true,
  isPaid: true,
  docsUrl: "https://www.caixa.gov.br/",
  isConfigured: () => !!process.env.CAIXA_API_KEY,
  async searchCompany(): Promise<ConnectorResult> {
    return commercialResult(this.id);
  }
};

export const commercialConnectors: Connector[] = [serasaConnector, bancoDoBrasilConnector, caixaConnector];
