import { v4 as uuid } from "uuid";
import { db } from "../db";
import { connectors } from "../connectors/registry";
import { brasilApiConnector } from "../connectors/brasilapi";
import { receitaWsConnector } from "../connectors/receitaws";
import { transparenciaConnector } from "../connectors/transparencia";
import { comprasGovConnector } from "../connectors/comprasGov";
import { tcuConnector } from "../connectors/tcu";
import { reclameAquiConnector } from "../connectors/reclameAqui";
import { osintEngine } from "./osintEngine";
import { calculateRiskScore } from "./riskScore";
import { Evidence } from "../types";
import { cleanCnpj } from "../connectors/base";

function logApiRequest(investigationId: string, connectorId: string, status: string, ms: number, isMock: boolean) {
  db.prepare(
    `INSERT INTO api_requests (id, investigation_id, connector_id, timestamp, status, response_time_ms, estimated_cost, is_mock)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(uuid(), investigationId, connectorId, new Date().toISOString(), status, ms, isMock ? 1 : 0);
}

function addEvidence(ev: Omit<Evidence, "id">): Evidence {
  const id = uuid();
  db.prepare(
    `INSERT INTO evidences (id, investigation_id, entity, entity_type, source_connector_id, source_name, source_url, evidence_type, description, date, is_mock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, ev.investigationId, ev.entity, ev.entityType, ev.sourceConnectorId, ev.sourceName, ev.sourceUrl, ev.evidenceType, ev.description, ev.date, ev.isMock ? 1 : 0);
  return { id, ...ev };
}

function addSource(investigationId: string, connectorId: string, name: string, status: string, isMock: boolean) {
  db.prepare(
    `INSERT INTO sources (id, investigation_id, connector_id, name, status, is_mock) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(uuid(), investigationId, connectorId, name, status, isMock ? 1 : 0);
}

function addRelationship(
  investigationId: string,
  fromEntity: string,
  fromType: "person" | "company",
  toEntity: string,
  toType: "person" | "company",
  relType: string
) {
  db.prepare(
    `INSERT INTO relationships (id, investigation_id, from_entity, from_type, to_entity, to_type, relationship_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(uuid(), investigationId, fromEntity, fromType, toEntity, toType, relType);
}

function addTimelineEvent(investigationId: string, date: string, title: string, description: string) {
  db.prepare(
    `INSERT INTO timeline_events (id, investigation_id, date, title, description) VALUES (?, ?, ?, ?, ?)`
  ).run(uuid(), investigationId, date, title, description);
}

export async function runInvestigation(cnpjRaw: string): Promise<string> {
  const cnpj = cleanCnpj(cnpjRaw);
  const investigationId = uuid();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO investigations (id, cnpj, company_name, status, created_at, updated_at) VALUES (?, ?, NULL, 'running', ?, ?)`
  ).run(investigationId, cnpj, now, now);

  // 1. Dados cadastrais: BrasilAPI primeiro, ReceitaWS como fallback/confirmação
  const brasilApiRes = await brasilApiConnector.searchCompany!(cnpj);
  logApiRequest(investigationId, brasilApiConnector.id, brasilApiRes.status, brasilApiRes.responseTimeMs, brasilApiRes.isMock);
  addSource(investigationId, brasilApiConnector.id, brasilApiConnector.name, brasilApiRes.status, brasilApiRes.isMock);

  const receitaWsRes = await receitaWsConnector.searchCompany!(cnpj);
  logApiRequest(investigationId, receitaWsConnector.id, receitaWsRes.status, receitaWsRes.responseTimeMs, receitaWsRes.isMock);
  addSource(investigationId, receitaWsConnector.id, receitaWsConnector.name, receitaWsRes.status, receitaWsRes.isMock);

  let companyData: any = null;
  let primarySource = "";
  if (brasilApiRes.status === "available") {
    companyData = normalizeBrasilApi(brasilApiRes.data);
    primarySource = brasilApiConnector.name;
  } else if (receitaWsRes.status === "available") {
    companyData = normalizeReceitaWs(receitaWsRes.data);
    primarySource = receitaWsConnector.name;
  }

  const confirmedByMultipleSources = brasilApiRes.status === "available" && receitaWsRes.status === "available";

  if (!companyData) {
    db.prepare(`UPDATE investigations SET status = 'error', updated_at = ? WHERE id = ?`).run(new Date().toISOString(), investigationId);
    return investigationId;
  }

  db.prepare(`UPDATE investigations SET company_name = ? WHERE id = ?`).run(companyData.razaoSocial, investigationId);

  db.prepare(
    `INSERT INTO companies (id, investigation_id, cnpj, razao_social, nome_fantasia, situacao_cadastral, data_abertura, cnae, endereco, municipio, estado, capital_social, natureza_juridica, porte, source_connector_id, source_name, consulted_at, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uuid(),
    investigationId,
    cnpj,
    companyData.razaoSocial,
    companyData.nomeFantasia,
    companyData.situacaoCadastral,
    companyData.dataAbertura,
    companyData.cnae,
    companyData.endereco,
    companyData.municipio,
    companyData.estado,
    companyData.capitalSocial,
    companyData.naturezaJuridica,
    companyData.porte,
    brasilApiRes.status === "available" ? brasilApiConnector.id : receitaWsConnector.id,
    primarySource,
    now,
    JSON.stringify(brasilApiRes.status === "available" ? brasilApiRes.raw : receitaWsRes.raw)
  );

  addEvidence({
    investigationId,
    entity: companyData.razaoSocial,
    entityType: "company",
    sourceConnectorId: brasilApiRes.status === "available" ? brasilApiConnector.id : receitaWsConnector.id,
    sourceName: primarySource,
    sourceUrl: brasilApiRes.status === "available" ? brasilApiRes.sourceUrl! : receitaWsRes.sourceUrl!,
    evidenceType: "dado_cadastral",
    description: `Dados cadastrais consultados: situação "${companyData.situacaoCadastral}", CNAE ${companyData.cnae}.`,
    date: now,
    isMock: false
  });

  addTimelineEvent(investigationId, companyData.dataAbertura || now, "Abertura da empresa", `${companyData.razaoSocial} — data de abertura conforme fonte oficial.`);

  // 2. Quadro societário
  const socios: { nome: string; qualificacao: string }[] = companyData.qsa || [];
  for (const socio of socios) {
    db.prepare(
      `INSERT INTO people (id, investigation_id, name, role, investigated) VALUES (?, ?, ?, ?, 0)`
    ).run(uuid(), investigationId, socio.nome, socio.qualificacao);
    addRelationship(investigationId, socio.nome, "person", companyData.razaoSocial, "company", "PARTNER_OF");
  }

  // 3. Sanções administrativas (CEIS/CNEP/CEPIM) — Portal da Transparência
  const transparenciaRes = await transparenciaConnector.searchCompany!(cnpj);
  logApiRequest(investigationId, transparenciaConnector.id, transparenciaRes.status, transparenciaRes.responseTimeMs, transparenciaRes.isMock);
  addSource(investigationId, transparenciaConnector.id, transparenciaConnector.name, transparenciaRes.status, transparenciaRes.isMock);

  if (transparenciaRes.status === "available") {
    const data = transparenciaRes.data;
    const ceisCount = Array.isArray(data?.ceis) ? data.ceis.length : 0;
    const cnepCount = Array.isArray(data?.cnep) ? data.cnep.length : 0;
    if (ceisCount + cnepCount > 0) {
      addEvidence({
        investigationId,
        entity: companyData.razaoSocial,
        entityType: "company",
        sourceConnectorId: transparenciaConnector.id,
        sourceName: transparenciaConnector.name,
        sourceUrl: transparenciaRes.sourceUrl || null,
        evidenceType: "sancao_administrativa",
        description: `${ceisCount} registro(s) no CEIS e ${cnepCount} no CNEP encontrados para este CNPJ.`,
        date: now,
        isMock: false
      });
    }
  }

  // 4. Licitações / fornecedor do governo (Compras.gov.br)
  const comprasRes = await comprasGovConnector.searchCompany!(cnpj);
  logApiRequest(investigationId, comprasGovConnector.id, comprasRes.status, comprasRes.responseTimeMs, comprasRes.isMock);
  addSource(investigationId, comprasGovConnector.id, comprasGovConnector.name, comprasRes.status, comprasRes.isMock);

  if (comprasRes.status === "available") {
    const fornecedores = comprasRes.data?._embedded?.fornecedores || [];
    if (fornecedores.length > 0) {
      addEvidence({
        investigationId,
        entity: companyData.razaoSocial,
        entityType: "company",
        sourceConnectorId: comprasGovConnector.id,
        sourceName: comprasGovConnector.name,
        sourceUrl: comprasRes.sourceUrl || null,
        evidenceType: "contrato_publico",
        description: `Empresa aparece cadastrada como fornecedora em ${fornecedores.length} registro(s) de Compras.gov.br.`,
        date: now,
        isMock: false
      });
    }
  }

  // 5. TCU (mock documentado)
  const tcuRes = await tcuConnector.searchCompany!(cnpj);
  logApiRequest(investigationId, tcuConnector.id, tcuRes.status, tcuRes.responseTimeMs, tcuRes.isMock);
  addSource(investigationId, tcuConnector.id, tcuConnector.name, tcuRes.status, tcuRes.isMock);

  // 6. Reputação (Reclame Aqui / Glassdoor — mocks documentados)
  const reclameRes = await reclameAquiConnector.searchCompany!(cnpj);
  logApiRequest(investigationId, reclameAquiConnector.id, reclameRes.status, reclameRes.responseTimeMs, reclameRes.isMock);
  addSource(investigationId, reclameAquiConnector.id, reclameAquiConnector.name, reclameRes.status, reclameRes.isMock);

  // 7. OSINT sobre a empresa
  const osintCompanyResults = await osintEngine.run(companyData.razaoSocial, "company");
  for (const { query, result } of osintCompanyResults) {
    logApiRequest(investigationId, result.connectorId, result.status, result.responseTimeMs, result.isMock);
    const articles = result.data?.articles || [];
    if (articles.length > 0) {
      for (const a of articles.slice(0, 3)) {
        addEvidence({
          investigationId,
          entity: companyData.razaoSocial,
          entityType: "company",
          sourceConnectorId: result.connectorId,
          sourceName: "Busca de notícias",
          sourceUrl: a.url || null,
          evidenceType: "mencao_noticia",
          description: `Resultado para busca "${query}": ${a.title || "sem título"}.`,
          date: a.publishedAt || now,
          isMock: result.isMock
        });
      }
    }
  }
  addSource(investigationId, "news_search", "Busca de Notícias (OSINT empresa)", osintCompanyResults[0]?.result.status || "mock", osintCompanyResults[0]?.result.isMock ?? true);

  // 8. Investigar sócios: fontes oficiais de pessoa + OSINT contextual
  for (const socio of socios) {
    const transparenciaPersonRes = await transparenciaConnector.searchPerson!(socio.nome);
    logApiRequest(
      investigationId,
      transparenciaConnector.id,
      transparenciaPersonRes.status,
      transparenciaPersonRes.responseTimeMs,
      transparenciaPersonRes.isMock
    );
    addSource(investigationId, transparenciaConnector.id, `${transparenciaConnector.name} — pessoa`, transparenciaPersonRes.status, transparenciaPersonRes.isMock);

    let occurrencesFound = 0;
    if (transparenciaPersonRes.status === "available" && Array.isArray(transparenciaPersonRes.data)) {
      occurrencesFound = transparenciaPersonRes.data.length;
      for (const occurrence of transparenciaPersonRes.data.slice(0, 10)) {
        addEvidence({
          investigationId,
          entity: socio.nome,
          entityType: "person",
          sourceConnectorId: transparenciaConnector.id,
          sourceName: transparenciaConnector.name,
          sourceUrl: transparenciaPersonRes.sourceUrl || null,
          evidenceType: "sancao_pessoa",
          description: `Registro encontrado no CEIS para o nome consultado: ${occurrence?.tipoSancao || occurrence?.descricao || "detalhes disponíveis na fonte oficial"}.`,
          date: occurrence?.dataInicioSancao || now,
          isMock: false
        });
      }
    }

    const tcuPersonRes = await tcuConnector.searchPerson!(socio.nome);
    logApiRequest(investigationId, tcuConnector.id, tcuPersonRes.status, tcuPersonRes.responseTimeMs, tcuPersonRes.isMock);
    addSource(investigationId, tcuConnector.id, `${tcuConnector.name} — pessoa`, tcuPersonRes.status, tcuPersonRes.isMock);

    const personOsint = await osintEngine.run(socio.nome, "person", {
      companyName: companyData.razaoSocial,
      role: socio.qualificacao
    });
    let documentsFound = 0;
    const personArticleUrls = new Set<string>();
    for (const { query, result } of personOsint) {
      logApiRequest(investigationId, result.connectorId, result.status, result.responseTimeMs, result.isMock);
      const articles = result.data?.articles || [];
      documentsFound += articles.length;
      for (const a of articles.slice(0, 2)) {
        if (a.url && personArticleUrls.has(a.url)) continue;
        if (a.url) personArticleUrls.add(a.url);
        const publishedAt = a.publishedAt || now;
        const articleText = `${a.title || ""} ${a.description || ""} ${a.content || ""}`.toLowerCase();
        const investigationTerms = /investiga|inquérito|inquerito|denúncia|denuncia|acusad|sancion|corrup|fraude|operação|operacao|processo/.test(articleText);
        const contextualMatch = [socio.nome, companyData.razaoSocial, socio.qualificacao]
          .filter(Boolean)
          .some((term: string) => articleText.includes(term.toLowerCase()));
        const recentEnough = Date.now() - new Date(publishedAt).getTime() <= 365 * 24 * 60 * 60 * 1000;
        const evidenceType = investigationTerms && contextualMatch && recentEnough
          ? "noticia_investigacao_pessoa"
          : "mencao_noticia";
        addEvidence({
          investigationId,
          entity: socio.nome,
          entityType: "person",
          sourceConnectorId: result.connectorId,
          sourceName: "Busca de notícias",
          sourceUrl: a.url || null,
          evidenceType,
          description: `Resultado para busca "${query}": ${a.title || "sem título"}.`,
          date: publishedAt,
          isMock: result.isMock
        });
      }
    }
    db.prepare(
      `UPDATE people SET investigated = 1, documents_count = ?, related_companies_count = ?, institutions_count = 0, occurrences_count = ? WHERE investigation_id = ? AND name = ?`
    ).run(
      documentsFound,
      (db.prepare(
        `SELECT COUNT(*) as count FROM relationships WHERE investigation_id = ? AND from_entity = ? AND relationship_type = 'PARTNER_OF'`
      ).get(investigationId, socio.nome) as { count: number }).count,
      occurrencesFound,
      investigationId,
      socio.nome
    );
  }

  // 9. Calcular índice de risco
  const evidences = db
    .prepare(`SELECT * FROM evidences WHERE investigation_id = ?`)
    .all(investigationId) as any[];

  const mappedEvidences: Evidence[] = evidences.map((e) => ({
    id: e.id,
    investigationId: e.investigation_id,
    entity: e.entity,
    entityType: e.entity_type,
    sourceConnectorId: e.source_connector_id,
    sourceName: e.source_name,
    sourceUrl: e.source_url,
    evidenceType: e.evidence_type,
    description: e.description,
    date: e.date,
    isMock: !!e.is_mock
  }));

  const riskResult = calculateRiskScore(mappedEvidences, companyData.situacaoCadastral, confirmedByMultipleSources);

  for (const factor of riskResult.factors) {
    db.prepare(
      `INSERT INTO risk_factors (id, investigation_id, label, weight, category, evidence_ids) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(uuid(), investigationId, factor.label, factor.weight, factor.category, JSON.stringify(factor.evidenceIds));
  }

  db.prepare(
    `UPDATE investigations SET status = 'done', risk_score = ?, risk_band = ?, updated_at = ? WHERE id = ?`
  ).run(riskResult.score, riskResult.band, new Date().toISOString(), investigationId);

  return investigationId;
}

function normalizeBrasilApi(data: any) {
  return {
    razaoSocial: data.razao_social,
    nomeFantasia: data.nome_fantasia,
    situacaoCadastral: data.descricao_situacao_cadastral,
    dataAbertura: data.data_inicio_atividade,
    cnae: `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}`,
    endereco: `${data.logradouro || ""}, ${data.numero || ""}`.trim(),
    municipio: data.municipio,
    estado: data.uf,
    capitalSocial: data.capital_social,
    naturezaJuridica: data.natureza_juridica,
    porte: data.porte,
    qsa: (data.qsa || []).map((s: any) => ({ nome: s.nome_socio, qualificacao: s.qualificacao_socio }))
  };
}

function normalizeReceitaWs(data: any) {
  return {
    razaoSocial: data.nome,
    nomeFantasia: data.fantasia,
    situacaoCadastral: data.situacao,
    dataAbertura: data.abertura,
    cnae: data.atividade_principal?.[0]?.text,
    endereco: `${data.logradouro || ""}, ${data.numero || ""}`.trim(),
    municipio: data.municipio,
    estado: data.uf,
    capitalSocial: data.capital_social,
    naturezaJuridica: data.natureza_juridica,
    porte: data.porte,
    qsa: (data.qsa || []).map((s: any) => ({ nome: s.nome, qualificacao: s.qual }))
  };
}
