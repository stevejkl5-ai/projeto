import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { InvestigationReport, MediaCoverageAnalysis, PublicPersonProfileAnalysis } from "../types";
import EvidenceCard from "../components/EvidenceCard";
import StatusBadge from "../components/StatusBadge";
import InvestigationChat from "../components/InvestigationChat";

type Tab =
  | "overview"
  | "company"
  | "people"
  | "relationships"
  | "profiles"
  | "news"
  | "profile"
  | "evidences"
  | "sources"
  | "timeline"
  | "apis"
  | "report";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "company", label: "Empresa" },
  { id: "people", label: "Sócios" },
  { id: "relationships", label: "Relacionamentos" },
  { id: "profiles", label: "Perfis de pessoas" },
  { id: "news", label: "Notícias e OSINT" },
  { id: "profile", label: "Perfil público" },
  { id: "evidences", label: "Evidências" },
  { id: "sources", label: "Fontes" },
  { id: "timeline", label: "Timeline" },
  { id: "apis", label: "APIs utilizadas" },
  { id: "report", label: "Relatório" }
];

function operationalStatus(
  company: InvestigationReport["company"],
  factors: InvestigationReport["riskFactors"],
  targetType?: string
) {
  if (!company) {
    return {
      label: targetType === "person" ? "BUSCA INFORMATIVA" : "DADOS INSUFICIENTES",
      tone: "text-muted border-border bg-panel2"
    };
  }
  const active = ["ativa", "ativo"].includes((company.situacao_cadastral || "").toLowerCase());
  const criticalRisk = factors.some(
    (factor) => factor.category === "negative" && !factor.label.toLowerCase().includes("notícia")
  );
  if (!active || criticalRisk) return { label: "REVISÃO NECESSÁRIA", tone: "text-red-300 border-red-400/30 bg-red-400/10" };
  return { label: "APARENTA OPERACIONAL", tone: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10" };
}

export default function Investigation() {
  const { id } = useParams();
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [mediaAnalysis, setMediaAnalysis] = useState<MediaCoverageAnalysis | null>(null);
  const [mediaAnalysisLoading, setMediaAnalysisLoading] = useState(false);
  const [mediaAnalysisError, setMediaAnalysisError] = useState<string | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicPersonProfileAnalysis | null>(null);
  const [publicProfileLoading, setPublicProfileLoading] = useState(false);
  const [publicProfileError, setPublicProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setMediaAnalysis(null);
    setMediaAnalysisError(null);
    setPublicProfile(null);
    setPublicProfileError(null);
    api
      .getInvestigation(id)
      .then(setReport)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!report) return <p className="text-muted">Carregando investigação...</p>;

  const { investigation, company, people, relationships, personProfiles, evidences, sources, riskFactors, timeline, apiUsage } =
    report;
  const isPersonInvestigation = investigation.target_type === "person";
  const status = operationalStatus(company, riskFactors, investigation.target_type);
  const criticalRisks = riskFactors.filter(
    (factor) => factor.category === "negative" && !factor.label.toLowerCase().includes("notícia")
  );
  const news = evidences.filter((e) =>
    e.evidence_type === "mencao_noticia" ||
    ["noticia_investigacao_pessoa", "noticia_investigacao_empresa", "post_rede_social", "mencao_blog"].includes(e.evidence_type)
  );
  const availableSources = sources.filter((source) => source.status === "available").length;
  const confidence = !company ? "Baixa" : availableSources >= 2 ? "Alta" : "Média";
  const visibleTabs = TABS
    .filter((item) => !isPersonInvestigation || !["company", "relationships"].includes(item.id))
    .map((item) => item.id === "people" && isPersonInvestigation ? { ...item, label: "Pessoa" } : item);
  const newsEvidenceById = new Map(news.map((item) => [item.id, item]));
  const profileEvidence = news.filter((item) =>
    !item.is_mock &&
    !!item.source_url &&
    (isPersonInvestigation
      ? item.entity_type === "person" && item.entity === investigation.target_name
      : item.entity_type === "company" && item.entity === company?.razao_social)
  );
  const profileEvidenceById = new Map(profileEvidence.map((item) => [item.id, item]));
  const criticalLeftCoverage = mediaAnalysis?.findings.filter(
    (finding) => finding.coverageTone === "critical" && finding.politicalFrame === "left"
  ).length ?? 0;
  const criticalRightCoverage = mediaAnalysis?.findings.filter(
    (finding) => finding.coverageTone === "critical" && finding.politicalFrame === "right"
  ).length ?? 0;

  async function runMediaAnalysis() {
    if (!id || mediaAnalysisLoading) return;
    setMediaAnalysisLoading(true);
    setMediaAnalysisError(null);
    try {
      setMediaAnalysis(await api.analyzeMediaCoverage(id));
    } catch (analysisError: any) {
      setMediaAnalysisError(analysisError?.message || "Não foi possível analisar a cobertura.");
    } finally {
      setMediaAnalysisLoading(false);
    }
  }

  async function runPublicProfileAnalysis() {
    if (!id || publicProfileLoading) return;
    setPublicProfileLoading(true);
    setPublicProfileError(null);
    try {
      setPublicProfile(await api.analyzePublicProfile(id));
    } catch (analysisError: any) {
      setPublicProfileError(analysisError?.message || "Não foi possível montar o perfil público.");
    } finally {
      setPublicProfileLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {company?.razao_social || investigation.target_name || investigation.cnpj}
          </h1>
          <p className="text-muted text-sm">
            {investigation.target_type === "person"
              ? "Módulo CPF · pesquisa por nome em fontes públicas"
              : `Módulo CNPJ · ${investigation.cnpj}`}
          </p>
        </div>
        <StatusBadge status={investigation.status} />
      </div>

      {investigation.status === "error" && (
        <div className="bg-red-400/10 border border-red-400/30 text-red-300 rounded-lg p-4 mb-6 text-sm">
          {investigation.target_type === "person"
            ? "Não foi possível concluir a busca nas fontes públicas. Verifique a disponibilidade dos provedores e tente novamente."
            : "Não foi possível obter dados cadastrais deste CNPJ nas fontes disponíveis (BrasilAPI / ReceitaWS). Isso pode ocorrer por indisponibilidade temporária das APIs, CNPJ inexistente ou bloqueio de rede."}
        </div>
      )}

      <div className="flex gap-2 border-b border-border mb-6 overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition ${
              tab === t.id ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="bg-panel border border-border rounded-xl p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted mb-2">Decisão operacional</p>
                <p className={`inline-flex px-3 py-1 rounded-full border text-sm font-medium ${status.tone}`}>{status.label}</p>
                <p className="text-sm text-muted mt-3">
                  {investigation.target_type === "person"
                    ? "Busca informativa baseada em publicações públicas; não confirma identidade, acusações ou regularidade da pessoa."
                    : "Baseada na situação cadastral, sanções e ocorrências oficiais encontradas nas fontes consultadas."}
                </p>
              </div>
              <div className="text-left md:text-right text-sm">
                <p className="text-muted">Confiança da avaliação</p>
                <p className="font-medium">{confidence}</p>
                <p className="text-xs text-muted mt-1">
                  {availableSources} fonte(s) {isPersonInvestigation ? "consultada(s)" : "oficial(is) disponível(is)"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <div className="bg-panel border border-border rounded-xl p-5 h-full">
                <p className="text-xs uppercase tracking-wide text-muted mb-3">Sinais de atenção</p>
                <p className="text-3xl font-semibold">{criticalRisks.length + news.filter((e) => e.evidence_type !== "mencao_noticia").length}</p>
                <p className="text-sm text-muted mt-2">Fatos oficiais e alertas jornalísticos que merecem revisão.</p>
                <button onClick={() => setTab("news")} className="text-accent text-sm mt-5 hover:underline">
                Ver notícias e OSINT
                </button>
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SummarySignal label="Riscos críticos" value={criticalRisks.length} tone={criticalRisks.length ? "text-red-300" : "text-emerald-300"} />
              <SummarySignal label="Publicações OSINT" value={news.length} tone={news.length ? "text-amber-300" : "text-emerald-300"} />
              <SummarySignal
                label={isPersonInvestigation ? "Pessoa pesquisada" : "Sócios avaliados"}
                value={people.filter((person) => person.investigated).length}
                tone="text-text"
              />
              <SummarySignal label="Fontes consultadas" value={sources.length} tone="text-text" />
            </div>
          </div>

          <div className="text-xs text-muted border-t border-border pt-4">
            A decisão é um resumo heurístico, não uma certificação de solvência, idoneidade ou ausência de risco.
          </div>
        </div>
      )}

      {tab === "company" && company && (
        <div className="bg-panel border border-border rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field label="Razão social" value={company.razao_social} />
          <Field label="Nome fantasia" value={company.nome_fantasia} />
          <Field label="Situação cadastral" value={company.situacao_cadastral} />
          <Field label="Data de abertura" value={company.data_abertura} />
          <Field label="CNAE" value={company.cnae} />
          <Field label="Endereço" value={company.endereco} />
          <Field label="Município/UF" value={`${company.municipio}/${company.estado}`} />
          <Field label="Capital social" value={company.capital_social} />
          <Field label="Natureza jurídica" value={company.natureza_juridica} />
          <Field label="Porte" value={company.porte} />
          <Field label="Fonte" value={company.source_name} />
          <Field label="Consultado em" value={new Date(company.consulted_at).toLocaleString("pt-BR")} />
        </div>
      )}
      {tab === "company" && !company && <p className="text-muted">Nenhum dado cadastral disponível.</p>}

      {tab === "people" && (
        <div className="space-y-3">
          {people.length === 0 && <p className="text-muted">Nenhum sócio encontrado nas fontes consultadas.</p>}
          {people.map((p) => {
            const personEvidence = evidences.filter((e) => e.entity_type === "person" && e.entity === p.name);
            const personRelationships = relationships.filter((r) => r.from_entity === p.name || r.to_entity === p.name);
            const personProfilesForPerson = personProfiles.filter((profile) => profile.person_name === p.name);
            const personSources = sources.filter(
              (s) => s.name.includes("pessoa") && personEvidence.some((e) => e.source_connector_id === s.connector_id)
            );

            return (
              <div key={p.id} className="bg-panel border border-border rounded-lg p-5 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium text-lg">{p.name}</p>
                    <p className="text-xs text-muted">{p.role || "Qualificação não informada"}</p>
                    <p className="text-xs text-accent mt-2">
                      {p.investigated ? "Perfil consultado nas fontes disponíveis" : "Perfil ainda não consultado"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs text-muted md:text-right">
                    <span>Empresas: {p.related_companies_count}</span>
                    <span>Documentos: {p.documents_count}</span>
                    <span>Ocorrências: {p.occurrences_count}</span>
                    <span>Evidências: {personEvidence.length}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted mb-2">Relações confirmadas</p>
                    {personRelationships.length === 0 ? (
                      <p className="text-muted text-xs">Nenhum vínculo adicional identificado.</p>
                    ) : (
                      <div className="space-y-1">
                        {personRelationships.map((r) => (
                          <p key={r.id} className="text-xs">
                            <span className="font-medium">{r.from_entity}</span>{" "}
                            <span className="text-accent">{r.relationship_type}</span>{" "}
                            <span className="font-medium">{r.to_entity}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted mb-2">Fontes do perfil</p>
                    {personSources.length === 0 ? (
                      <p className="text-muted text-xs">Nenhuma evidência oficial encontrada.</p>
                    ) : (
                      <div className="space-y-1">
                        {personSources.map((s) => (
                          <p key={s.id} className="text-xs flex items-center gap-2">
                            <span>{s.name}</span>
                            {!!s.is_mock && <span className="text-[10px] text-amber-400">MOCK</span>}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {personProfilesForPerson.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs uppercase tracking-wide text-muted mb-2">Perfis públicos candidatos</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {personProfilesForPerson.map((profile) => (
                        <a
                          key={profile.id}
                          href={profile.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-accent hover:underline"
                        >
                          {profile.platform} ↗
                        </a>
                      ))}
                    </div>
                    <p className="text-xs text-muted mt-2">Links localizados em busca pública; confirme que pertencem a esta pessoa.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "relationships" && (
        <div className="space-y-3">
          {relationships.length === 0 && <p className="text-muted">Nenhum relacionamento mapeado.</p>}
          {relationships.map((r) => (
            <div key={r.id} className="bg-panel border border-border rounded-lg p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{r.from_entity}</span>
                <span className="text-accent text-xs px-2 py-0.5 rounded bg-accentSoft/40">{r.relationship_type}</span>
                <span className="font-medium">{r.to_entity}</span>
              </div>
              <p className="text-xs text-muted mt-2">
                Confiança: {r.confidence}% · {r.source_evidence_id ? "evidência vinculada" : "relação cadastral"}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "profiles" && (
        <div className="space-y-4">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-semibold">Perfis encontrados</h2>
            <p className="text-sm text-muted mt-1">
              Perfis públicos encontrados para sócios executivos. São candidatos e não confirmam, sozinhos, a identidade da pessoa.
            </p>
          </div>
          {personProfiles.length === 0 && (
            <p className="text-muted">Nenhum perfil público foi encontrado nas fontes consultadas.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personProfiles.map((profile) => (
              <div key={profile.id} className="bg-panel border border-border rounded-lg p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{profile.person_name}</p>
                    <p className="text-sm text-accent mt-1">{profile.platform}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded border border-amber-400/30 text-amber-300 bg-amber-400/10">
                    POSSÍVEL
                  </span>
                </div>
                <a
                  href={profile.profile_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm text-accent hover:underline break-all mt-4"
                >
                  {profile.profile_url}
                </a>
                <p className="text-xs text-muted mt-3">
                  Confiança inicial: {profile.confidence}% · fonte: {profile.source_name}
                  {!!profile.is_mock && " · MOCK"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "news" && (
        <div className="space-y-4">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-semibold">Notícias e publicações OSINT</h2>
            <p className="text-sm text-muted mt-1">
              Notícias, resultados públicos de X e blogs relacionados ao nome pesquisado. Homônimos e associações precisam de confirmação manual.
            </p>
          </div>
          <section className="bg-panel border border-border rounded-xl p-5 space-y-4">
            <div>
              <h3 className="font-medium">Análise de enquadramento da cobertura</h3>
              <p className="text-xs text-muted mt-1">
                A IA avalia se cada publicação é crítica, favorável ou neutra e se há enquadramento político explícito no material.
                Não estima a ideologia ou filiação da pessoa.
              </p>
            </div>
            <button
              type="button"
              onClick={runMediaAnalysis}
              disabled={mediaAnalysisLoading || news.length === 0}
              className="bg-accent hover:bg-accent/90 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2"
            >
              {mediaAnalysisLoading ? "Analisando publicações..." : "Analisar cobertura com IA"}
            </button>
            {mediaAnalysisError && <p className="text-sm text-red-300">{mediaAnalysisError}</p>}
            {mediaAnalysis && (
              <div className="border-t border-border pt-4 space-y-4">
                <p className="text-sm">{mediaAnalysis.summary}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CoverageCount label="Publicações críticas com enquadramento explícito à esquerda" value={criticalLeftCoverage} />
                  <CoverageCount label="Publicações críticas com enquadramento explícito à direita" value={criticalRightCoverage} />
                </div>
                {mediaAnalysis.findings.length === 0 ? (
                  <p className="text-xs text-muted">A IA não retornou classificações verificáveis para as fontes disponíveis.</p>
                ) : (
                  <div className="space-y-2">
                    {mediaAnalysis.findings.map((finding) => {
                      const item = newsEvidenceById.get(finding.evidenceId);
                      if (!item) return null;
                      return (
                        <div key={finding.evidenceId} className="bg-panel2 rounded-lg p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-medium">{item.source_name}</span>
                            <span className="text-xs px-2 py-0.5 rounded border border-border text-muted">
                              {coverageToneLabel(finding.coverageTone)}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded border border-border text-muted">
                              {politicalFrameLabel(finding.politicalFrame)}
                            </span>
                            <span className="text-xs text-muted">Confiança {confidenceLabel(finding.confidence)}</span>
                          </div>
                          <p className="text-xs text-text/80">{finding.rationale}</p>
                          {item.source_url && (
                            <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-accent hover:underline mt-2">
                              Conferir publicação ↗
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {mediaAnalysis.limitations.length > 0 && (
                  <div className="text-xs text-muted">
                    <p className="font-medium mb-1">Limitações</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {mediaAnalysis.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-amber-300">
                  Análise exploratória de uma amostra de publicações públicas. Não representa a opinião política da pessoa nem deve orientar decisões sobre ela.
                </p>
              </div>
            )}
          </section>
          {news.length === 0 && <p className="text-muted">Nenhuma notícia ou publicação encontrada nas fontes consultadas.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {news.map((e) => <EvidenceCard key={e.id} evidence={e} />)}
          </div>
        </div>
      )}

      {tab === "profile" && (
        <div className="space-y-4">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-semibold">Perfil público: {investigation.target_name || company?.razao_social}</h2>
            <p className="text-sm text-muted mt-1">
              Síntese de fatos biográficos expressos e declarações explicitamente atribuídas em notícias e publicações desta investigação.
            </p>
          </div>
          <section className="bg-panel border border-border rounded-xl p-5 space-y-4">
            <p className="text-xs text-muted">
              A IA não estima crenças, ideologia ou características pessoais. Idade só aparece se estiver informada explicitamente na fonte; cada item deve ser conferido no material original.
            </p>
            <button
              type="button"
              onClick={runPublicProfileAnalysis}
              disabled={publicProfileLoading || profileEvidence.length === 0}
              className="bg-accent hover:bg-accent/90 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 py-2"
            >
              {publicProfileLoading ? "Montando perfil..." : "Analisar notícias com IA"}
            </button>
            {profileEvidence.length === 0 && (
              <p className="text-xs text-muted">
                Não há notícias ou publicações verificáveis sobre este alvo. A busca atual pode conter apenas trechos curtos; configure Serper e realize uma investigação com resultados públicos.
              </p>
            )}
            {publicProfileError && <p className="text-sm text-red-300">{publicProfileError}</p>}
            {publicProfile && (
              <div className="border-t border-border pt-4 space-y-5">
                <p className="text-sm">{publicProfile.summary}</p>
                <div>
                  <h3 className="text-sm font-medium mb-2">Informações biográficas documentadas</h3>
                  {publicProfile.biographicalFacts.length === 0 ? (
                    <p className="text-xs text-muted">Nenhuma informação biográfica explícita foi localizada nas evidências analisadas.</p>
                  ) : (
                    <div className="space-y-2">
                      {publicProfile.biographicalFacts.map((fact, index) => (
                        <div key={`${fact.evidenceId}-${index}`} className="bg-panel2 rounded-lg p-3 text-sm">
                          <p>{fact.claim}</p>
                          <ProfileEvidenceLink evidenceId={fact.evidenceId} evidence={profileEvidenceById.get(fact.evidenceId)} confidence={fact.confidence} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Declarações públicas atribuídas</h3>
                  {publicProfile.publicStatements.length === 0 ? (
                    <p className="text-xs text-muted">Nenhuma declaração explícita e atribuível foi localizada nas evidências analisadas.</p>
                  ) : (
                    <div className="space-y-2">
                      {publicProfile.publicStatements.map((statement, index) => (
                        <div key={`${statement.evidenceId}-${index}`} className="bg-panel2 rounded-lg p-3 text-sm">
                          <p className="text-xs text-accent mb-1">{statement.topic}</p>
                          <p>“{statement.statement}”</p>
                          <p className="text-xs text-muted mt-2">
                            Atribuição: {statement.attribution}
                            {statement.date ? ` · ${statement.date}` : ""}
                          </p>
                          <ProfileEvidenceLink evidenceId={statement.evidenceId} evidence={profileEvidenceById.get(statement.evidenceId)} confidence={statement.confidence} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {publicProfile.limitations.length > 0 && (
                  <div className="text-xs text-muted">
                    <p className="font-medium mb-1">Limitações</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {publicProfile.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-amber-300">
                  Perfil exploratório baseado nos trechos indexados disponíveis; não é biografia verificada. Confirme cada item nas fontes antes de utilizá-lo.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "evidences" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidences.length === 0 && <p className="text-muted">Nenhuma evidência coletada.</p>}
          {evidences.map((e) => (
            <EvidenceCard key={e.id} evidence={e} />
          ))}
        </div>
      )}

      {tab === "sources" && (
        <div className="space-y-2">
          {sources.map((s) => (
            <div key={s.id} className="bg-panel border border-border rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm">{s.name}</span>
              <div className="flex items-center gap-2">
                {!!s.is_mock && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30">
                    MOCK
                  </span>
                )}
                <StatusBadge status={s.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "timeline" && (
        <div className="space-y-4 border-l border-border pl-4">
          {timeline.length === 0 && <p className="text-muted">Nenhum evento registrado.</p>}
          {timeline.map((t) => (
            <div key={t.id} className="relative">
              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-accent" />
              <p className="text-xs text-muted">{new Date(t.date).toLocaleDateString("pt-BR")}</p>
              <p className="font-medium text-sm">{t.title}</p>
              <p className="text-sm text-muted">{t.description}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "apis" && (
        <div className="space-y-2">
          {apiUsage.map((u: any, i: number) => (
            <div key={i} className="bg-panel border border-border rounded-lg p-3 flex items-center justify-between text-sm">
              <span>{u.connector_id}</span>
              <span className="text-muted">
                {u.total} consulta(s) · tempo médio {Math.round(u.avg_ms || 0)}ms
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "report" && (
        <div className="bg-panel border border-border rounded-xl p-6">
          <p className="text-sm text-muted mb-4">
            O relatório completo (JSON estruturado) pode ser obtido via API:
          </p>
          <code className="block bg-panel2 rounded p-3 text-xs text-accent break-all">
            GET /api/investigations/{investigation.id}/report
          </code>
          <p className="text-xs text-muted mt-4">
            Este JSON reúne empresa, sócios, relacionamentos, evidências, fontes, fatores de atenção, timeline e
            limitações — pronto para exportação ou geração de PDF em uma etapa futura.
          </p>
        </div>
      )}
      <InvestigationChat investigationId={investigation.id} />
    </div>
  );
}

function SummarySignal({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-panel border border-border rounded-xl p-5">
      <p className={`text-3xl font-semibold ${tone}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className="text-text/90">{value || "—"}</p>
    </div>
  );
}

function coverageToneLabel(tone: MediaCoverageAnalysis["findings"][number]["coverageTone"]): string {
  const labels = {
    critical: "Tom crítico",
    supportive: "Tom favorável",
    neutral: "Tom neutro",
    unclear: "Tom indeterminado"
  };
  return labels[tone];
}

function politicalFrameLabel(frame: MediaCoverageAnalysis["findings"][number]["politicalFrame"]): string {
  const labels = {
    left: "Enquadramento explícito: esquerda",
    right: "Enquadramento explícito: direita",
    center: "Enquadramento explícito: centro",
    mixed: "Enquadramento misto",
    not_identified: "Enquadramento não identificado"
  };
  return labels[frame];
}

function confidenceLabel(confidence: MediaCoverageAnalysis["findings"][number]["confidence"]): string {
  const labels = { low: "baixa", medium: "média", high: "alta" };
  return labels[confidence];
}

function CoverageCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-panel2 border border-border rounded-lg p-3">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function ProfileEvidenceLink({
  evidenceId,
  evidence,
  confidence
}: {
  evidenceId: string;
  evidence: InvestigationReport["evidences"][number] | undefined;
  confidence: "low" | "medium" | "high";
}) {
  const confidenceText = { low: "baixa", medium: "média", high: "alta" }[confidence];
  if (!evidence) return <p className="text-xs text-muted mt-2">Evidência de origem não disponível: {evidenceId}</p>;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
      <span className="text-muted">Fonte: {evidence.source_name} · confiança da extração {confidenceText}</span>
      {evidence.source_url && (
        <a href={evidence.source_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          Conferir fonte ↗
        </a>
      )}
    </div>
  );
}
