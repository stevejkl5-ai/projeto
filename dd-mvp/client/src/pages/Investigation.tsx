import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { InvestigationReport } from "../types";
import RiskScoreCard from "../components/RiskScoreCard";
import EvidenceCard from "../components/EvidenceCard";
import StatusBadge from "../components/StatusBadge";

type Tab =
  | "overview"
  | "company"
  | "people"
  | "relationships"
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
  { id: "evidences", label: "Evidências" },
  { id: "sources", label: "Fontes" },
  { id: "timeline", label: "Timeline" },
  { id: "apis", label: "APIs utilizadas" },
  { id: "report", label: "Relatório" }
];

function operationalStatus(company: InvestigationReport["company"], factors: InvestigationReport["riskFactors"]) {
  if (!company) return { label: "DADOS INSUFICIENTES", tone: "text-muted border-border bg-panel2" };
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

  useEffect(() => {
    if (!id) return;
    api
      .getInvestigation(id)
      .then(setReport)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!report) return <p className="text-muted">Carregando investigação...</p>;

  const { investigation, company, people, relationships, evidences, sources, riskFactors, timeline, apiUsage } =
    report;
  const status = operationalStatus(company, riskFactors);
  const criticalRisks = riskFactors.filter(
    (factor) => factor.category === "negative" && !factor.label.toLowerCase().includes("notícia")
  );
  const recentAlerts = evidences.filter((e) => e.evidence_type === "noticia_investigacao_pessoa");
  const availableSources = sources.filter((source) => source.status === "available").length;
  const confidence = !company ? "Baixa" : availableSources >= 2 ? "Alta" : "Média";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{company?.razao_social || investigation.cnpj}</h1>
          <p className="text-muted text-sm">{investigation.cnpj}</p>
        </div>
        <StatusBadge status={investigation.status} />
      </div>

      {investigation.status === "error" && (
        <div className="bg-red-400/10 border border-red-400/30 text-red-300 rounded-lg p-4 mb-6 text-sm">
          Não foi possível obter dados cadastrais deste CNPJ nas fontes disponíveis (BrasilAPI / ReceitaWS). Isso
          pode ocorrer por indisponibilidade temporária das APIs, CNPJ inexistente, ou bloqueio de rede no ambiente
          atual.
        </div>
      )}

      <div className="flex gap-2 border-b border-border mb-6 overflow-x-auto">
        {TABS.map((t) => (
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
                  Baseada na situação cadastral, sanções e ocorrências oficiais encontradas nas fontes consultadas.
                </p>
              </div>
              <div className="text-left md:text-right text-sm">
                <p className="text-muted">Confiança da avaliação</p>
                <p className="font-medium">{confidence}</p>
                <p className="text-xs text-muted mt-1">{availableSources} fonte(s) oficial(is) disponível(is)</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <RiskScoreCard score={investigation.risk_score} band={investigation.risk_band} factors={riskFactors} />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SummarySignal label="Riscos críticos" value={criticalRisks.length} tone={criticalRisks.length ? "text-red-300" : "text-emerald-300"} />
              <SummarySignal label="Alertas recentes" value={recentAlerts.length} tone={recentAlerts.length ? "text-amber-300" : "text-emerald-300"} />
              <SummarySignal label="Sócios avaliados" value={people.filter((person) => person.investigated).length} tone="text-text" />
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
              </div>
            );
          })}
        </div>
      )}

      {tab === "relationships" && (
        <div className="space-y-2">
          {relationships.length === 0 && <p className="text-muted">Nenhum relacionamento mapeado.</p>}
          {relationships.map((r) => (
            <div key={r.id} className="bg-panel border border-border rounded-lg p-3 text-sm flex items-center gap-2">
              <span className="font-medium">{r.from_entity}</span>
              <span className="text-accent text-xs px-2 py-0.5 rounded bg-accentSoft/40">{r.relationship_type}</span>
              <span className="font-medium">{r.to_entity}</span>
            </div>
          ))}
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
            Este JSON reúne empresa, sócios, relacionamentos, evidências, fontes, índice de risco, timeline e
            limitações — pronto para exportação ou geração de PDF em uma etapa futura.
          </p>
        </div>
      )}
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
