import { ConnectorResult } from "../types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-20b";
const MAX_CONTEXT_CHARS = 120_000;

export interface ComplianceChatResponse {
  answer: string;
  facts: string[];
  inferences: string[];
  recommendations: string[];
  evidenceIds: string[];
  limitations: string[];
  needsHumanReview: boolean;
}

export function greetingResponse(question: string): ComplianceChatResponse | null {
  if (!/^(oi|olá|ola|hello|hi|bom dia|boa tarde|boa noite)[!.\s]*$/i.test(question.trim())) return null;
  return {
    answer: "Olá. Posso analisar a empresa, as pessoas, os relacionamentos e as evidências desta investigação.",
    facts: [],
    inferences: [],
    recommendations: [],
    evidenceIds: [],
    limitations: ["Esta resposta é apenas uma saudação; nenhuma análise foi executada."],
    needsHumanReview: false
  };
}

export function buildInvestigationContext(report: any): string {
  const context = {
    investigation: report.investigation,
    company: report.company,
    people: report.people,
    graph: {
      nodes: [
        report.company ? { id: report.company.id, type: "company", name: report.company.razao_social } : null,
        ...report.people.map((person: any) => ({ id: person.id, type: "person", name: person.name, role: person.role }))
      ].filter(Boolean),
      edges: report.relationships.map((relationship: any) => ({
        id: relationship.id,
        from: relationship.from_entity,
        to: relationship.to_entity,
        type: relationship.relationship_type,
        confidence: relationship.confidence,
        evidenceId: relationship.source_evidence_id
      }))
    },
    profiles: report.personProfiles.map((profile: any) => ({
      person: profile.person_name,
      platform: profile.platform,
      url: profile.profile_url,
      status: profile.status,
      confidence: profile.confidence,
      source: profile.source_name
    })),
    evidences: report.evidences.map((evidence: any) => ({
      id: evidence.id,
      entity: evidence.entity,
      type: evidence.evidence_type,
      description: evidence.description,
      source: evidence.source_name,
      url: evidence.source_url,
      date: evidence.date,
      isMock: !!evidence.is_mock
    })),
    sources: report.sources,
    riskFactors: report.riskFactors,
    timeline: report.timeline,
    limitations: report.limitations
  };

  const serialized = JSON.stringify(context);
  return serialized.length > MAX_CONTEXT_CHARS ? `${serialized.slice(0, MAX_CONTEXT_CHARS)}\n[CONTEXTO LIMITADO]` : serialized;
}

function normalizeResponse(value: any): ComplianceChatResponse {
  return {
    answer: typeof value?.answer === "string" ? value.answer : "Não foi possível estruturar uma resposta para esta pergunta.",
    facts: Array.isArray(value?.facts) ? value.facts.filter((item: unknown) => typeof item === "string") : [],
    inferences: Array.isArray(value?.inferences) ? value.inferences.filter((item: unknown) => typeof item === "string") : [],
    recommendations: Array.isArray(value?.recommendations) ? value.recommendations.filter((item: unknown) => typeof item === "string") : [],
    evidenceIds: Array.isArray(value?.evidenceIds) ? value.evidenceIds.filter((item: unknown) => typeof item === "string") : [],
    limitations: Array.isArray(value?.limitations) ? value.limitations.filter((item: unknown) => typeof item === "string") : [],
    needsHumanReview: value?.needsHumanReview !== false
  };
}

export async function askGroq(question: string, context: string): Promise<ComplianceChatResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Assistente de IA indisponível: GROQ_API_KEY não configurada no servidor.");

  const systemPrompt = `Você é um analista sênior de compliance apoiando uma investigação empresarial.
Use exclusivamente os dados do CONTEXTO DA INVESTIGAÇÃO abaixo. As melhores práticas de compliance são sua metodologia de análise, não fatos do caso.

Metodologia obrigatória:
- diferencie fatos documentados, inferências e recomendações;
- considere qualidade da fonte, corroboracao, temporalidade, materialidade, contexto e lacunas;
- trate homônimos e perfis nominais como hipóteses, não como identidade confirmada;
- nunca afirme fraude, crime, culpa ou irregularidade definitiva sem base explícita em fonte oficial;
- não transforme ausência de resultado em ausência de risco;
- marque dados MOCK como não confirmados;
- cite somente IDs de evidência existentes no contexto;
- recomende revisão humana para decisões de aprovação, bloqueio ou medidas contra pessoas/empresas;
- não revele seu raciocínio interno detalhado; forneça apenas uma justificativa objetiva e auditável.
- para saudações, responda brevemente e convide o usuário a perguntar sobre esta investigação;
- se a pergunta não puder ser respondida com este contexto, diga claramente que está fora do escopo ou que não há evidência suficiente; não pesquise nem complete com conhecimento externo.

Responda SOMENTE com JSON válido neste formato:
{"answer":"...","facts":["..."],"inferences":["..."],"recommendations":["..."],"evidenceIds":["id"],"limitations":["..."],"needsHumanReview":true}

CONTEXTO DA INVESTIGAÇÃO:
${context}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        temperature: 0.2,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ]
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Groq respondeu HTTP ${response.status}: ${errorBody.slice(0, 300)}`);
      if (response.status === 401 || response.status === 403) {
        throw new Error("A credencial da Groq foi recusada. Verifique GROQ_API_KEY no servidor.");
      }
      if (response.status === 404) {
        throw new Error("O modelo configurado não está disponível na Groq. Verifique GROQ_MODEL.");
      }
      throw new Error("Não foi possível consultar o assistente de IA.");
    }
    const body = await response.json() as any;
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Resposta inválida do assistente de IA.");
    return normalizeResponse(JSON.parse(content));
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("A consulta ao assistente excedeu o tempo limite.");
    if (error instanceof SyntaxError) throw new Error("O assistente retornou uma resposta inválida.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function toChatError(error: unknown): ConnectorResult {
  return {
    connectorId: "groq_chat",
    status: "error",
    data: null,
    isMock: false,
    responseTimeMs: 0,
    error: error instanceof Error ? error.message : "Falha no assistente de IA."
  };
}