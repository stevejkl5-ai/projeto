import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, "duediligence.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS investigations (
  id TEXT PRIMARY KEY,
  cnpj TEXT NOT NULL,
  company_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | running | done | error
  risk_score INTEGER,
  risk_band TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  investigation_id TEXT NOT NULL,
  cnpj TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  situacao_cadastral TEXT,
  data_abertura TEXT,
  cnae TEXT,
  endereco TEXT,
  municipio TEXT,
  estado TEXT,
  capital_social TEXT,
  natureza_juridica TEXT,
  porte TEXT,
  source_connector_id TEXT,
  source_name TEXT,
  consulted_at TEXT,
  raw_json TEXT,
  FOREIGN KEY (investigation_id) REFERENCES investigations(id)
);

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  investigation_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  related_companies_count INTEGER DEFAULT 0,
  institutions_count INTEGER DEFAULT 0,
  documents_count INTEGER DEFAULT 0,
  occurrences_count INTEGER DEFAULT 0,
  investigated INTEGER DEFAULT 0,
  FOREIGN KEY (investigation_id) REFERENCES investigations(id)
);

CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  investigation_id TEXT NOT NULL,
  from_entity TEXT NOT NULL,
  from_type TEXT NOT NULL, -- person | company
  to_entity TEXT NOT NULL,
  to_type TEXT NOT NULL,
  relationship_type TEXT NOT NULL, -- PARTNER_OF, OWNS, DIRECTOR_OF, WORKS_AT, RELATED_TO, MENTIONED_IN, HAS_CONTRACT, HAS_PROCESS, HAS_DOCUMENT
  source_evidence_id TEXT,
  confidence INTEGER NOT NULL DEFAULT 100,
  FOREIGN KEY (investigation_id) REFERENCES investigations(id)
);

CREATE TABLE IF NOT EXISTS person_profiles (
  id TEXT PRIMARY KEY,
  investigation_id TEXT NOT NULL,
  person_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  status TEXT NOT NULL, -- possible | confirmed | rejected
  confidence INTEGER NOT NULL DEFAULT 0,
  source_connector_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  discovered_at TEXT NOT NULL,
  is_mock INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (investigation_id) REFERENCES investigations(id)
);

CREATE TABLE IF NOT EXISTS evidences (
  id TEXT PRIMARY KEY,
  investigation_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  source_connector_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  evidence_type TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  is_mock INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (investigation_id) REFERENCES investigations(id)
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  investigation_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  is_mock INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (investigation_id) REFERENCES investigations(id)
);

CREATE TABLE IF NOT EXISTS risk_factors (
  id TEXT PRIMARY KEY,
  investigation_id TEXT NOT NULL,
  label TEXT NOT NULL,
  weight INTEGER NOT NULL,
  category TEXT NOT NULL, -- negative | positive
  evidence_ids TEXT, -- JSON array
  FOREIGN KEY (investigation_id) REFERENCES investigations(id)
);

CREATE TABLE IF NOT EXISTS timeline_events (
  id TEXT PRIMARY KEY,
  investigation_id TEXT NOT NULL,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_evidence_id TEXT,
  FOREIGN KEY (investigation_id) REFERENCES investigations(id)
);

CREATE TABLE IF NOT EXISTS api_requests (
  id TEXT PRIMARY KEY,
  investigation_id TEXT,
  connector_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time_ms INTEGER,
  estimated_cost REAL DEFAULT 0,
  is_mock INTEGER NOT NULL DEFAULT 0
);
`);

// Evolucao de bancos criados antes das colunas de confianca e dos perfis.
const relationshipColumns = db.prepare(`PRAGMA table_info(relationships)`).all() as { name: string }[];
if (!relationshipColumns.some((column) => column.name === "confidence")) {
  db.exec(`ALTER TABLE relationships ADD COLUMN confidence INTEGER NOT NULL DEFAULT 100`);
}
