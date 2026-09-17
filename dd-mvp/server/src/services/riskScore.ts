import { Evidence, RiskFactor, RiskScoreResult } from "../types";
import { RISK_WEIGHTS, bandFor } from "./riskWeights";

/**
 * Classifica fatores de atenção a partir das evidências coletadas.
 * O score interno serve apenas para ordenar a severidade dos fatores.
 * NUNCA trata ausência de evidências como prova de regularidade — apenas
 * não aplica penalidade quando não há evidência do tipo correspondente.
 */
export function calculateRiskScore(
  evidences: Evidence[],
  companySituacaoCadastral: string | null,
  confirmedByMultipleSources: boolean
): RiskScoreResult {
  let score = 100;
  const factors: RiskFactor[] = [];

  const bySourceType = (type: string) => evidences.filter((e) => e.evidenceType === type);

  const sancoes = bySourceType("sancao_administrativa");
  if (sancoes.length > 0) {
    const weight = RISK_WEIGHTS.negative.sancao_administrativa;
    score += weight;
    factors.push({
      label: `${sancoes.length} sanção(ões) administrativa(s) encontrada(s) (CEIS/CNEP)`,
      weight,
      category: "negative",
      evidenceIds: sancoes.map((e) => e.id)
    });
  }

  const judiciais = bySourceType("ocorrencia_judicial");
  if (judiciais.length > 0) {
    const weight = RISK_WEIGHTS.negative.ocorrencia_judicial;
    score += weight;
    factors.push({
      label: `${judiciais.length} ocorrência(s) judicial(is)/TCU relevante(s)`,
      weight,
      category: "negative",
      evidenceIds: judiciais.map((e) => e.id)
    });
  }

  const reclamacoes = bySourceType("reclamacao");
  if (reclamacoes.length >= 3) {
    const weight = RISK_WEIGHTS.negative.reclamacoes_recorrentes;
    score += weight;
    factors.push({
      label: `${reclamacoes.length} reclamações relacionadas encontradas`,
      weight,
      category: "negative",
      evidenceIds: reclamacoes.map((e) => e.id)
    });
  }

  const situacaoIrregular =
    companySituacaoCadastral &&
    !["ativa", "ativo"].includes(companySituacaoCadastral.toLowerCase());
  if (situacaoIrregular) {
    const weight = RISK_WEIGHTS.negative.inconsistencia_cadastral;
    score += weight;
    factors.push({
      label: `Situação cadastral não-ativa: "${companySituacaoCadastral}"`,
      weight,
      category: "negative",
      evidenceIds: []
    });
  } else if (companySituacaoCadastral) {
    const weight = RISK_WEIGHTS.positive.situacao_regular;
    score += weight;
    factors.push({
      label: "Situação cadastral regular (ativa)",
      weight,
      category: "positive",
      evidenceIds: []
    });
  }

  const ocorrenciasSocios = bySourceType("ocorrencia_socio");
  if (ocorrenciasSocios.length > 0) {
    const weight = RISK_WEIGHTS.negative.ocorrencia_socios;
    score += weight;
    factors.push({
      label: `${ocorrenciasSocios.length} ocorrência(s) relevante(s) envolvendo sócios`,
      weight,
      category: "negative",
      evidenceIds: ocorrenciasSocios.map((e) => e.id)
    });
  }

  const sancoesPessoa = bySourceType("sancao_pessoa");
  if (sancoesPessoa.length > 0) {
    const weight = RISK_WEIGHTS.negative.sancao_pessoa;
    score += weight;
    factors.push({
      label: `${sancoesPessoa.length} sanção(ões) oficial(is) associada(s) ao perfil da pessoa`,
      weight,
      category: "negative",
      evidenceIds: sancoesPessoa.map((e) => e.id)
    });
  }

  const ocorrenciasOficiaisPessoa = bySourceType("ocorrencia_oficial_pessoa");
  if (ocorrenciasOficiaisPessoa.length > 0) {
    const weight = RISK_WEIGHTS.negative.ocorrencia_oficial_pessoa;
    score += weight;
    factors.push({
      label: `${ocorrenciasOficiaisPessoa.length} ocorrência(s) oficial(is) envolvendo pessoa`,
      weight,
      category: "negative",
      evidenceIds: ocorrenciasOficiaisPessoa.map((e) => e.id)
    });
  }

  const noticiasInvestigacaoPessoa = bySourceType("noticia_investigacao_pessoa");
  if (noticiasInvestigacaoPessoa.length >= 2) {
    const weight = RISK_WEIGHTS.negative.noticia_investigacao_pessoa;
    score += weight;
    factors.push({
      label: `${noticiasInvestigacaoPessoa.length} notícia(s) recente(s) contextualizada(s) envolvendo pessoa; revisão manual recomendada`,
      weight,
      category: "negative",
      evidenceIds: noticiasInvestigacaoPessoa.map((e) => e.id)
    });
  }

  const noticiasInvestigacaoEmpresa = bySourceType("noticia_investigacao_empresa");
  if (noticiasInvestigacaoEmpresa.length >= 2) {
    const weight = RISK_WEIGHTS.negative.noticia_investigacao_empresa;
    score += weight;
    factors.push({
      label: `${noticiasInvestigacaoEmpresa.length} notícia(s) recente(s) relevante(s) sobre a empresa; revisão manual recomendada`,
      weight,
      category: "negative",
      evidenceIds: noticiasInvestigacaoEmpresa.map((e) => e.id)
    });
  }

  const cadastrais = bySourceType("dado_cadastral");
  if (cadastrais.length > 0) {
    const weight = RISK_WEIGHTS.positive.dados_societarios_verificaveis;
    score += weight;
    factors.push({
      label: "Dados societários verificáveis em fonte oficial",
      weight,
      category: "positive",
      evidenceIds: cadastrais.map((e) => e.id)
    });
  }

  if (confirmedByMultipleSources) {
    const weight = RISK_WEIGHTS.positive.confirmado_multiplas_fontes;
    score += weight;
    factors.push({
      label: "Dados cadastrais confirmados por múltiplas fontes",
      weight,
      category: "positive",
      evidenceIds: []
    });
  }

  score = Math.max(0, Math.min(100, score));
  const band = bandFor(score);

  return {
    score,
    band: band.label,
    bandDescription: band.description,
    factors
  };
}
