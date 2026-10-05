import { FormEvent, useState } from "react";
import { api } from "../api";
import { ComplianceChatResponse } from "../types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  response?: ComplianceChatResponse;
}

export default function InvestigationChat({ investigationId }: { investigationId: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = question.trim();
    if (!value || loading) return;
    setQuestion("");
    setError(null);
    setMessages((current) => [...current, { role: "user", content: value }]);
    setLoading(true);
    try {
      const response = await api.askInvestigationAssistant(investigationId, value);
      setMessages((current) => [...current, { role: "assistant", content: response.answer, response }]);
    } catch (requestError: any) {
      setError(requestError?.message || "Não foi possível consultar o assistente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-20 flex flex-col items-end gap-3">
      {open && (
        <section className="w-[min(380px,calc(100vw-2rem))] bg-panel border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-medium text-sm">Copiloto de investigação</p>
              <p className="text-[11px] text-muted">Contexto baseado neste grafo e suas evidências</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-text text-lg" aria-label="Fechar chat">
              ×
            </button>
          </div>

          <div className="max-h-[min(52vh,440px)] min-h-24 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-muted leading-relaxed">
                Pergunte sobre riscos, lacunas, relações ou próximos passos. As respostas distinguem fatos de inferências e recomendações.
              </p>
            )}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
                <div className={`inline-block max-w-[92%] rounded-lg px-3 py-2 text-sm text-left ${message.role === "user" ? "bg-accent text-bg" : "bg-panel2 text-text"}`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.response && <AssistantDetails response={message.response} />}
                </div>
              </div>
            ))}
            {loading && <p className="text-xs text-muted">Analisando o grafo da investigação...</p>}
            {error && <p className="text-xs text-red-300">{error}</p>}
          </div>

          <form onSubmit={submit} className="border-t border-border p-3 flex gap-2">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={2000}
              placeholder="Faça uma pergunta..."
              className="min-w-0 flex-1 bg-panel2 border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !question.trim()} className="bg-accent text-bg rounded px-3 py-2 text-sm disabled:opacity-40">
              Enviar
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-full bg-accent text-bg px-4 py-3 shadow-lg font-medium text-sm hover:brightness-110"
        aria-label="Abrir copiloto de investigação"
      >
        {open ? "Fechar copiloto" : "Perguntar à IA"}
      </button>
    </div>
  );
}

function AssistantDetails({ response }: { response: ComplianceChatResponse }) {
  return (
    <div className="mt-3 border-t border-border/70 pt-2 space-y-2 text-xs">
      {response.facts.length > 0 && <DetailList label="Fatos" items={response.facts} />}
      {response.inferences.length > 0 && <DetailList label="Inferências" items={response.inferences} />}
      {response.recommendations.length > 0 && <DetailList label="Próximos passos" items={response.recommendations} />}
      {response.evidenceIds.length > 0 && <p className="text-accent break-all">Evidências: {response.evidenceIds.join(", ")}</p>}
      {response.limitations.length > 0 && <DetailList label="Limitações" items={response.limitations} />}
      {response.needsHumanReview && <p className="text-amber-300">Revisão humana necessária antes de uma decisão.</p>}
    </div>
  );
}

function DetailList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-muted font-medium mb-1">{label}</p>
      <ul className="list-disc pl-4 space-y-1">
        {items.map((item, index) => <li key={`${label}-${index}`}>{item}</li>)}
      </ul>
    </div>
  );
}