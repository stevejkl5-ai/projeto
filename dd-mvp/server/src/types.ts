export type ConnectorStatus = "available" | "needs_api_key" | "commercial" | "mock" | "error";

export interface ConnectorResult {
  connectorId: string;
  status: ConnectorStatus;
  data: any;
  raw?: any;
  sourceUrl?: string;
  isMock: boolean;
  responseTimeMs: number;
  error?: string;
}

export interface Connector {
  id: string;
  name: string;
  description: string;
  category: "empresa" | "governo" | "reputacao" | "comercial";
  requiresApiKey: boolean;
  isPaid: boolean;
  docsUrl: string;
  isConfigured(): boolean;
  searchCompany?(cnpj: string): Promise<ConnectorResult>;
  searchPerson?(name: string, cnpj?: string): Promise<ConnectorResult>;
}

export interface Evidence {
  id: string;
  investigationId: string;
  entity: string; // nome da empresa ou pessoa
  entityType: "company" | "person";
  sourceConnectorId: string;
  sourceName: string;
  sourceUrl: string | null;
  evidenceType: string;
  description: string;
  date: string;
  isMock: boolean;
}

export interface RiskFactor {
  label: string;
  weight: number; // positivo ou negativo
  category: "negative" | "positive";
  evidenceIds: string[];
}

export interface RiskScoreResult {
  score: number;
  band: string;
  bandDescription: string;
  factors: RiskFactor[];
}
