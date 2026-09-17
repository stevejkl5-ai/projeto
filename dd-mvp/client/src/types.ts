export interface Investigation {
  id: string;
  cnpj: string;
  company_name: string | null;
  status: "pending" | "running" | "done" | "error";
  risk_score: number | null;
  risk_band: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  data_abertura: string;
  cnae: string;
  endereco: string;
  municipio: string;
  estado: string;
  capital_social: string;
  natureza_juridica: string;
  porte: string;
  source_name: string;
  consulted_at: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  related_companies_count: number;
  institutions_count: number;
  documents_count: number;
  occurrences_count: number;
  investigated: number;
}

export interface Relationship {
  id: string;
  from_entity: string;
  from_type: string;
  to_entity: string;
  to_type: string;
  relationship_type: string;
}

export interface Evidence {
  id: string;
  entity: string;
  entity_type: string;
  source_connector_id: string;
  source_name: string;
  source_url: string | null;
  evidence_type: string;
  description: string;
  date: string;
  is_mock: number;
}

export interface Source {
  id: string;
  connector_id: string;
  name: string;
  status: string;
  is_mock: number;
}

export interface RiskFactor {
  id: string;
  label: string;
  weight: number;
  category: "negative" | "positive";
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
}

export interface InvestigationReport {
  investigation: Investigation;
  company: Company | null;
  people: Person[];
  relationships: Relationship[];
  evidences: Evidence[];
  sources: Source[];
  riskFactors: RiskFactor[];
  timeline: TimelineEvent[];
  apiUsage: any[];
  limitations: string[];
  generatedAt: string;
}

export interface ApiHubEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  isPaid: boolean;
  requiresApiKey: boolean;
  docsUrl: string;
  status: "available" | "needs_api_key" | "commercial" | "mock" | "error";
  totalRequests: number;
  avgResponseTimeMs: number | null;
}
