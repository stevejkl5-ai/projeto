// Pesos do Índice de Risco. Ajustáveis sem tocar no motor de cálculo (riskScore.ts).
// IMPORTANTE: este score é heurístico e explicável, NÃO uma probabilidade estatística
// calibrada. Ver services/riskScore.ts para a lógica de aplicação.

export const RISK_WEIGHTS = {
  negative: {
    sancao_administrativa: -20, // CEIS/CNEP com registro ativo
    ocorrencia_judicial: -15, // TCU/processos relevantes
    reclamacoes_recorrentes: -10, // múltiplas reclamações (Reclame Aqui, quando disponível)
    inconsistencia_cadastral: -10, // situação cadastral irregular/baixada/suspensa
    ocorrencia_socios: -15, // sanções/ocorrências envolvendo sócios
    sancao_pessoa: -20, // sanção oficial encontrada para pessoa, com correspondência contextual
    ocorrencia_oficial_pessoa: -15, // ocorrência oficial verificável envolvendo pessoa
    noticia_investigacao_pessoa: -8, // notícias recentes contextualizadas; nunca uma menção isolada
    informacoes_contraditorias: -10 // divergência entre fontes (ex.: BrasilAPI x ReceitaWS)
  },
  positive: {
    situacao_regular: 5,
    dados_societarios_verificaveis: 5,
    historico_consistente: 5,
    confirmado_multiplas_fontes: 5
  }
} as const;

export const RISK_BANDS = [
  { min: 80, max: 100, label: "Baixo", description: "Baixo número de sinais de risco encontrados nas fontes consultadas." },
  { min: 60, max: 79, label: "Atenção", description: "Atenção: alguns sinais que merecem revisão manual." },
  { min: 40, max: 59, label: "Elevado", description: "Múltiplos sinais de risco encontrados nas fontes consultadas." },
  { min: 0, max: 39, label: "Crítico", description: "Muitos sinais de risco encontrados nas fontes consultadas." }
];

export function bandFor(score: number) {
  return RISK_BANDS.find((b) => score >= b.min && score <= b.max) || RISK_BANDS[RISK_BANDS.length - 1];
}
