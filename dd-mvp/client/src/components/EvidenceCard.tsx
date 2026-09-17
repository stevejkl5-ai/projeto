import { Evidence } from "../types";

export default function EvidenceCard({ evidence }: { evidence: Evidence }) {
  const isNewsAlert = ["noticia_investigacao_pessoa", "noticia_investigacao_empresa"].includes(evidence.evidence_type);
  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs uppercase tracking-wide ${isNewsAlert ? "text-amber-400" : "text-accent"}`}>
          {isNewsAlert ? "alerta de notícia recente" : evidence.evidence_type.replace(/_/g, " ")}
        </span>
        {!!evidence.is_mock && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30">
            MOCK DATA
          </span>
        )}
      </div>
      {isNewsAlert && (
        <p className="text-xs text-amber-300/90 mb-3">
          Sinal para revisão manual; não representa confirmação judicial ou administrativa.
        </p>
      )}
      <p className="text-sm text-text/90 mb-3">{evidence.description}</p>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Entidade: <span className="text-text/80">{evidence.entity}</span>
        </span>
        <span>{new Date(evidence.date).toLocaleDateString("pt-BR")}</span>
      </div>
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-muted">Fonte: {evidence.source_name}</span>
        {evidence.source_url && (
          <a
            href={evidence.source_url}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            Abrir fonte original
          </a>
        )}
      </div>
    </div>
  );
}
